import type { Stream } from "./stream.js";

export type CreateStreamRequest = Pick<Stream, "title">;

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}
