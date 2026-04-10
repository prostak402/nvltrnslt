import type { HTMLAttributes } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  hover?: boolean;
  className?: string;
};

export function Card({ hover = false, className = "", children, ...props }: CardProps) {
  return (
    <div
      className={`bg-background-card border border-border rounded-xl p-6 ${
        hover ? "transition-colors duration-200 hover:border-border-hover hover:bg-background-hover cursor-pointer" : ""
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
