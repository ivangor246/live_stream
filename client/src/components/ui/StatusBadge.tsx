import type { StreamStatus } from "../../shared/stream.js";

interface StatusBadgeProps {
  label: string;
  status: StreamStatus | "online" | "offline" | "unavailable";
}

export function StatusBadge({ label, status }: StatusBadgeProps) {
  return <span className={`status-badge status-badge--${status}`}>{label}</span>;
}
