import type { ReactionType } from "../shared/websocket.js";
import { useI18n, type TranslationKey } from "../i18n/I18nProvider.js";
import { Button } from "./ui/Button.js";

interface ReactionPanelProps {
  disabled: boolean;
  lastReaction: ReactionType | null;
  onReaction: (reaction: ReactionType) => void;
}

interface ReactionOption {
  type: ReactionType;
  labelKey: TranslationKey;
  symbol: string;
}

const reactionOptions: ReactionOption[] = [
  {
    type: "like",
    labelKey: "reaction.like",
    symbol: "👍",
  },
  {
    type: "fire",
    labelKey: "reaction.fire",
    symbol: "🔥",
  },
  {
    type: "clap",
    labelKey: "reaction.clap",
    symbol: "👏",
  },
];

export function ReactionPanel({
  disabled,
  lastReaction,
  onReaction,
}: ReactionPanelProps) {
  const { t } = useI18n();

  return (
    <section className="reaction-panel" aria-labelledby="reactions-heading">
      <h2 id="reactions-heading">{t("stream.reactionsHeading")}</h2>

      <div className="reaction-panel__actions">
        {reactionOptions.map((option) => (
          <Button
            variant="reaction"
            key={option.type}
            disabled={disabled}
            aria-label={t(option.labelKey)}
            onClick={() => {
              onReaction(option.type);
            }}
          >
            <span aria-hidden="true">{option.symbol}</span>{" "}
            {t(option.labelKey)}
          </Button>
        ))}
      </div>

      <p aria-live="polite">
        {lastReaction
          ? t(
              "stream.lastReaction",
              {
                reaction: t(
                  reactionOptions.find((option) => option.type === lastReaction)
                    ?.labelKey ?? "reaction.like",
                ),
              },
            )
          : t("stream.noReactions")}
      </p>
    </section>
  );
}
