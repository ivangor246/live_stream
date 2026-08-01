export type StreamStatus = "scheduled" | "live" | "finished";

export interface Stream {
  id: string;
  title: string;
  status: StreamStatus;
  viewerCount: number;
  reactionCount: number;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}
