import type { SocketConnectionStatus } from "../types/websocket.js";

interface ConnectionStatusProps {
  status: SocketConnectionStatus;
}

const connectionStatusLabels: Record<
  SocketConnectionStatus,
  string
> = {
  connecting: "Подключение...",
  open: "Подключено",
  closed: "Соединение закрыто",
  error: "Ошибка соединения",
};

export function ConnectionStatus({
  status,
}: ConnectionStatusProps) {
  return (
    <p className={`connection-status connection-status--${status}`}>
      WebSocket:{" "}
      <strong>{connectionStatusLabels[status]}</strong>
    </p>
  );
}
