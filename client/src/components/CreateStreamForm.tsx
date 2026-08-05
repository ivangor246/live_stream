import { type SubmitEvent, useState } from "react";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import type { PickersLocaleText } from "@mui/x-date-pickers/locales";
import type { Dayjs } from "dayjs";
import "dayjs/locale/ru";

import { localizeError } from "../i18n/errorMessages.js";
import { useI18n, type TranslationKey } from "../i18n/I18nProvider.js";
import type { CreateStreamRequest } from "../shared/api.js";
import { Button } from "./ui/Button.js";

interface CreateStreamFormState {
  title: string;
  isPrivate: boolean;
  scheduledAt: Dayjs | null;
  isSubmitting: boolean;
  error: string | null;
}

interface CreateStreamFormProps {
  onCreate: (request: CreateStreamRequest) => Promise<void>;
}

function validateTitle(title: string): TranslationKey | null {
  const trimmedTitle = title.trim();

  if (trimmedTitle.length < 3) {
    return "validation.titleMin";
  }

  if (trimmedTitle.length > 100) {
    return "validation.titleMax";
  }

  return null;
}

function toScheduledAt(value: Dayjs | null): string | undefined | null {
  if (!value) {
    return undefined;
  }

  return value.isValid() ? value.toDate().toISOString() : null;
}

export function CreateStreamForm({ onCreate }: CreateStreamFormProps) {
  const { locale, t } = useI18n();
  const pickerLocaleText: Partial<PickersLocaleText> = {
    cancelButtonLabel: t("calendar.cancel"),
    clearButtonLabel: t("calendar.clear"),
    datePickerToolbarTitle: t("calendar.selectDate"),
    dateTimePickerToolbarTitle: t("calendar.selectDateTime"),
    nextMonth: t("calendar.nextMonth"),
    openDatePickerDialogue: (date) =>
      t("calendar.openDate", { date: date ?? "" }),
    openTimePickerDialogue: (time) =>
      t("calendar.openTime", { time: time ?? "" }),
    okButtonLabel: t("calendar.confirm"),
    previousMonth: t("calendar.previousMonth"),
    timePickerToolbarTitle: t("calendar.selectTime"),
    todayButtonLabel: t("calendar.today"),
  };
  const [formState, setFormState] = useState<CreateStreamFormState>({
    title: "",
    isPrivate: false,
    scheduledAt: null,
    isSubmitting: false,
    error: null,
  });

  async function handleSubmit(
    event: SubmitEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    const validationError = validateTitle(formState.title);

    if (validationError) {
      setFormState((currentState) => ({
        ...currentState,
        error: t(validationError),
      }));

      return;
    }

    const trimmedTitle = formState.title.trim();
    const scheduledAt = toScheduledAt(formState.scheduledAt);

    if (scheduledAt === null) {
      setFormState((currentState) => ({
        ...currentState,
        error: t("validation.plannedStart"),
      }));

      return;
    }

    setFormState((currentState) => ({
      ...currentState,
      isSubmitting: true,
      error: null,
    }));

    try {
      await onCreate({
        title: trimmedTitle,
        isPrivate: formState.isPrivate,
        ...(scheduledAt ? { scheduledAt } : {}),
      });

      setFormState({
        title: "",
        isPrivate: false,
        scheduledAt: null,
        isSubmitting: false,
        error: null,
      });
    } catch (error: unknown) {
      setFormState((currentState) => ({
        ...currentState,
        isSubmitting: false,
        error: localizeError(error, t, "errors.createStream"),
      }));
    }
  }

  return (
    <form className="create-form" onSubmit={handleSubmit}>
      <h2>{t("streams.createTitle")}</h2>

      <label htmlFor="stream-title">{t("streams.titleLabel")}</label>

      <input
        id="stream-title"
        name="title"
        type="text"
        value={formState.title}
        disabled={formState.isSubmitting}
        maxLength={100}
        placeholder={t("streams.titlePlaceholder")}
        onChange={(event) => {
          setFormState((currentState) => ({
            ...currentState,
            title: event.target.value,
            error: null,
          }));
        }}
      />

      <div className="create-form__date-time">
        <LocalizationProvider
          adapterLocale={locale === "ru" ? "ru" : "en"}
          dateAdapter={AdapterDayjs}
          localeText={pickerLocaleText}
        >
          <DateTimePicker
            ampm={false}
            className="app-date-time-picker"
            disabled={formState.isSubmitting}
            format={locale === "ru" ? "DD.MM.YYYY HH:mm" : "MM/DD/YYYY HH:mm"}
            label={t("streams.plannedStartLabel")}
            slots={{ openPickerIcon: CalendarMonthIcon }}
            slotProps={{
              desktopPaper: {
                className: "app-date-time-picker__paper",
              },
              popper: {
                className: "app-date-time-picker__popper",
              },
              textField: {
                id: "stream-scheduled-at",
                name: "scheduledAt",
              },
            }}
            value={formState.scheduledAt}
            onChange={(scheduledAt) => {
              setFormState((currentState) => ({
                ...currentState,
                scheduledAt,
                error: null,
              }));
            }}
          />
        </LocalizationProvider>
      </div>

      <label className="create-form__checkbox" htmlFor="stream-private">
        <input
          id="stream-private"
          name="isPrivate"
          type="checkbox"
          checked={formState.isPrivate}
          disabled={formState.isSubmitting}
          onChange={(event) => {
            setFormState((currentState) => ({
              ...currentState,
              isPrivate: event.target.checked,
              error: null,
            }));
          }}
        />
        <span>
          <strong>{t("streams.privateLabel")}</strong>
          <small>{t("streams.privateDescription")}</small>
        </span>
      </label>

      {formState.error && <p role="alert">{formState.error}</p>}

      <Button
        type="submit"
        variant="primary"
        disabled={formState.isSubmitting}
      >
        {formState.isSubmitting ? t("streams.creating") : t("streams.create")}
      </Button>
    </form>
  );
}
