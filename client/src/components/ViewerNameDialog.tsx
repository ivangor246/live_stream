import { useState, type FormEvent } from "react";

import { useI18n } from "../i18n/I18nProvider.js";
import { Button } from "./ui/Button.js";
import { Card } from "./ui/Card.js";

interface ViewerNameDialogProps {
  onJoin: (name: string) => void;
}

const maximumViewerNameLength = 80;

export function ViewerNameDialog({ onJoin }: ViewerNameDialogProps) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const normalizedName = name.trim();

    if (!normalizedName) {
      setError(t("validation.viewerNameRequired"));
      return;
    }

    if (normalizedName.length > maximumViewerNameLength) {
      setError(t("validation.viewerNameMax"));
      return;
    }

    onJoin(normalizedName);
  }

  return (
    <div className="viewer-name-dialog" role="presentation">
      <Card
        as="section"
        aria-labelledby="viewer-name-title"
        aria-modal="true"
        className="viewer-name-dialog__card"
        role="dialog"
      >
        <h2 id="viewer-name-title">{t("viewerName.title")}</h2>
        <p>{t("viewerName.description")}</p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="viewer-name">{t("viewerName.label")}</label>
          <input
            autoComplete="name"
            autoFocus
            id="viewer-name"
            maxLength={maximumViewerNameLength}
            name="viewerName"
            placeholder={t("viewerName.placeholder")}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError(null);
            }}
          />
          {error && <p role="alert">{error}</p>}
          <Button type="submit">{t("viewerName.join")}</Button>
        </form>
      </Card>
    </div>
  );
}
