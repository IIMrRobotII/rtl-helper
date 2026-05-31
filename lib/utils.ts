import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const FOCUS_RING =
  "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
