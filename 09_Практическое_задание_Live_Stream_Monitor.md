---
title: Практическое задание — Live Stream Monitor
tags:
  - typescript
  - react
  - nodejs
  - websocket
  - fullstack
  - interview
  - practice
---

# Практическое задание: панель мониторинга live-трансляций

## Цель

Разработать небольшое fullstack-приложение для создания и мониторинга live-трансляций.

Пользователь должен иметь возможность:

1. Создать трансляцию.
2. Открыть страницу трансляции как зритель.
3. Подключиться к трансляции.
4. Увидеть количество подключённых зрителей в реальном времени.
5. Отправлять реакции во время трансляции.
6. Завершить трансляцию.

Настоящее видео передавать не требуется. Видеоплеер можно заменить заглушкой. Основная задача — реализовать архитектуру real-time-приложения на TypeScript, React и Node.js.

---

# Что отрабатывается

## TypeScript

- интерфейсы и типы;
- union types;
- literal types;
- generics;
- utility types;
- type guards;
- типизация HTTP-запросов;
- типизация WebSocket-сообщений;
- разделение общих типов между frontend и backend;
- обработка `unknown`;
- исключение необоснованного использования `any`.

## React

- функциональные компоненты;
- props;
- состояние;
- `useState`;
- `useEffect`;
- `useMemo`;
- `useCallback`;
- пользовательские хуки;
- формы;
- условный рендеринг;
- списки и `key`;
- загрузка данных;
- обработка ошибок;
- работа с WebSocket;
- очистка эффектов;
- разделение UI и бизнес-логики.

## Node.js

- создание HTTP API;
- Express;
- middleware;
- маршруты;
- контроллеры;
- сервисы;
- валидация данных;
- обработка ошибок;
- асинхронный код;
- WebSocket;
- хранение состояния;
- graceful shutdown;
- структура backend-приложения.

## Дополнительно

- REST;
- HTTP status codes;
- клиент-серверная архитектура;
- real-time-события;
- проектирование API;
- разделение ответственности;
- Git;
- базовое тестирование;
- архитектурное мышление.

---

# Описание продукта

Приложение состоит из двух основных страниц.

## Панель трансляций

На странице показывается список трансляций.

Для каждой трансляции отображаются:

- название;
- статус;
- количество зрителей;
- количество реакций;
- дата создания;
- кнопка перехода.

Также на этой странице находится форма создания трансляции.

## Страница трансляции

На странице отображаются:

- название трансляции;
- заглушка видеоплеера;
- текущий статус;
- количество зрителей;
- реакции;
- кнопки отправки реакций;
- кнопка завершения трансляции.

Количество зрителей и реакций должно обновляться без перезагрузки страницы.

---

# Функциональные требования

## 1. Создание трансляции

Пользователь вводит название трансляции и отправляет форму.

После создания трансляция получает статус `scheduled`.

Пример запроса:

```http
POST /api/streams
Content-Type: application/json
```

```json
{
  "title": "Frontend Weekly Live"
}
```

Пример ответа:

```json
{
  "id": "stream-123",
  "title": "Frontend Weekly Live",
  "status": "scheduled",
  "viewerCount": 0,
  "reactionCount": 0,
  "createdAt": "2026-07-22T10:00:00.000Z"
}
```

Название должно:

- быть строкой;
- содержать не менее 3 символов;
- содержать не более 100 символов.

При ошибке валидации сервер должен вернуть статус `400`.

---

## 2. Получение списка трансляций

```http
GET /api/streams
```

Ответ:

```json
[
  {
    "id": "stream-123",
    "title": "Frontend Weekly Live",
    "status": "live",
    "viewerCount": 12,
    "reactionCount": 45,
    "createdAt": "2026-07-22T10:00:00.000Z"
  }
]
```

---

## 3. Получение одной трансляции

```http
GET /api/streams/:streamId
```

Если трансляция не найдена:

```http
404 Not Found
```

```json
{
  "error": {
    "code": "STREAM_NOT_FOUND",
    "message": "Stream was not found"
  }
}
```

---

## 4. Запуск трансляции

```http
POST /api/streams/:streamId/start
```

