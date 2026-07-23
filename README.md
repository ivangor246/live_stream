# Live Stream Monitor

Небольшое fullstack-приложение для создания и мониторинга live-трансляций. Видео заменено заглушкой: основная цель проекта — практика REST, WebSocket и общих TypeScript-контрактов.

## Возможности

- создание, запуск и завершение трансляций;
- просмотр списка и отдельной страницы трансляции;
- real-time-подсчёт подключённых зрителей;
- реакции `like`, `fire` и `clap` с рассылкой всем зрителям;
- синхронизация статуса через WebSocket;
- runtime-валидация HTTP- и WebSocket-данных;
- централизованные API-ошибки и graceful shutdown backend.

## Стек

### Frontend

- React 19;
- TypeScript;
- Vite;
- React Router;
- WebSocket API;
- CSS.

### Backend

- Node.js;
- TypeScript;
- Express;
- `ws`;
- Zod;
- in-memory-хранилище.

## Структура

```text
client/   React-приложение
server/   REST API и WebSocket-сервер
shared/   общие TypeScript-контракты
```

Backend разделён на слои:

```text
HTTP -> routes -> controllers -> service -> repository
WebSocket -> message handler -> service -> repository
```

## Запуск

Установите зависимости backend:

```bash
cd server
npm install
```

Запустите backend:

```bash
npm run dev
```

Во втором терминале установите зависимости frontend:

```bash
cd client
npm install
npm run dev
```

Откройте `http://localhost:5173`.

## Проверки

```bash
cd client
npm run build
npm run lint
```

```bash
cd server
npm run typecheck
```

## API

```text
GET  /api/health
GET  /api/streams
GET  /api/streams/:streamId
POST /api/streams
POST /api/streams/:streamId/start
POST /api/streams/:streamId/finish
WS   /ws
```

## Ограничения

- данные хранятся в памяти и исчезают после перезапуска backend;
- нет авторизации ведущего;
- нет настоящей передачи видео;
- WebSocket-клиент пока не выполняет автоматическое переподключение;
- хранение и broadcast не распределены между несколькими backend-процессами.

## Возможные улучшения

- heartbeat `ping/pong`;
- rate limiting для реакций;
- PostgreSQL для трансляций;
- Redis для зрителей и Pub/Sub;
- авторизация и разделение ролей.
