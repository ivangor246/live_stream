interface StreamStatisticsProps {
  viewerCount: number;
  reactionCount: number;
}

export function StreamStatistics({
  viewerCount,
  reactionCount,
}: StreamStatisticsProps) {
  return (
    <dl className="stream-statistics">
      <div>
        <dt>Зрители</dt>
        <dd>{viewerCount}</dd>
      </div>

      <div>
        <dt>Реакции</dt>
        <dd>{reactionCount}</dd>
      </div>
    </dl>
  );
}
