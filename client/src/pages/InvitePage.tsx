import { type SubmitEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";

import { acceptInvitation, getInvitation } from "../api/authApi.js";
import { useAuth } from "../auth/AuthProvider.js";
import { Button } from "../components/ui/Button.js";
import { ButtonLink } from "../components/ui/ButtonLink.js";
import { Card } from "../components/ui/Card.js";
import { localizeError } from "../i18n/errorMessages.js";
import { useI18n, type TranslationKey } from "../i18n/I18nProvider.js";
import type { AccountInvitation, InviteRole } from "../shared/auth.js";

const roleKeys: Record<InviteRole, TranslationKey> = {
  operator: "invitations.role.operator",
  viewer: "invitations.role.viewer",
};

function validateCredentials(
  username: string,
  password: string,
): TranslationKey | null {
  if (username.trim().length < 3) {
    return "validation.usernameMin";
  }

  if (password.length < 12) {
    return "validation.passwordMin";
  }

  return null;
}

export function InvitePage() {
  const { formatDate, t } = useI18n();
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();
  const [invitation, setInvitation] = useState<AccountInvitation | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isLoading = Boolean(token) && invitation === null && error === null;

  useEffect(() => {
    if (!token) {
      return;
    }

    const invitationToken = token;
    const abortController = new AbortController();
    let active = true;

    async function loadInvitation(): Promise<void> {
      try {
        const loadedInvitation = await getInvitation(
          invitationToken,
          abortController.signal,
        );

        if (active) {
          setInvitation(loadedInvitation);
        }
      } catch (requestError: unknown) {
        if (active) {
          setError(localizeError(requestError, t, "errors.acceptInvitation"));
        }
      }
    }

    void loadInvitation();

    return () => {
      active = false;
      abortController.abort();
    };
  }, [t, token]);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!token) {
      return;
    }

    const validationError = validateCredentials(username, password);
    if (validationError) {
      setError(t(validationError));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await acceptInvitation(token, {
        username: username.trim(),
        password,
      });
      await refresh();
      navigate("/", { replace: true });
    } catch (requestError: unknown) {
      setError(localizeError(requestError, t, "errors.acceptInvitation"));
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <main className="page-shell auth-page">
        <Card as="section" className="auth-card">
          <p>{t("invite.loading")}</p>
        </Card>
      </main>
    );
  }

  if (!invitation) {
    return (
      <main className="page-shell auth-page">
        <Card as="section" className="auth-card">
          <h1>{t("invite.invalidTitle")}</h1>
          <p>{error ?? t("invite.invalidDescription")}</p>
          <ButtonLink to="/">{t("navigation.home")}</ButtonLink>
        </Card>
      </main>
    );
  }

  return (
    <main className="page-shell auth-page">
      <Card as="section" className="auth-card">
        <p className="eyebrow">{t("app.name")}</p>
        <h1>{t("invite.acceptTitle")}</h1>
        <p className="auth-card__description">
          {t("invite.acceptDescription", {
            role: t(roleKeys[invitation.role]),
            date: formatDate(invitation.expiresAt),
          })}
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="invite-username">{t("auth.usernameLabel")}</label>
          <input
            id="invite-username"
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

          <label htmlFor="invite-password">{t("auth.passwordLabel")}</label>
          <input
            id="invite-password"
            name="password"
            type="password"
            autoComplete="new-password"
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
            {isSubmitting ? t("invite.accepting") : t("invite.acceptSubmit")}
          </Button>
        </form>
      </Card>
    </main>
  );
}
