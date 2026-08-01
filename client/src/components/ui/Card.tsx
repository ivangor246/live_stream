import type { HTMLAttributes } from "react";

type CardElement = "article" | "div" | "section";
type CardVariant = "default" | "muted";

interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: CardElement;
  variant?: CardVariant;
}

export function Card({
  as: Element = "section",
  className = "",
  variant = "default",
  ...props
}: CardProps) {
  return (
    <Element
      className={`card card--${variant} ${className}`.trim()}
      {...props}
    />
  );
}
