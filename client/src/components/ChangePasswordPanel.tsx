import { useState, type FormEvent } from "react";

import { changePassword } from "../api/authApi.js";
import { localizeError } from "../i18n/errorMessages.js";
import { useI18n } from "../i18n/I18nProvider.js";
import { Button } from "./ui/Button.js";
import { Card } from "./ui/Card.js";

export function ChangePasswordPanel() {
  const { t } = useI18n();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setIsComplete(false);

    if (newPassword !== confirmation) {
      setError(t("password.mismatch"));
      return;
    }

    setIsSubmitting(true);

    try {
      await changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmation("");
      setIsComplete(true);
    } catch (requestError: unknown) {
      setError(localizeError(requestError, t, "errors.changePassword"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card as="section" className="password-change-panel">
      <header>
        <h2>{t("password.title")}</h2>
        <p>{t("password.description")}</p>
      </header>

      <form onSubmit={(event) => void handleSubmit(event)}>
        <label>
          <span>{t("password.currentLabel")}</span>
          <input
            autoComplete="current-password"
            disabled={isSubmitting}
            required
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
        </label>
        <label>
          <span>{t("password.newLabel")}</span>
          <input
            autoComplete="new-password"
            disabled={isSubmitting}
            minLength={12}
            required
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
        </label>
        <label>
          <span>{t("password.confirmationLabel")}</span>
          <input
            autoComplete="new-password"
            disabled={isSubmitting}
            minLength={12}
            required
            type="password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
          />
        </label>
        <Button disabled={isSubmitting} type="submit">
          {isSubmitting ? t("password.changing") : t("password.submit")}
        </Button>
      </form>

      {error && <p role="alert">{error}</p>}
      {isComplete && <p className="password-change-panel__success">{t("password.success")}</p>}
    </Card>
  );
}
