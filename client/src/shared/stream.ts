export type StreamStatus = "scheduled" | "live" | "finished";

export interface Stream {
  id: string;
  title: string;
  isPrivate: boolean;
  status: StreamStatus;
  viewerCount: number;
  reactionCount: number;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface StreamViewerInvitation {
  id: string;
  streamId: string;
  createdAt: string;
  expiresAt: string;
}

export interface CreatedStreamViewerInvitation extends StreamViewerInvitation {
  token: string;
}
