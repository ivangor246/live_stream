import {
  useEffect,
  useRef,
  useState,
} from "react";

import type Hls from "hls.js";
import type { StreamPlayback } from "../shared/api.js";
import type { StreamStatus } from "../shared/stream.js";
import { useI18n, type TranslationKey } from "../i18n/I18nProvider.js";

interface StreamPlayerProps {
  status: StreamStatus;
  connection: StreamPlayback | null;
}

type PlayerMode =
  | "idle"
  | "connecting"
  | "webrtc"
  | "hls"
  | "error"
  | "unsupported";

const playerMessages: Record<StreamStatus, TranslationKey> = {
  scheduled: "stream.scheduledMessage",
  live: "stream.liveMessage",
  finished: "stream.finishedMessage",
};

function getWhepUrl(webrtcUrl: string): string {
  const [baseUrl = ""] = webrtcUrl.split("?", 2);
  const whepPath = `${baseUrl.replace(/\/+$/, "")}/whep`;

  return whepPath;
}

function getMediaUrlWithoutCredentials(mediaUrl: string): string {
  try {
    const url = new URL(mediaUrl, window.location.origin);

    for (const parameter of ["user", "pass", "token"]) {
      url.searchParams.delete(parameter);
    }

    return url.toString();
  } catch {
    return mediaUrl;
  }
}

function getAuthorizationHeader(mediaUrl: string): string | null {
  try {
    const url = new URL(mediaUrl, window.location.origin);
    const username = url.searchParams.get("user");
    const password = url.searchParams.get("pass");

    if (!username || !password) {
      return null;
    }

    return `Basic ${window.btoa(`${username}:${password}`)}`;
  } catch {
    return null;
  }
}

function waitForIceGathering(peerConnection: RTCPeerConnection): Promise<void> {
  if (peerConnection.iceGatheringState === "complete") {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const finish = (): void => {
      window.clearTimeout(timeoutId);
      peerConnection.removeEventListener(
        "icegatheringstatechange",
        handleStateChange,
      );
      resolve();
    };

    const handleStateChange = (): void => {
      if (peerConnection.iceGatheringState === "complete") {
        finish();
      }
    };

    const timeoutId = window.setTimeout(finish, 2_000);
    peerConnection.addEventListener(
      "icegatheringstatechange",
      handleStateChange,
    );
  });
}

async function connectWebRtc(
  video: HTMLVideoElement,
  webrtcUrl: string,
  signal: AbortSignal,
): Promise<RTCPeerConnection> {
  const peerConnection = new RTCPeerConnection();

  try {
    peerConnection.addTransceiver("video", { direction: "recvonly" });
    peerConnection.addTransceiver("audio", { direction: "recvonly" });
    peerConnection.addEventListener("track", (event) => {
      const [stream] = event.streams;

      if (stream) {
        video.srcObject = stream;
        void video.play().catch(() => undefined);
      }
    });

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    await waitForIceGathering(peerConnection);

    if (signal.aborted) {
      throw new DOMException("Playback request was cancelled", "AbortError");
    }

    const localDescription = peerConnection.localDescription;
    if (!localDescription?.sdp) {
      throw new Error("WebRTC offer was not created");
    }

    const authorization = getAuthorizationHeader(webrtcUrl);
    const response = await fetch(getWhepUrl(webrtcUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/sdp",
        ...(authorization ? { Authorization: authorization } : {}),
      },
      body: localDescription.sdp,
      signal,
    });

    if (!response.ok) {
      throw new Error(`WebRTC request failed with status ${response.status}`);
    }

    const answer = await response.text();
    await peerConnection.setRemoteDescription({
      type: "answer",
      sdp: answer,
    });

    return peerConnection;
  } catch (error: unknown) {
    peerConnection.close();
    throw error;
  }
}

