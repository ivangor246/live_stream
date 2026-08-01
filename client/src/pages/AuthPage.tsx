import { type SubmitEvent, useState } from "react";

import { localizeError } from "../i18n/errorMessages.js";
import { useI18n, type TranslationKey } from "../i18n/I18nProvider.js";
import { useAuth } from "../auth/AuthProvider.js";
import { Button } from "../components/ui/Button.js";
import { Card } from "../components/ui/Card.js";

type AuthPageMode = "setup" | "login";

interface AuthPageProps {
  mode: AuthPageMode;
}

function validateCredentials(
  mode: AuthPageMode,
  username: string,
  password: string,
): TranslationKey | null {
  if (mode === "setup" && username.trim().length < 3) {
    return "validation.usernameMin";
  }

  if (mode === "setup" && password.length < 12) {
    return "validation.passwordMin";
  }

  if (mode === "login" && password.length === 0) {
    return "validation.passwordRequired";
  }

  return null;
}

export function AuthPage({ mode }: AuthPageProps) {
  const { t } = useI18n();
  const { login, setup } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSetup = mode === "setup";

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const validationError = validateCredentials(mode, username, password);
    if (validationError) {
      setError(t(validationError));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const credentials = { username: username.trim(), password };

      if (isSetup) {
        await setup(credentials);
      } else {
        await login(credentials);
      }
    } catch (requestError: unknown) {
      setError(
        localizeError(
          requestError,
          t,
          isSetup ? "errors.authSetup" : "errors.authLogin",
        ),
      );
      setIsSubmitting(false);
    }
  }

  return (
    <main className="page-shell auth-page">
      <Card as="section" className="auth-card">
        <p className="eyebrow">{t("app.name")}</p>
        <h1>{t(isSetup ? "auth.setupTitle" : "auth.loginTitle")}</h1>
        <p className="auth-card__description">
          {t(isSetup ? "auth.setupDescription" : "auth.loginDescription")}
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="auth-username">{t("auth.usernameLabel")}</label>
          <input
            id="auth-username"
            name="username"
            type="text"
            autoComplete="username"
            value={username}
            disabled={isSubmitting}
            maxLength={80}
            placeholder={t("auth.usernamePlaceholder")}
            onChange={(event) => {
              setUsername(event.target.value);
              setError(null);
            }}
          />

          <label htmlFor="auth-password">{t("auth.passwordLabel")}</label>
          <input
            id="auth-password"
            name="password"
            type="password"
            autoComplete={isSetup ? "new-password" : "current-password"}
            value={password}
            disabled={isSubmitting}
            maxLength={256}
            placeholder={t("auth.passwordPlaceholder")}
            onChange={(event) => {
              setPassword(event.target.value);
              setError(null);
            }}
          />

          {error && <p role="alert">{error}</p>}

          <Button type="submit" variant="primary" size="lg" disabled={isSubmitting}>
            {isSubmitting
              ? t(isSetup ? "auth.settingUp" : "auth.loggingIn")
              : t(isSetup ? "auth.setupSubmit" : "auth.loginSubmit")}
          </Button>
        </form>
      </Card>
    </main>
  );
}

export function AuthUnavailablePage() {
  const { t } = useI18n();
  const { error, refresh } = useAuth();

  return (
    <main className="page-shell page-message">
      <h1>{t("auth.unavailableTitle")}</h1>
      <p>{t("auth.unavailableDescription")}</p>
      <p role="alert">
        {localizeError(error, t, "errors.authUnavailable")}
      </p>
      <Button onClick={() => void refresh()}>{t("auth.retry")}</Button>
    </main>
  );
}