Допустимый переход:

```text
scheduled → live
```

Если трансляция уже завершена, сервер должен вернуть `409 Conflict`.

---

## 5. Завершение трансляции

```http
POST /api/streams/:streamId/finish
```

Допустимый переход:

```text
live → finished
```

После завершения:

- новые зрители не могут подключиться;
- реакции больше не принимаются;
- статус обновляется у всех клиентов.

---

## 6. Подключение зрителя

При открытии страницы активной трансляции frontend устанавливает WebSocket-соединение.

После подключения frontend отправляет сообщение:

```json
{
  "type": "viewer:join",
  "payload": {
    "streamId": "stream-123",
    "viewerId": "viewer-456"
  }
}
```

После закрытия страницы или соединения зритель должен считаться отключённым.

Backend рассылает обновлённое количество зрителей:

```json
{
  "type": "stream:viewers-updated",
  "payload": {
    "streamId": "stream-123",
    "viewerCount": 13
  }
}
```

---

## 7. Реакции

Зритель может отправить одну из реакций:

```typescript
type ReactionType = "like" | "fire" | "clap";
```

Сообщение от клиента:

```json
{
  "type": "reaction:send",
  "payload": {
    "streamId": "stream-123",
    "viewerId": "viewer-456",
    "reaction": "fire"
  }
}
```

Сообщение от сервера:

```json
{
  "type": "stream:reaction-received",
  "payload": {
    "streamId": "stream-123",
    "reaction": "fire",
    "reactionCount": 46
  }
}
```

Backend обязан проверять:

- существует ли трансляция;
- имеет ли она статус `live`;
- является ли реакция допустимой;
- подключён ли зритель к трансляции.

---

# Модель данных

Для однодневной реализации разрешено хранить данные в памяти.

```typescript
type StreamStatus = "scheduled" | "live" | "finished";

interface Stream {
  id: string;
  title: string;
  status: StreamStatus;
  viewerCount: number;
  reactionCount: number;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}
```

Зрителей можно хранить в следующей структуре:

```typescript
const streamViewers = new Map<string, Set<string>>();
```

Где:

- ключ — `streamId`;
- значение — множество `viewerId`.

Использование `Set` предотвращает повторный подсчёт одного зрителя.

---

# Общие TypeScript-типы

Создайте отдельную директорию с типами, которые используются frontend и backend.

Пример структуры:

```text
shared/
  stream.ts
  websocket.ts
  api.ts
```

## Типы трансляции

```typescript
export type StreamStatus = "scheduled" | "live" | "finished";

export interface Stream {
  id: string;
  title: string;
  status: StreamStatus;
  viewerCount: number;
  reactionCount: number;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}
```

## WebSocket-сообщения

Используйте discriminated union.

```typescript
export type ReactionType = "like" | "fire" | "clap";

export type ClientWebSocketMessage =
  | {
      type: "viewer:join";
      payload: {
        streamId: string;
        viewerId: string;
      };
    }
  | {
      type: "reaction:send";
      payload: {
        streamId: string;
        viewerId: string;
        reaction: ReactionType;
      };
    };
```

```typescript
export type ServerWebSocketMessage =
  | {
      type: "stream:viewers-updated";
      payload: {
        streamId: string;
        viewerCount: number;
      };
    }
  | {
      type: "stream:reaction-received";
      payload: {
        streamId: string;
        reaction: ReactionType;
        reactionCount: number;
      };
    }
  | {
      type: "stream:status-updated";
      payload: {
        streamId: string;
        status: StreamStatus;
      };
    }
  | {
      type: "error";
      payload: {
        code: string;
        message: string;
      };
    };
```

Обработка сообщений должна использовать сужение типов:

```typescript
function handleServerMessage(message: ServerWebSocketMessage) {
  switch (message.type) {
    case "stream:viewers-updated":
      console.log(message.payload.viewerCount);
      break;

    case "stream:reaction-received":
      console.log(message.payload.reaction);
      break;

    case "stream:status-updated":
      console.log(message.payload.status);
      break;

    case "error":
      console.error(message.payload.message);
      break;
  }
}
```