export function StreamPlayer({
  status,
  connection,
}: StreamPlayerProps) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mode, setMode] = useState<PlayerMode>("idle");
  const webrtcUrl = connection?.webrtcUrl;
  const hlsUrl = connection?.hlsUrl;

  useEffect(() => {
    if (status !== "live" || !webrtcUrl) {
      return;
    }

    const streamWebrtcUrl = webrtcUrl;
    let cancelled = false;
    let peerConnection: RTCPeerConnection | null = null;
    const abortController = new AbortController();
    const video = videoRef.current;

    async function startWebRtc(): Promise<void> {
      if (!video || !("RTCPeerConnection" in window)) {
        setMode("hls");
        return;
      }

      try {
        peerConnection = await connectWebRtc(
          video,
          streamWebrtcUrl,
          abortController.signal,
        );

        if (cancelled) {
          peerConnection.close();
          return;
        }

        peerConnection.addEventListener("connectionstatechange", () => {
          if (!cancelled && peerConnection?.connectionState === "failed") {
            peerConnection.close();
            setMode("hls");
          }
        });
        setMode("webrtc");
      } catch {
        if (!cancelled) {
          setMode("hls");
        }
      }
    }

    void startWebRtc();

    return () => {
      cancelled = true;
      abortController.abort();
      peerConnection?.close();

      if (video) {
        video.srcObject = null;
      }
    };
  }, [status, webrtcUrl]);

  useEffect(() => {
    if (mode !== "hls" || status !== "live" || !hlsUrl) {
      return;
    }

    const video = videoRef.current;
    if (!video) {
      return;
    }

    const streamHlsUrl = hlsUrl;
    const hlsSourceUrl = getMediaUrlWithoutCredentials(streamHlsUrl);
    const playerVideo = video;
    let active = true;
    let hls: Hls | null = null;
    const authorization = getAuthorizationHeader(streamHlsUrl);

    playerVideo.srcObject = null;

    async function startHls(): Promise<void> {
      const hlsModule = await import("hls.js");

      if (!active) {
        return;
      }

      const HlsPlayer = hlsModule.default;
      hls = HlsPlayer.isSupported()
        ? new HlsPlayer({
            xhrSetup: (xhr) => {
              if (authorization) {
                xhr.setRequestHeader("Authorization", authorization);
              }
            },
          })
        : null;

      if (hls) {
        hls.on(HlsPlayer.Events.ERROR, (_event, data) => {
          if (active && data.fatal) {
            setMode("error");
          }
        });
        hls.on(HlsPlayer.Events.MEDIA_ATTACHED, () => {
          if (active) {
            hls?.loadSource(hlsSourceUrl);
          }
        });
        hls.attachMedia(playerVideo);
      } else if (playerVideo.canPlayType("application/vnd.apple.mpegurl")) {
        playerVideo.src = streamHlsUrl;
        void playerVideo.play().catch(() => undefined);
      } else {
        setMode("unsupported");
      }
    }

    void startHls();

    return () => {
      active = false;
      hls?.destroy();
      playerVideo.pause();
      playerVideo.removeAttribute("src");
      playerVideo.load();
    };
  }, [hlsUrl, mode, status]);

  const isLive = status === "live";
  const hasPlayback = isLive && connection;
  const visibleMode = mode === "idle" && hasPlayback ? "connecting" : mode;
  const playerStatus =
    visibleMode === "connecting" || visibleMode === "hls"
      ? t("stream.playerLoading")
      : visibleMode === "error"
        ? t("stream.playerError")
        : visibleMode === "unsupported"
          ? t("stream.playerUnsupported")
          : null;

  return (
    <section className="stream-player" aria-label={t("stream.playerLabel")}>
      <div className="stream-player__screen">
        {hasPlayback ? (
          <video
            ref={videoRef}
            className="stream-player__video"
            controls
            autoPlay
            muted
            playsInline
          />
        ) : (
          <span className="stream-player__placeholder" aria-hidden="true">
            📺
          </span>
        )}

        {playerStatus && (
          <p className="stream-player__status" role="status">
            {playerStatus}
          </p>
        )}
      </div>

      <p>
        {hasPlayback
          ? visibleMode === "hls"
            ? t("stream.playerHlsFallback")
            : t("stream.playerLiveMessage")
          : connection || !isLive
            ? t(playerMessages[status])
            : t("stream.playerConnectionUnavailable")}
      </p>
    </section>
  );
}
