type ClassValue = string | number | null | undefined | false | ClassValue[];

/**
 * Joins conditional class names into a single string.
 * Falsy values (false, null, undefined, "") are dropped.
 *
 * No dedupe/conflict-resolution (that's what tailwind-merge would do) —
 * kept intentionally dependency-free per project convention.
 */
export function cn(...values: ClassValue[]): string {
  return values
    .flat(Infinity as 1)
    .filter((value): value is string | number => Boolean(value))
    .join(" ");
}
