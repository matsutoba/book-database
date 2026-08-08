import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import styles from "./Shell.module.css";

type ShellProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Full-height flex column page shell. Renders inside <body> to make the
 * page stretch to at least the viewport height and lay children out in a
 * column (e.g. header / main / footer with the footer pinned to bottom).
 */
export function Shell({ children, className }: ShellProps) {
  return <div className={cn(styles.shell, className)}>{children}</div>;
}
