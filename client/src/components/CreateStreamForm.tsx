import { type SubmitEvent, useState } from "react";

interface CreateStreamFormState {
  title: string;
  isSubmitting: boolean;
  error: string | null;
}

interface CreateStreamFormProps {
  onCreate: (title: string) => Promise<void>;
}

function validateTitle(title: string): string | null {
  const trimmedTitle = title.trim();

  if (trimmedTitle.length < 3) {
    return "Название должно содержать минимум 3 символа";
  }

  if (trimmedTitle.length > 100) {
    return "Название должно содержать максимум 100 символов";
  }

  return null;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Не удалось создать трансляцию.";
}

export function CreateSreamForm({ onCreate }: CreateStreamFormProps) {
  const [formState, setFormState] = useState<CreateStreamFormState>({
    title: "",
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
        error: validationError,
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
      await onCreate(trimmedTitle);

      setFormState({
        title: "",
        isSubmitting: false,
        error: null,
      });
    } catch (error: unknown) {
      setFormState((currentState) => ({
        ...currentState,
        isSubmitting: false,
        error: getErrorMessage(error),
      }));
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Создать трансляцию</h2>

      <label htmlFor="steam-title">Название</label>

      <input
        id="stream-title"
        name="title"
        type="text"
        value={formState.title}
        disabled={formState.isSubmitting}
        maxLength={100}
        onChange={(event) => {
          setFormState((currentState) => ({
            ...currentState,
            title: event.target.value,
            error: null,
          }));
        }}
      />

      {formState.error && <p role="alert">{formState.error}</p>}

      <button type="submit" disabled={formState.isSubmitting}>
        {formState.isSubmitting ? "Создание..." : "Создать"}
      </button>
    </form>
  );
}
