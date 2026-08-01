import { Link, type LinkProps } from "react-router-dom";

import type { ButtonSize, ButtonVariant } from "./Button.js";

interface ButtonLinkProps extends Omit<LinkProps, "className"> {
  className?: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
}

export function ButtonLink({
  className = "",
  size = "md",
  variant = "secondary",
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={`button button--${variant} button--${size} ${className}`.trim()}
      {...props}
    />
  );
}
