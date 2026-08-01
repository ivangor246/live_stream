import { useEffect, useState } from "react";

import {
  createInvitation,
  deleteInvitation,
  getInvitations,
} from "../api/authApi.js";
import { localizeError } from "../i18n/errorMessages.js";
import { useI18n, type TranslationKey } from "../i18n/I18nProvider.js";
import type {
  AccountInvitation,
  CreatedAccountInvitation,
  InviteRole,
} from "../shared/auth.js";
import { Button } from "./ui/Button.js";
import { Card } from "./ui/Card.js";
import { CopyField } from "./ui/CopyField.js";

const roleKeys: Record<InviteRole, TranslationKey> = {
  operator: "invitations.role.operator",
  viewer: "invitations.role.viewer",
};

function getInvitationUrl(token: string): string {
  return new URL(`/invite/${token}`, window.location.origin).toString();
}

export function InvitationPanel() {
  const { formatDate, t } = useI18n();
  const [role, setRole] = useState<InviteRole>("viewer");
  const [invitations, setInvitations] = useState<AccountInvitation[]>([]);
  const [createdInvitation, setCreatedInvitation] =
    useState<CreatedAccountInvitation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const abortController = new AbortController();
    let active = true;

    async function loadInvitations(): Promise<void> {
      try {
        const loadedInvitations = await getInvitations(abortController.signal);

        if (active) {
          setInvitations(loadedInvitations);
        }
      } catch (requestError: unknown) {
        if (active) {
          setError(localizeError(requestError, t, "errors.loadInvitations"));
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadInvitations();

    return () => {
      active = false;
      abortController.abort();
    };
  }, [t]);

  async function handleCreate(): Promise<void> {
    setIsCreating(true);
    setError(null);

    try {
      const invitation = await createInvitation(role);

      setCreatedInvitation(invitation);
      setInvitations((currentInvitations) => [
        invitation,
        ...currentInvitations,
      ]);
    } catch (requestError: unknown) {
      setError(localizeError(requestError, t, "errors.createInvitation"));
    } finally {
      setIsCreating(false);
    }
  }

  async function handleRevoke(invitationId: string): Promise<void> {
    setRevokingId(invitationId);
    setError(null);

    try {
      await deleteInvitation(invitationId);
      setInvitations((currentInvitations) =>
        currentInvitations.filter((invitation) => invitation.id !== invitationId),
      );
      setCreatedInvitation((currentInvitation) =>
        currentInvitation?.id === invitationId ? null : currentInvitation,
      );
    } catch (requestError: unknown) {
      setError(localizeError(requestError, t, "errors.revokeInvitation"));
    } finally {
      setRevokingId((currentInvitationId) =>
        currentInvitationId === invitationId ? null : currentInvitationId,
      );
    }
  }

  return (
    <Card as="section" className="invitation-panel">
      <header>
        <h2>{t("invitations.title")}</h2>
        <p>{t("invitations.description")}</p>
      </header>

      <div className="invitation-panel__form">
        <label htmlFor="invitation-role">{t("invitations.roleLabel")}</label>
        <select
          id="invitation-role"
          value={role}
          disabled={isCreating}
          onChange={(event) => {
            const nextRole = event.target.value;
            if (nextRole === "operator" || nextRole === "viewer") {
              setRole(nextRole);
            }
          }}
        >
          <option value="viewer">{t("invitations.role.viewer")}</option>
          <option value="operator">{t("invitations.role.operator")}</option>
        </select>
        <Button disabled={isCreating} onClick={() => void handleCreate()}>
          {isCreating ? t("invitations.creating") : t("invitations.create")}
        </Button>
      </div>

      {createdInvitation && (
        <CopyField
          label={t("invitations.linkLabel")}
          value={getInvitationUrl(createdInvitation.token)}
        />
      )}

      {error && <p role="alert">{error}</p>}

      <section className="invitation-panel__list">
        <h3>{t("invitations.activeHeading")}</h3>
        {isLoading ? (
          <p>{t("invitations.loading")}</p>
        ) : invitations.length === 0 ? (
          <p>{t("invitations.none")}</p>
        ) : (
          <ul>
            {invitations.map((invitation) => (
              <li key={invitation.id}>
                <span>
                  <strong>{t(roleKeys[invitation.role])}</strong>
                  <small>
                    {t("invitations.expires", {
                      date: formatDate(invitation.expiresAt),
                    })}
                  </small>
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={revokingId === invitation.id}
                  onClick={() => void handleRevoke(invitation.id)}
                >
                  {revokingId === invitation.id
                    ? t("invitations.revoking")
                    : t("invitations.revoke")}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Card>
  );
}
