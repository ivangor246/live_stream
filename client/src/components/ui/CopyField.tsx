import { useState } from "react";

import { useI18n } from "../../i18n/I18nProvider.js";
import { Button } from "./Button.js";

interface CopyFieldProps {
  label: string;
  value: string;
}

export function CopyField({ label, value }: CopyFieldProps) {
  const { t } = useI18n();
  const [isCopied, setIsCopied] = useState(false);

  async function handleCopy(): Promise<void> {
    if (!navigator.clipboard) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setIsCopied(true);
    } catch {
      setIsCopied(false);
    }
  }

  return (
    <div className="copy-field">
      <span className="copy-field__label">{label}</span>
      <div className="copy-field__control">
        <code>{value}</code>
        <Button size="sm" variant="ghost" onClick={() => void handleCopy()}>
          {isCopied ? t("stream.copied") : t("stream.copy")}
        </Button>
      </div>
    </div>
  );
}
