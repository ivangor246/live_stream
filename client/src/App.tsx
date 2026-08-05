import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router";

import { useAuth } from "./auth/AuthProvider.js";
import { AppShell } from "./components/layout/AppShell.js";
import { useI18n } from "./i18n/I18nProvider.js";

const AuthPage = lazy(async () => {
  const { AuthPage: Page } = await import("./pages/AuthPage.js");
  return { default: Page };
});
const AuthUnavailablePage = lazy(async () => {
  const { AuthUnavailablePage: Page } = await import("./pages/AuthPage.js");
  return { default: Page };
});
const InvitePage = lazy(async () => {
  const { InvitePage: Page } = await import("./pages/InvitePage.js");
  return { default: Page };
});
const StatusPage = lazy(async () => {
  const { StatusPage: Page } = await import("./pages/StatusPage.js");
  return { default: Page };
});
const StreamPage = lazy(async () => {
  const { StreamPage: Page } = await import("./pages/StreamPage.js");
  return { default: Page };
});
const StreamsPage = lazy(async () => {
  const { StreamsPage: Page } = await import("./pages/StreamsPage.js");
  return { default: Page };
});
const ViewerStreamPage = lazy(async () => {
  const { ViewerStreamPage: Page } = await import("./pages/ViewerStreamPage.js");
  return { default: Page };
});

function AuthLoadingPage() {
  const { t } = useI18n();

  return (
    <main className="page-shell page-message">
      <p>{t("auth.loading")}</p>
    </main>
  );
}

function RouteLoadingPage() {
  const { t } = useI18n();

  return (
    <main className="page-shell page-message">
      <p>{t("auth.loading")}</p>
    </main>
  );
}

function AuthRouteContent() {
  const { state } = useAuth();

  if (state === "checking") {
    return <AuthLoadingPage />;
  }

  if (state === "error") {
    return <AuthUnavailablePage />;
  }

  if (state === "setup") {
    return <AuthPage mode="setup" />;
  }

  if (state === "unauthenticated") {
    return <AuthPage mode="login" />;
  }

  return <Navigate to="/" replace />;
}

export default function App() {
  return (
    <AppShell>
      <Suspense fallback={<RouteLoadingPage />}>
        <Routes>
          <Route path="/invite/:token" element={<InvitePage />} />
          <Route path="/watch/:token" element={<ViewerStreamPage />} />
          <Route path="/status" element={<StatusPage />} />
          <Route path="/auth" element={<AuthRouteContent />} />
          <Route path="/" element={<StreamsPage />} />
          <Route path="/streams/:streamId" element={<StreamPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}
