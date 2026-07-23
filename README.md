# Live Stream Monitor

Fullstack-приложение для создания и мониторинга live-трансляций. Frontend и backend написаны на TypeScript и используют общие типы для HTTP- и WebSocket-сообщений.

Передача видео не реализована: на странице трансляции отображается заглушка плеера.

## Текущее состояние

В приложении реализованы:

- создание трансляции со статусом `scheduled`;
- запуск трансляции с переходом `scheduled -> live`;
- завершение трансляции с переходом `live -> finished`;
- получение списка и отдельной трансляции через REST API;
- учёт подключённых зрителей через WebSocket;
- обновление счётчика зрителей при подключении и отключении;
- реакции `like`, `fire` и `clap`;
- рассылка изменений всем WebSocket-клиентам конкретной трансляции;
- блокировка новых зрителей и реакций после завершения трансляции;
- валидация HTTP- и WebSocket-данных;
- централизованные API-ошибки;
- graceful shutdown HTTP- и WebSocket-сервера;
- адаптивный frontend-интерфейс.

## Технологии

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

## Структура проекта

```text
client/
  src/
    api/          типизированный HTTP-клиент
    components/   UI-компоненты
    hooks/        WebSocket-хук
    pages/        страницы React Router
    types/        клиентские типы

server/
  src/
    controllers/  HTTP-контроллеры
    errors/       ошибки приложения
    middleware/   Express middleware
    repositories/ in-memory-хранилище
    routes/        REST-маршруты
    services/      бизнес-логика
    websocket/     WebSocket-сервер и обработка сообщений

shared/            общие TypeScript-контракты
```

Поток HTTP-запроса:

```text
route -> controller -> service -> repository
```

WebSocket-обработчик использует тот же экземпляр service, что и HTTP-контроллеры.

## Требования для запуска

- Node.js 22 или новее;
- npm.

## Установка

Зависимости frontend и backend устанавливаются отдельно.

```bash
cd server
npm install
```

```bash
cd client
npm install
```

## Запуск в режиме разработки

Запустите backend в первом терминале:

```bash
cd server
npm run dev
```

По умолчанию backend доступен по адресу `http://localhost:3000`.

Запустите frontend во втором терминале:

```bash
cd client
npm run dev
```

Frontend будет доступен по адресу `http://localhost:5173`.

Vite перенаправляет HTTP-запросы `/api` и WebSocket-соединения `/ws` на backend.

## Сборка frontend

```bash
cd client
npm run build
```

Результат сборки создаётся в `client/dist`.

Локальный просмотр сборки:

```bash
cd client
npm run preview
```

Backend запускается без watch-режима командой:

```bash
cd server
npm start
```

## Проверка кода

Frontend:

```bash
cd client
npm run build
npm run lint
```

Backend:

```bash
cd server
npm run typecheck
```

## HTTP API

| Метод | URL | Назначение |
| --- | --- | --- |
| `GET` | `/api/health` | Проверка доступности backend |
| `GET` | `/api/streams` | Получить список трансляций |
| `GET` | `/api/streams/:streamId` | Получить трансляцию |
| `POST` | `/api/streams` | Создать трансляцию |
| `POST` | `/api/streams/:streamId/start` | Запустить трансляцию |
| `POST` | `/api/streams/:streamId/finish` | Завершить трансляцию |

## WebSocket

Точка подключения:

```text
ws://localhost:3000/ws
```

Сообщения от клиента:

```text
viewer:join
reaction:send
```

Сообщения от сервера:

```text
stream:viewers-updated
stream:reaction-received
stream:status-updated
error
```

## Хранение данных

Трансляции и зрители хранятся в памяти backend-процесса. После его перезапуска данные очищаются.

## Ограничения текущей версии

- нет авторизации и разделения ролей;
- нет постоянного хранилища;
- нет передачи видео;
- WebSocket-клиент не переподключается автоматически;
- состояние WebSocket не синхронизируется между несколькими backend-процессами.
