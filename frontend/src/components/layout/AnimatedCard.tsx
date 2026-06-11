import type { ReactNode } from "react";

export function AnimatedCard({
  children,
  className = "",
  onClick,
  interactive = true,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  interactive?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={`card-elevated ${interactive ? "cursor-pointer" : ""} ${className}`}
    >
      {children}
    </div>
  );
}