---

# Рекомендуемый стек

## Frontend

- React;
- TypeScript;
- Vite;
- React Router;
- обычный CSS или CSS Modules.

## Backend

- Node.js;
- TypeScript;
- Express;
- библиотека `ws`;
- `zod` для валидации;
- `crypto.randomUUID()` для идентификаторов.

## Инструменты

- ESLint;
- Prettier;
- npm workspaces — опционально;
- Vitest или Jest — опционально.

---

# Предлагаемая структура проекта

```text
live-stream-monitor/
  client/
    src/
      api/
        streamsApi.ts
      components/
        CreateStreamForm.tsx
        StreamCard.tsx
        StreamPlayer.tsx
        ReactionPanel.tsx
        ConnectionStatus.tsx
      hooks/
        useStreamSocket.ts
      pages/
        StreamsPage.tsx
        StreamPage.tsx
      types/
      App.tsx
      main.tsx

  server/
    src/
      controllers/
        streamsController.ts
      services/
        streamsService.ts
      repositories/
        streamsRepository.ts
      routes/
        streamsRoutes.ts
      websocket/
        websocketServer.ts
        messageHandler.ts
      middleware/
        errorHandler.ts
      errors/
        AppError.ts
      app.ts
      server.ts

  shared/
    stream.ts
    websocket.ts
    api.ts
```

Для однодневной работы структуру можно упростить, но не следует помещать весь backend в один файл.

---

# Требования к backend

## Разделение ответственности

### Repository

Отвечает за хранение трансляций.

```typescript
interface StreamsRepository {
  findAll(): Stream[];
  findById(id: string): Stream | undefined;
  create(title: string): Stream;
  update(stream: Stream): Stream;
}
```

### Service

Содержит бизнес-логику:

- создание трансляции;
- запуск;
- завершение;
- добавление зрителя;
- удаление зрителя;
- добавление реакции;
- проверка допустимых переходов статуса.

### Controller

Работает с HTTP:

- получает параметры запроса;
- вызывает service;
- формирует HTTP-ответ.

Controller не должен самостоятельно изменять массив или `Map` трансляций.

---

## Обработка ошибок

Создайте собственный класс ошибки:

```typescript
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
```

Пример использования:

```typescript
throw new AppError(
  404,
  "STREAM_NOT_FOUND",
  "Stream was not found",
);
```

Добавьте централизованный middleware обработки ошибок.

---

## Обработка неизвестных WebSocket-сообщений

Данные после `JSON.parse` не должны автоматически считаться корректными.

Нежелательный вариант:

```typescript
const message = JSON.parse(data.toString()) as ClientWebSocketMessage;
```

Предпочтительный вариант:

```typescript
const parsedMessage: unknown = JSON.parse(data.toString());
```

После этого нужно:

- проверить структуру через `zod`;
- либо написать type guard;
- только затем передать сообщение обработчику.

---

# Требования к frontend

## Страница списка трансляций

Компоненты:

```text
StreamsPage
├── CreateStreamForm
└── StreamCard[]
```

Страница должна поддерживать состояния:

- загрузка;
- ошибка;
- пустой список;
- список трансляций.

---

## Форма создания трансляции

Форма должна:

- использовать controlled input;
- валидировать название;
- блокировать повторную отправку;
- показывать сообщение об ошибке;
- очищаться после успешного создания;
- добавлять новую трансляцию в список без перезагрузки.

Состояние формы:

```typescript
interface CreateStreamFormState {
  title: string;
  isSubmitting: boolean;
  error: string | null;
}
```

---

## Страница трансляции

Компоненты:

```text
StreamPage
├── StreamPlayer
├── ConnectionStatus
├── StreamStatistics
└── ReactionPanel
```

Страница должна:

1. Получить данные трансляции через HTTP.
2. Подключиться к WebSocket.
3. Отправить `viewer:join`.
4. Обрабатывать server events.
5. Закрыть соединение при размонтировании.
6. Показывать статус WebSocket-соединения.

---

## Пользовательский хук

WebSocket-логику вынесите в хук:

