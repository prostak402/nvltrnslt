import Link from "next/link";
import { type ButtonHTMLAttributes, type AnchorHTMLAttributes } from "react";

const variantStyles = {
  primary:
    "bg-accent text-white hover:bg-accent-hover active:bg-accent shadow-sm",
  secondary:
    "border border-border text-foreground hover:border-border-hover hover:bg-background-hover",
  danger:
    "bg-danger text-white hover:opacity-90 active:opacity-80",
  ghost:
    "text-foreground-secondary hover:text-foreground hover:bg-background-hover",
} as const;

const sizeStyles = {
  sm: "px-3 py-1.5 text-sm rounded-lg",
  md: "px-4 py-2 text-sm rounded-lg",
  lg: "px-6 py-3 text-base rounded-xl",
} as const;

type Variant = keyof typeof variantStyles;
type Size = keyof typeof sizeStyles;

type ButtonBaseProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
};

type ButtonAsButton = ButtonBaseProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: undefined;
  };

type ButtonAsLink = ButtonBaseProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
    href: string;
  };

type ButtonProps = ButtonAsButton | ButtonAsLink;

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonProps) {
  const classes = `inline-flex items-center justify-center font-medium transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]} ${sizeStyles[size]} ${className}`;

  if ("href" in props && props.href) {
    const { href, ...rest } = props;
    return (
      <Link href={href} className={classes} {...rest} />
    );
  }

  const { ...rest } = props as ButtonAsButton;
  return <button className={classes} {...rest} />;
}
