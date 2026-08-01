/* eslint-disable react-refresh/only-export-components */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const localeStorageKey = "live-stream-locale";

const englishMessages = {
  "app.name": "Live Stream Monitor",
  "app.eyebrow": "Real-time dashboard",
  "app.description": "Create streams and follow the broadcast.",
  "app.documentTitle": "Live Stream Monitor",
  "navigation.home": "Stream list",
  "navigation.back": "Back to streams",
  "controls.language": "Language",
  "controls.theme": "Theme",
  "controls.lightTheme": "Light",
  "controls.darkTheme": "Dark",
  "controls.switchTheme": "Switch theme",
  "system.statusLabel": "System",
  "system.checking": "Checking services...",
  "system.ready": "Services ready",
  "system.unavailable": "Database unavailable",
  "streams.createTitle": "Create a stream",
  "streams.titleLabel": "Title",
  "streams.titlePlaceholder": "Enter a stream title",
  "streams.create": "Create",
  "streams.creating": "Creating...",
  "streams.heading": "Streams",
  "streams.count": "Showing {{visible}} of {{total}}",
  "streams.loading": "Loading streams...",
  "streams.empty": "There are no streams yet.",
  "streams.emptyHint": "Create your first stream above to get started.",
  "streams.noMatches": "No streams match the selected filters.",
  "streams.filterLabel": "Filter",
  "streams.sortLabel": "Sort",
  "streams.filterAll": "All statuses",
  "streams.sortNewest": "Newest first",
  "streams.sortOldest": "Oldest first",
  "streams.sortTitle": "Title A–Z",
  "streams.filterSummary": "Status: {{filter}}",
  "streams.resetFilters": "Reset filters",
  "streams.loadError": "Could not load streams: {{message}}",
  "streams.actionError": "Could not update the stream: {{message}}",
  "streams.open": "Open",
  "streams.start": "Start",
  "streams.starting": "Starting...",
  "streams.finish": "Finish",
  "streams.finishing": "Finishing...",
  "streams.confirmFinish": "Finish this stream? This action cannot be undone.",
  "streams.viewers": "Viewers",
  "streams.reactions": "Reactions",
  "streams.createdAt": "Created",
  "status.scheduled": "Scheduled",
  "status.live": "Live",
  "status.finished": "Finished",
  "stream.invalidAddressTitle": "Invalid stream address",
  "stream.loading": "Loading stream...",
  "stream.loadErrorTitle": "Could not open the stream",
  "stream.notFound": "Stream was not found",
  "stream.finishError": "Could not finish the stream: {{message}}",
  "stream.status": "Status",
  "stream.playerLabel": "Video player",
  "stream.playerPlaceholder": "Video player placeholder",
  "stream.playerLoading": "Connecting to the live stream...",
  "stream.playerError": "The stream could not be played.",
  "stream.playerUnsupported": "This browser does not support WebRTC or HLS playback.",
  "stream.playerHlsFallback": "WebRTC is unavailable. HLS fallback is active.",
  "stream.playerLiveMessage": "Live playback",
  "stream.playerConnectionUnavailable": "Playback will be available when connection details are ready.",
  "stream.connectionTitle": "Connect a source",
  "stream.connectionDescription": "Use these values in OBS or another RTMP/WebRTC client.",
  "stream.rtmpUrl": "RTMP server",
  "stream.streamKey": "Stream key",
  "stream.hlsUrl": "HLS playback URL",
  "stream.webrtcUrl": "WebRTC playback URL",
  "stream.openHls": "Open HLS",
  "stream.openWebrtc": "Open WebRTC",
  "stream.copy": "Copy",
  "stream.copied": "Copied",
  "stream.connectionError": "Could not load connection details: {{message}}",
  "stream.scheduledMessage": "The stream has not started yet",
  "stream.liveMessage": "The stream is live",
  "stream.finishedMessage": "The stream has ended",
  "stream.reactionsHeading": "Reactions",
  "stream.lastReaction": "Last reaction: {{reaction}}",
  "stream.noReactions": "No reactions yet",
  "stream.connectionLabel": "WebSocket",
  "stream.socketError": "WebSocket error: {{message}}",
  "stream.actionError": "Could not finish the stream: {{message}}",
  "reaction.like": "Like",
  "reaction.fire": "Fire",
  "reaction.clap": "Clap",
  "connection.connecting": "Connecting...",
  "connection.open": "Connected",
  "connection.closed": "Connection closed",
  "connection.error": "Connection error",
  "validation.titleMin": "The title must contain at least 3 characters.",
  "validation.titleMax": "The title must contain at most 100 characters.",
  "errors.default": "Something went wrong.",
  "errors.network": "The request could not be completed.",
  "errors.invalidResponse": "The server returned an invalid response.",
  "errors.loadStreams": "The stream list could not be loaded.",
  "errors.loadStream": "The stream could not be loaded.",
  "errors.loadConnection": "Connection details could not be loaded.",
  "errors.createStream": "The stream could not be created.",
  "errors.updateStream": "The stream could not be updated.",
  "errors.STREAM_NOT_FOUND": "The stream was not found.",
  "errors.STREAM_ALREADY_LIVE": "The stream is already live.",
  "errors.STREAM_ALREADY_FINISHED": "The stream has already finished.",
  "errors.STREAM_NOT_LIVE": "This action is available only for a live stream.",
  "errors.VIEWER_NOT_CONNECTED": "Connect to the stream before sending a reaction.",
  "errors.CONNECTION_ALREADY_JOINED": "This connection has already joined another stream.",
  "errors.CONNECTION_CONTEXT_MISMATCH": "The viewer connection does not match the reaction.",
  "errors.INVALID_JSON": "The message must contain valid JSON.",
  "errors.INVALID_MESSAGE": "The message has an invalid structure.",
  "errors.INTERNAL_SERVER_ERROR": "The server encountered an unexpected error.",
  "errors.WEBSOCKET_NOT_OPEN": "The WebSocket connection is not open.",
  "errors.WEBSOCKET_NOT_LIVE": "A finished stream does not accept reactions.",
  "errors.INVALID_WEBSOCKET_JSON": "The server sent invalid JSON.",
  "errors.INVALID_WEBSOCKET_MESSAGE": "The server sent an invalid WebSocket message.",
} as const;