```typescript
interface UseStreamSocketResult {
  connectionStatus: "connecting" | "open" | "closed" | "error";
  viewerCount: number;
  reactionCount: number;
  lastReaction: ReactionType | null;
  sendReaction: (reaction: ReactionType) => void;
}
```

```typescript
function useStreamSocket(
  streamId: string,
  initialViewerCount: number,
  initialReactionCount: number,
): UseStreamSocketResult {
  // Реализация
}
```

Хук должен:

- создавать WebSocket;
- подписываться на события;
- разбирать входящие сообщения;
- обновлять состояние;
- закрывать WebSocket в cleanup-функции;
- не создавать новое соединение на каждом рендере.

---

# Обязательные сценарии

## Сценарий 1: создание и запуск

1. Пользователь создаёт трансляцию.
2. Трансляция появляется в списке.
3. Пользователь запускает трансляцию.
4. Статус меняется с `scheduled` на `live`.

## Сценарий 2: подключение зрителей

1. Откройте трансляцию в двух вкладках.
2. Обе вкладки устанавливают WebSocket-соединение.
3. В обеих вкладках показывается два зрителя.
4. После закрытия одной вкладки остаётся один зритель.

## Сценарий 3: реакция

1. Зритель отправляет реакцию.
2. Backend принимает событие.
3. Счётчик реакций увеличивается.
4. Обновление появляется во всех открытых вкладках.

## Сценарий 4: завершение трансляции

1. Пользователь завершает трансляцию.
2. Статус становится `finished`.
3. Все подключённые клиенты получают обновление.
4. Кнопки реакций становятся недоступными.
5. Новое подключение не увеличивает число зрителей.

## Сценарий 5: ошибка

1. Клиент запрашивает несуществующую трансляцию.
2. Backend возвращает `404`.
3. Frontend показывает понятное сообщение, а не падает.

---

# План реализации на один день

Расчёт сделан примерно на 7–8 часов.

## Этап 1. Подготовка проекта — 30 минут

1. Создать Git-репозиторий.
2. Создать директории `client`, `server`, `shared`.
3. Инициализировать Vite-проект с React и TypeScript.
4. Инициализировать Node.js-проект.
5. Установить зависимости.
6. Настроить команды запуска.

Минимальные команды:

```bash
npm create vite@latest client -- --template react-ts
```

```bash
mkdir server
cd server
npm init -y
npm install express ws cors zod
npm install -D typescript tsx @types/node @types/express @types/ws
```

Результат этапа:

- frontend запускается;
- backend запускается;
- frontend может выполнить тестовый запрос к backend.

---

## Этап 2. Общие TypeScript-типы — 30 минут

Создать:

```text
shared/stream.ts
shared/websocket.ts
shared/api.ts
```

Описать:

- `Stream`;
- `StreamStatus`;
- `ReactionType`;
- `ClientWebSocketMessage`;
- `ServerWebSocketMessage`;
- структуру API-ошибки.

Сразу запретить использование `any` в основном коде.

Результат этапа:

- frontend и backend используют одинаковые контракты;
- WebSocket-сообщения описаны через discriminated union.

---

## Этап 3. Backend REST API — 1 час 30 минут

Реализовать:

- `GET /api/streams`;
- `GET /api/streams/:id`;
- `POST /api/streams`;
- `POST /api/streams/:id/start`;
- `POST /api/streams/:id/finish`.

Порядок реализации:

1. In-memory repository.
2. Service с бизнес-логикой.
3. Controller.
4. Routes.
5. Валидация через `zod`.
6. Централизованная обработка ошибок.

Сначала проверить API через Postman, Insomnia или `curl`.

Пример:

```bash
curl -X POST http://localhost:3000/api/streams \
  -H "Content-Type: application/json" \
  -d '{"title":"Test stream"}'
```

Результат этапа:

- трансляции создаются;
- статусы изменяются;
- неправильные запросы возвращают корректные ошибки.

---

## Этап 4. WebSocket backend — 1 час

Реализовать:

1. Создание WebSocket-сервера.
2. Разбор входящих сообщений.
3. Подключение зрителя.
4. Отключение зрителя.
5. Отправку реакций.
6. Broadcast событий клиентам одной трансляции.

