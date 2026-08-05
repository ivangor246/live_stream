import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import ThumbDownAltIcon from "@mui/icons-material/ThumbDownAlt";
import ThumbUpAltIcon from "@mui/icons-material/ThumbUpAlt";
import VolunteerActivismIcon from "@mui/icons-material/VolunteerActivism";
import type { ElementType } from "react";

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
  Icon: ElementType;
}

const reactionOptions: ReactionOption[] = [
  {
    type: "like",
    labelKey: "reaction.like",
    Icon: ThumbUpAltIcon,
  },
  {
    type: "dislike",
    labelKey: "reaction.dislike",
    Icon: ThumbDownAltIcon,
  },
  {
    type: "fire",
    labelKey: "reaction.fire",
    Icon: LocalFireDepartmentIcon,
  },
  {
    type: "clap",
    labelKey: "reaction.clap",
    Icon: VolunteerActivismIcon,
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
          <ReactionButton
            key={option.type}
            disabled={disabled}
            option={option}
            onClick={onReaction}
          />
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

interface ReactionButtonProps {
  disabled: boolean;
  option: ReactionOption;
  onClick: (reaction: ReactionType) => void;
}

function ReactionButton({ disabled, option, onClick }: ReactionButtonProps) {
  const { t } = useI18n();
  const { Icon } = option;

  return (
    <Button
      aria-label={t(option.labelKey)}
      disabled={disabled}
      variant="reaction"
      onClick={() => {
        onClick(option.type);
      }}
    >
      <Icon aria-hidden="true" fontSize="small" />
      {t(option.labelKey)}
    </Button>
  );
}
