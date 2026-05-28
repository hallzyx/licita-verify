interface FieldErrorProps {
  message?: string;
  id?: string;
}

/**
 * Reusable inline error message for form fields.
 * Renders a red <p> with role="alert" only when message is non-empty.
 * Accepts an optional id for aria-describedby linking to the input.
 */
export function FieldError({ message, id }: FieldErrorProps) {
  if (!message) return null;

  return (
    <p id={id} className="text-xs text-red-600" role="alert">
      {message}
    </p>
  );
}