Для каждого WebSocket-соединения хранить информацию:

```typescript
interface ConnectionContext {
  viewerId: string | null;
  streamId: string | null;
}
```

При событии `close` удалять зрителя из соответствующего `Set`.

Необходимо избежать ситуации, когда один зритель учитывается несколько раз.

Результат этапа:

- зрители учитываются;
- реакции принимаются;
- изменения рассылаются всем клиентам.

---

## Этап 5. React: список и форма — 1 час

Реализовать:

- `StreamsPage`;
- `CreateStreamForm`;
- `StreamCard`;
- функции API;
- загрузку списка;
- обработку loading/error/empty;
- создание трансляции;
- запуск и завершение трансляции.

Не заниматься сложным дизайном. Достаточно читаемого интерфейса.

Результат этапа:

- через UI можно управлять жизненным циклом трансляции.

---

## Этап 6. React: страница трансляции — 1 час 30 минут

Реализовать:

- загрузку одной трансляции;
- заглушку видеоплеера;
- отображение статистики;
- `useStreamSocket`;
- подключение зрителя;
- реакции;
- статус соединения;
- cleanup WebSocket.

Особое внимание уделить зависимостям `useEffect`.

Проверить, что WebSocket не пересоздаётся при каждом обновлении состояния.

Результат этапа:

- несколько вкладок синхронно получают изменения;
- зрители корректно добавляются и удаляются.

---

## Этап 7. Проверка и исправления — 45 минут

Проверить:

- пустое название;
- слишком длинное название;
- неизвестный `streamId`;
- повторный запуск;
- завершение незапущенной трансляции;
- реакцию после завершения;
- закрытие вкладки;
- две вкладки одного зрителя;
- неправильное WebSocket-сообщение;
- остановленный backend;
- обновление страницы.

Проверить консоль браузера и терминал на наличие необработанных ошибок.

---

## Этап 8. README и финальный рефакторинг — 45 минут

README должен содержать:

- описание проекта;
- используемый стек;
- инструкции запуска;
- архитектуру;
- список реализованных функций;
- известные ограничения;
- возможные улучшения.

Также необходимо:

- удалить `console.log`, не нужные для работы;
- проверить названия;
- разбить большие функции;
- запустить линтер;
- сделать несколько осмысленных Git-коммитов.

---

# Приоритеты при нехватке времени

## Обязательно закончить

1. Общие TypeScript-типы.
2. REST API.
3. React-страницу трансляции.
4. WebSocket-подключение.
5. Подсчёт зрителей.
6. Отправку реакций.
7. Cleanup соединения.
8. Обработку основных ошибок.

## Можно упростить

- дизайн;
- анимации реакций;
- хранение данных;
- тесты;
- сложную маршрутизацию;
- авторизацию;
- контейнеризацию.

## Не следует добавлять в основную реализацию

- настоящее видео;
- WebRTC;
- загрузку файлов;
- OAuth;
- микросервисы;
- Docker Compose;
- Kubernetes;
- сложную базу данных;
- полноценный чат.

Эти функции увеличат объём задачи и помешают закончить её за один день.

---

# Критерии готовности

Задание считается выполненным, если:

- frontend и backend написаны на TypeScript;
- приложение запускается локально;
- можно создать трансляцию;
- можно запустить трансляцию;
- можно открыть трансляцию в нескольких вкладках;
- число зрителей обновляется в реальном времени;
- реакции обновляются в реальном времени;
- после закрытия вкладки зритель удаляется;
- трансляцию можно завершить;
- завершённая трансляция не принимает реакции;
- ошибки API отображаются пользователю;
- в основном коде нет необоснованного `any`;
- WebSocket закрывается при размонтировании компонента;
- код разделён минимум на компоненты, сервисы и маршруты;
- в репозитории есть README.

---

# Минимальные тесты

При наличии времени написать минимум три теста backend-сервиса.

## Тест 1

Создание трансляции:

```text
given корректное название
when вызывается createStream
then создаётся трансляция со статусом scheduled
```

## Тест 2

Недопустимый переход статуса:

