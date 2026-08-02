import { useEffect, useState } from "react";

import { getUsers, updateUserActive } from "../api/authApi.js";
import { localizeError } from "../i18n/errorMessages.js";
import { useI18n, type TranslationKey } from "../i18n/I18nProvider.js";
import type { ManagedUser, UserRole } from "../shared/auth.js";
import { Button } from "./ui/Button.js";
import { Card } from "./ui/Card.js";
import { StatusBadge } from "./ui/StatusBadge.js";

const roleKeys: Record<UserRole, TranslationKey> = {
  admin: "accounts.role.admin",
  operator: "accounts.role.operator",
  viewer: "accounts.role.viewer",
};

interface AccountPanelProps {
  currentUserId: string;
}

export function AccountPanel({ currentUserId }: AccountPanelProps) {
  const { formatDate, t } = useI18n();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const abortController = new AbortController();
    let active = true;

    async function loadUsers(): Promise<void> {
      try {
        const loadedUsers = await getUsers(abortController.signal);

        if (active) {
          setUsers(loadedUsers);
        }
      } catch (requestError: unknown) {
        if (active) {
          setError(localizeError(requestError, t, "errors.loadAccounts"));
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadUsers();

    return () => {
      active = false;
      abortController.abort();
    };
  }, [t]);

  async function handleActiveChange(user: ManagedUser): Promise<void> {
    const nextIsActive = !user.isActive;
    if (!nextIsActive && !window.confirm(t("accounts.confirmDisable", { username: user.username }))) {
      return;
    }

    setUpdatingUserId(user.id);
    setError(null);

    try {
      const updatedUser = await updateUserActive(user.id, nextIsActive);
      setUsers((currentUsers) => currentUsers.map((currentUser) => (
        currentUser.id === updatedUser.id ? updatedUser : currentUser
      )));
    } catch (requestError: unknown) {
      setError(localizeError(requestError, t, "errors.updateAccount"));
    } finally {
      setUpdatingUserId((currentId) => currentId === user.id ? null : currentId);
    }
  }

  return (
    <Card as="section" className="account-panel">
      <header>
        <h2>{t("accounts.title")}</h2>
        <p>{t("accounts.description")}</p>
      </header>

      {error && <p role="alert">{error}</p>}

      {isLoading ? (
        <p>{t("accounts.loading")}</p>
      ) : users.length === 0 ? (
        <p>{t("accounts.none")}</p>
      ) : (
        <ul className="account-panel__list">
          {users.map((user) => {
            const isCurrentUser = user.id === currentUserId;
            const isUpdating = updatingUserId === user.id;

            return (
              <li key={user.id}>
                <div className="account-panel__details">
                  <strong>{user.username}</strong>
                  <small>
                    {t(roleKeys[user.role])} · {t("accounts.created", { date: formatDate(user.createdAt) })}
                  </small>
                  {isCurrentUser && <small>{t("accounts.current")}</small>}
                </div>
                <div className="account-panel__actions">
                  <StatusBadge
                    label={user.isActive ? t("accounts.active") : t("accounts.disabled")}
                    status={user.isActive ? "active" : "disabled"}
                  />
                  {!isCurrentUser && (
                    <Button
                      disabled={isUpdating}
                      size="sm"
                      variant={user.isActive ? "danger" : "secondary"}
                      onClick={() => void handleActiveChange(user)}
                    >
                      {user.isActive
                        ? isUpdating ? t("accounts.disabling") : t("accounts.disable")
                        : isUpdating ? t("accounts.enabling") : t("accounts.enable")}
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
