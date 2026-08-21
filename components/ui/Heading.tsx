import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import styles from "./Heading.module.css";

type HeadingProps = {
  children: ReactNode;
  className?: string;
};

export function Heading({ children, className }: HeadingProps) {
  return <h2 className={cn(styles.heading, className)}>{children}</h2>;
}
