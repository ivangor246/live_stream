import { useEffect, useState } from "react";

type BackendStatus = "checking" | "online" | "offline";

function App() {
  const [backendStatus, setBackendStatus] = useState<BackendStatus>("checking");

  useEffect(() => {
    const abortController = new AbortController();

    async function checkBackend(): Promise<void> {
      try {
        const response = await fetch("/api/health", {
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`);
        }

        setBackendStatus("online");
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setBackendStatus("offline");
      }
    }

    void checkBackend();

    return () => {
      abortController.abort();
    };
  }, []);

  return (
    <main>
      <h1>Live Stream Monitor</h1>

      {backendStatus === "checking" && <p>Проверяем backend...</p>}
      {backendStatus === "online" && <p>Backend доступен ✅</p>}
      {backendStatus === "offline" && <p>Backend недоступен ❌</p>}
    </main>
  );
}

export default App;