type TranslationKey = keyof typeof englishMessages;
type Locale = "en" | "ru";
type TranslationValues = Record<string, string | number>;
type Translator = (key: TranslationKey, values?: TranslationValues) => string;

const russianMessages: Record<TranslationKey, string> = {
  "app.name": "Монитор live-трансляций",
  "app.eyebrow": "Панель в реальном времени",
  "app.description": "Создавайте трансляции и следите за эфиром.",
  "app.documentTitle": "Монитор live-трансляций",
  "navigation.home": "Список трансляций",
  "navigation.back": "Назад к трансляциям",
  "controls.language": "Язык",
  "controls.theme": "Тема",
  "controls.lightTheme": "Светлая",
  "controls.darkTheme": "Тёмная",
  "controls.switchTheme": "Переключить тему",
  "system.statusLabel": "Система",
  "system.checking": "Проверка сервисов...",
  "system.ready": "Сервисы готовы",
  "system.unavailable": "База данных недоступна",
  "streams.createTitle": "Создать трансляцию",
  "streams.titleLabel": "Название",
  "streams.titlePlaceholder": "Введите название трансляции",
  "streams.create": "Создать",
  "streams.creating": "Создание...",
  "streams.heading": "Трансляции",
  "streams.count": "Показано: {{visible}} из {{total}}",
  "streams.loading": "Загрузка трансляций...",
  "streams.empty": "Трансляций пока нет.",
  "streams.emptyHint": "Создайте первую трансляцию выше, чтобы начать.",
  "streams.noMatches": "По выбранным фильтрам трансляций нет.",
  "streams.filterLabel": "Фильтр",
  "streams.sortLabel": "Сортировка",
  "streams.filterAll": "Все статусы",
  "streams.sortNewest": "Сначала новые",
  "streams.sortOldest": "Сначала старые",
  "streams.sortTitle": "Название А–Я",
  "streams.filterSummary": "Статус: {{filter}}",
  "streams.resetFilters": "Сбросить фильтры",
  "streams.loadError": "Не удалось загрузить трансляции: {{message}}",
  "streams.actionError": "Не удалось изменить трансляцию: {{message}}",
  "streams.open": "Открыть",
  "streams.start": "Запустить",
  "streams.starting": "Запуск...",
  "streams.finish": "Завершить",
  "streams.finishing": "Завершение...",
  "streams.confirmFinish": "Завершить эту трансляцию? Действие нельзя отменить.",
  "streams.viewers": "Зрители",
  "streams.reactions": "Реакции",
  "streams.createdAt": "Создана",
  "status.scheduled": "Запланирована",
  "status.live": "В эфире",
  "status.finished": "Завершена",
  "stream.invalidAddressTitle": "Неверный адрес трансляции",
  "stream.loading": "Загрузка трансляции...",
  "stream.loadErrorTitle": "Не удалось открыть трансляцию",
  "stream.notFound": "Трансляция не найдена",
  "stream.finishError": "Не удалось завершить трансляцию: {{message}}",
  "stream.status": "Статус",
  "stream.playerLabel": "Видеоплеер",
  "stream.playerPlaceholder": "Заглушка видеоплеера",
  "stream.playerLoading": "Подключение к прямой трансляции...",
  "stream.playerError": "Не удалось воспроизвести трансляцию.",
  "stream.playerUnsupported": "Этот браузер не поддерживает воспроизведение WebRTC или HLS.",
  "stream.playerHlsFallback": "WebRTC недоступен. Используется запасной вариант HLS.",
  "stream.playerLiveMessage": "Прямой эфир",
  "stream.playerConnectionUnavailable": "Воспроизведение станет доступно после загрузки данных подключения.",
  "stream.connectionTitle": "Подключить источник",
  "stream.connectionDescription": "Используйте эти значения в OBS или другом RTMP/WebRTC-клиенте.",
  "stream.rtmpUrl": "RTMP-сервер",
  "stream.streamKey": "Ключ трансляции",
  "stream.hlsUrl": "URL HLS-просмотра",
  "stream.webrtcUrl": "URL WebRTC-просмотра",
  "stream.openHls": "Открыть HLS",
  "stream.openWebrtc": "Открыть WebRTC",
  "stream.copy": "Копировать",
  "stream.copied": "Скопировано",
  "stream.connectionError": "Не удалось загрузить данные подключения: {{message}}",
  "stream.scheduledMessage": "Трансляция ещё не началась",
  "stream.liveMessage": "Трансляция идёт в прямом эфире",
  "stream.finishedMessage": "Трансляция завершена",
  "stream.reactionsHeading": "Реакции",
  "stream.lastReaction": "Последняя реакция: {{reaction}}",
  "stream.noReactions": "Реакций пока нет",
  "stream.connectionLabel": "WebSocket",
  "stream.socketError": "Ошибка WebSocket: {{message}}",
  "stream.actionError": "Не удалось завершить трансляцию: {{message}}",
  "reaction.like": "Нравится",
  "reaction.fire": "Огонь",
  "reaction.clap": "Аплодисменты",
  "connection.connecting": "Подключение...",
  "connection.open": "Подключено",
  "connection.closed": "Соединение закрыто",
  "connection.error": "Ошибка соединения",
  "validation.titleMin": "Название должно содержать минимум 3 символа.",
  "validation.titleMax": "Название должно содержать максимум 100 символов.",
  "errors.default": "Произошла неизвестная ошибка.",
  "errors.network": "Не удалось выполнить запрос.",
  "errors.invalidResponse": "Сервер вернул некорректный ответ.",
  "errors.loadStreams": "Не удалось загрузить список трансляций.",
  "errors.loadStream": "Не удалось загрузить трансляцию.",
  "errors.loadConnection": "Не удалось загрузить данные подключения.",
  "errors.createStream": "Не удалось создать трансляцию.",
  "errors.updateStream": "Не удалось изменить трансляцию.",
  "errors.STREAM_NOT_FOUND": "Трансляция не найдена.",
  "errors.STREAM_ALREADY_LIVE": "Трансляция уже идёт.",
  "errors.STREAM_ALREADY_FINISHED": "Трансляция уже завершена.",
  "errors.STREAM_NOT_LIVE": "Действие доступно только для трансляции в эфире.",
  "errors.VIEWER_NOT_CONNECTED": "Подключитесь к трансляции перед отправкой реакции.",
  "errors.CONNECTION_ALREADY_JOINED": "Это соединение уже подключено к другой трансляции.",
  "errors.CONNECTION_CONTEXT_MISMATCH": "Подключение зрителя не соответствует реакции.",
  "errors.INVALID_JSON": "Сообщение должно содержать корректный JSON.",
  "errors.INVALID_MESSAGE": "Сообщение имеет некорректную структуру.",
  "errors.INTERNAL_SERVER_ERROR": "На сервере произошла неизвестная ошибка.",
  "errors.WEBSOCKET_NOT_OPEN": "WebSocket-соединение не открыто.",
  "errors.WEBSOCKET_NOT_LIVE": "Завершённая трансляция не принимает реакции.",
  "errors.INVALID_WEBSOCKET_JSON": "Сервер отправил некорректный JSON.",
  "errors.INVALID_WEBSOCKET_MESSAGE": "Сервер отправил некорректное WebSocket-сообщение.",
};

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translator;
  formatDate: (value: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function isLocale(value: string | null): value is Locale {
  return value === "en" || value === "ru";
}

function getBrowserLocale(): Locale {
  const browserLanguages = navigator.languages.length
    ? navigator.languages
    : [navigator.language];

  for (const language of browserLanguages) {
    if (language.toLowerCase().startsWith("ru")) {
      return "ru";
    }

    if (language.toLowerCase().startsWith("en")) {
      return "en";
    }
  }

  return "en";
}

function getInitialLocale(): Locale {
  try {
    const storedLocale = localStorage.getItem(localeStorageKey);

    if (isLocale(storedLocale)) {
      return storedLocale;
    }
  } catch {
    return getBrowserLocale();
  }

  return getBrowserLocale();
}

function interpolate(template: string, values?: TranslationValues): string {
  if (!values) {
    return template;
  }

  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{{${key}}}`, String(value)),
    template,
  );
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

  const setLocale = useCallback((nextLocale: Locale): void => {
    setLocaleState(nextLocale);
  }, []);

  const t = useCallback<Translator>(
    (key, values) => {
      const message = locale === "ru" ? russianMessages[key] : englishMessages[key];

      return interpolate(message, values);
    },
    [locale],
  );

  const formatDate = useCallback(
    (value: string): string => {
      const date = new Date(value);

      if (Number.isNaN(date.getTime())) {
        return value;
      }

      return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
    },
    [locale],
  );

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = t("app.documentTitle");

    try {
      localStorage.setItem(localeStorageKey, locale);
    } catch {
      // Storage may be unavailable in private browsing.
    }
  }, [locale, t]);

  const contextValue = useMemo(
    () => ({ locale, setLocale, t, formatDate }),
    [formatDate, locale, setLocale, t],
  );

  return <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const contextValue = useContext(I18nContext);

  if (!contextValue) {
    throw new Error("useI18n must be used inside I18nProvider");
  }

  return contextValue;
}

export type { Locale, TranslationKey, Translator };
