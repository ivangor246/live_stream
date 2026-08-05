import type { StreamStatus } from "./stream.js";

export type ReactionType = "like" | "fire" | "clap";

export type ClientWebSocketMessage =
  | {
      type: "viewer:join";
      payload: {
        streamId: string;
        viewerId: string;
        viewerName: string;
      };
    }
  | {
      type: "reaction:send";
      payload: {
        streamId: string;
        viewerId: string;
        reaction: ReactionType;
      };
    };

export type ServerWebSocketMessage =
  | {
      type: "stream:viewers-updated";
      payload: {
        streamId: string;
        viewerCount: number;
      };
    }
  | {
      type: "stream:reaction-received";
      payload: {
        streamId: string;
        reaction: ReactionType;
        reactionCount: number;
      };
    }
  | {
      type: "stream:status-updated";
      payload: {
        streamId: string;
        status: StreamStatus;
      };
    }
  | {
      type: "error";
      payload: {
        code: string;
        message: string;
      };
    };
