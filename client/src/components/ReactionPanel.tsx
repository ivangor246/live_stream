import type { ReactionType } from "../../../shared/websocket.js";

interface ReactionPanelProps {
  disabled: boolean;
  lastReaction: ReactionType | null;
  onReaction: (reaction: ReactionType) => void;
}

interface ReactionOption {
  type: ReactionType;
  label: string;
  symbol: string;
}

const reactionOptions: ReactionOption[] = [
  {
    type: "like",
    label: "Нравится",
    symbol: "👍",
  },
  {
    type: "fire",
    label: "Огонь",
    symbol: "🔥",
  },
  {
    type: "clap",
    label: "Аплодисменты",
    symbol: "👏",
  },
];

function getReactionLabel(
  reaction: ReactionType,
): string {
  return (
    reactionOptions.find(
      (option) => option.type === reaction,
    )?.label ?? reaction
  );
}

export function ReactionPanel({
  disabled,
  lastReaction,
  onReaction,
}: ReactionPanelProps) {
  return (
    <section className="reaction-panel" aria-labelledby="reactions-heading">
      <h2 id="reactions-heading">Реакции</h2>

      <div className="reaction-panel__actions">
        {reactionOptions.map((option) => (
          <button
            className="button button--reaction"
            key={option.type}
            type="button"
            disabled={disabled}
            aria-label={option.label}
            onClick={() => {
              onReaction(option.type);
            }}
          >
            <span aria-hidden="true">{option.symbol}</span>{" "}
            {option.label}
          </button>
        ))}
      </div>

      <p aria-live="polite">
        {lastReaction
          ? `Последняя реакция: ${getReactionLabel(lastReaction)}`
          : "Реакций пока нет"}
      </p>
    </section>
  );
}
