import { useEffect, useState } from "react";

import {
  createStreamViewerInvitation,
  deleteStreamViewerInvitation,
  getStreamViewerInvitations,
} from "../api/streamsApi.js";
import { localizeError } from "../i18n/errorMessages.js";
import { useI18n } from "../i18n/I18nProvider.js";
import type {
  CreatedStreamViewerInvitation,
  StreamViewerInvitation,
} from "../shared/stream.js";
import { Button } from "./ui/Button.js";
import { Card } from "./ui/Card.js";
import { CopyField } from "./ui/CopyField.js";

interface ViewerAccessPanelProps {
  streamId: string;
}

function getViewerLink(token: string): string {
  return new URL(`/watch/${token}`, window.location.origin).toString();
}

export function ViewerAccessPanel({ streamId }: ViewerAccessPanelProps) {
  const { formatDate, t } = useI18n();
  const [invitations, setInvitations] = useState<StreamViewerInvitation[]>([]);
  const [createdInvitation, setCreatedInvitation] =
    useState<CreatedStreamViewerInvitation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const abortController = new AbortController();
    let active = true;

    async function loadInvitations(): Promise<void> {
      try {
        const loadedInvitations = await getStreamViewerInvitations(
          streamId,
          abortController.signal,
        );

        if (active) {
          setInvitations(loadedInvitations);
        }
      } catch (requestError: unknown) {
        if (active) {
          setError(localizeError(requestError, t, "errors.loadViewerInvitations"));
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
  }, [streamId, t]);

  async function handleCreate(): Promise<void> {
    setIsCreating(true);
    setError(null);

    try {
      const invitation = await createStreamViewerInvitation(streamId);
      setCreatedInvitation(invitation);
      setInvitations((currentInvitations) => [
        invitation,
        ...currentInvitations,
      ]);
    } catch (requestError: unknown) {
      setError(localizeError(requestError, t, "errors.createViewerInvitation"));
    } finally {
      setIsCreating(false);
    }
  }

  async function handleRevoke(invitationId: string): Promise<void> {
    setRevokingId(invitationId);
    setError(null);

    try {
      await deleteStreamViewerInvitation(streamId, invitationId);
      setInvitations((currentInvitations) =>
        currentInvitations.filter((invitation) => invitation.id !== invitationId),
      );
      setCreatedInvitation((currentInvitation) =>
        currentInvitation?.id === invitationId ? null : currentInvitation,
      );
    } catch (requestError: unknown) {
      setError(localizeError(requestError, t, "errors.revokeViewerInvitation"));
    } finally {
      setRevokingId((currentInvitationId) =>
        currentInvitationId === invitationId ? null : currentInvitationId,
      );
    }
  }

  return (
    <Card as="section" className="viewer-access-panel">
      <header>
        <h2>{t("viewerAccess.title")}</h2>
        <p>{t("viewerAccess.description")}</p>
      </header>

      <Button disabled={isCreating} onClick={() => void handleCreate()}>
        {isCreating ? t("viewerAccess.creating") : t("viewerAccess.create")}
      </Button>

      {createdInvitation && (
        <CopyField
          label={t("viewerAccess.linkLabel")}
          value={getViewerLink(createdInvitation.token)}
        />
      )}

      {error && <p role="alert">{error}</p>}

      <section className="viewer-access-panel__list">
        <h3>{t("viewerAccess.activeHeading")}</h3>
        {isLoading ? (
          <p>{t("viewerAccess.loading")}</p>
        ) : invitations.length === 0 ? (
          <p>{t("viewerAccess.none")}</p>
        ) : (
          <ul>
            {invitations.map((invitation) => (
              <li key={invitation.id}>
                <span>
                  <strong>{t("viewerAccess.link")}</strong>
                  <small>
                    {t("viewerAccess.expires", {
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
                    ? t("viewerAccess.revoking")
                    : t("viewerAccess.revoke")}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Card>
  );
}
