import { type SubmitEvent, useState } from "react";

import { localizeError } from "../i18n/errorMessages.js";
import { useI18n, type TranslationKey } from "../i18n/I18nProvider.js";
import { Button } from "./ui/Button.js";

interface CreateStreamFormState {
  title: string;
  isPrivate: boolean;
  isSubmitting: boolean;
  error: string | null;
}

interface CreateStreamFormProps {
  onCreate: (title: string, isPrivate: boolean) => Promise<void>;
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

export function CreateStreamForm({ onCreate }: CreateStreamFormProps) {
  const { t } = useI18n();
  const [formState, setFormState] = useState<CreateStreamFormState>({
    title: "",
    isPrivate: false,
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

    setFormState((currentState) => ({
      ...currentState,
      isSubmitting: true,
      error: null,
    }));

    try {
      await onCreate(trimmedTitle, formState.isPrivate);

      setFormState({
        title: "",
        isPrivate: false,
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
