import { Navigate, Route, Routes } from "react-router-dom";

import { useAuth } from "./auth/AuthProvider.js";
import { AppShell } from "./components/layout/AppShell.js";
import { useI18n } from "./i18n/I18nProvider.js";
import { AuthPage, AuthUnavailablePage } from "./pages/AuthPage.js";
import { InvitePage } from "./pages/InvitePage.js";
import { StreamPage } from "./pages/StreamPage.js";
import { StreamsPage } from "./pages/StreamsPage.js";
import { ViewerStreamPage } from "./pages/ViewerStreamPage.js";

function AuthLoadingPage() {
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

  return (
    <Routes>
      <Route path="/" element={<StreamsPage />} />
      <Route path="/streams/:streamId" element={<StreamPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/invite/:token" element={<InvitePage />} />
        <Route path="/watch/:token" element={<ViewerStreamPage />} />
        <Route path="*" element={<AuthRouteContent />} />
      </Routes>
    </AppShell>
  );
}
