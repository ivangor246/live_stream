import type { StreamStatus } from "../../../shared/stream.js";

interface StreamPlayerProps {
  status: StreamStatus;
}

const playerMessages: Record<StreamStatus, string> = {
  scheduled: "Трансляция ещё не началась",
  live: "Трансляция идёт в прямом эфире",
  finished: "Трансляция завершена",
};

export function StreamPlayer({
  status,
}: StreamPlayerProps) {
  return (
    <section aria-label="Видеоплеер">
      <div
        role="img"
        aria-label="Заглушка видеоплеера"
      >
        📺
      </div>

      <p>{playerMessages[status]}</p>
    </section>
  );
}