```text
given завершённая трансляция
when вызывается startStream
then выбрасывается ошибка STREAM_ALREADY_FINISHED
```

## Тест 3

Повторное подключение зрителя:

```text
given зритель уже присутствует в Set
when он подключается повторно
then viewerCount не увеличивается
```

Тестировать HTTP-контроллеры необязательно. В первую очередь тестируется бизнес-логика service.

---

# Дополнительное задание для code review

После завершения выберите один из файлов, созданных с помощью ИИ-инструмента, и проведите собственное ревью.

Запишите в README:

1. Какую задачу выполнял ИИ.
2. Какой контекст вы ему дали.
3. Какие проблемы были в первоначальном решении.
4. Что вы проверили вручную.
5. Какие изменения внесли.
6. Почему итоговое решение корректнее.

Особенно проверить:

- обработку ошибок;
- утечки WebSocket-соединений;
- зависимости `useEffect`;
- доверие к данным клиента;
- небезопасные type assertions;
- повторный подсчёт зрителей;
- изменение объектов состояния;
- отсутствие проверки статуса трансляции.

---

# Вопросы для самопроверки

## TypeScript

1. Почему WebSocket-сообщения удобно описывать через discriminated union?
2. Чем `unknown` безопаснее `any`?
3. Зачем проверять результат `JSON.parse`?
4. В чём разница между `interface` и `type`?
5. Когда нужен type guard?
6. Почему типы не заменяют runtime-валидацию?
7. Как проверить, что `reaction` является `ReactionType`?
8. Какие типы можно вынести в общую директорию?

## React

1. Почему WebSocket нужно создавать внутри `useEffect`?
2. Зачем возвращать cleanup-функцию?
3. Что произойдёт при неправильном массиве зависимостей?
4. Когда нужен `useCallback`?
5. Почему нельзя напрямую изменять state?
6. Как избежать обновления размонтированного компонента?
7. Что относится к серверному состоянию?
8. Что произойдёт при включённом `StrictMode` в development?

## Node.js

1. Как Node.js обрабатывает большое количество соединений?
2. Что происходит при событии WebSocket `close`?
3. Зачем разделять controller, service и repository?
4. Где должна находиться бизнес-логика?
5. Как Express обрабатывает middleware?
6. Почему входящим данным нельзя доверять?
7. Чем WebSocket отличается от HTTP?
8. Как корректно завершить HTTP- и WebSocket-сервер?

## Архитектура

1. Что произойдёт с данными после перезапуска сервера?
2. Почему in-memory-хранилище не подойдёт для production?
3. Как хранить зрителей при нескольких экземплярах backend?
4. Где можно использовать Redis?
5. Как ограничить частоту реакций?
6. Как защититься от подключения одного пользователя из множества вкладок?
7. Как масштабировать WebSocket-сервер?
8. Какие метрики нужно собирать для live-платформы?

---

# Возможные вопросы на разборе решения

Будьте готовы объяснить:

- почему выбрана такая структура проекта;
- почему WebSocket используется только для real-time-событий;
- почему создание трансляции реализовано через HTTP;
- как определяется количество зрителей;
- как обрабатывается отключение клиента;
- как предотвращаются повторные подключения;
- как типизируются события;
- как валидируются данные;
- какие race conditions возможны;
- что изменилось бы при использовании PostgreSQL;
- зачем здесь Redis;
- как масштабировать решение;
- как реализовать настоящий видеостриминг;
- где в работе использовался ИИ;
- какую ошибку ИИ допустил и как она была обнаружена.

---

# Что можно добавить после основной реализации

Только после выполнения обязательной части:

1. Фильтр трансляций по статусу.
2. Сортировку по количеству зрителей.
3. График зрителей за последние несколько минут.
4. Rate limiting для реакций.
5. Переподключение WebSocket.
6. Heartbeat через `ping/pong`.
7. PostgreSQL.
8. Redis Pub/Sub.
9. Авторизацию ведущего.
10. Docker.

Лучшее дополнительное улучшение для этой вакансии — WebSocket heartbeat или Redis Pub/Sub, поскольку они напрямую связаны с устойчивостью real-time-приложений.
