import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getProxiedImageURL(url: string) {
  if (!url) return "https://placehold.co/300x300";
  if (
    url.startsWith("http://127.0.0.1:34116") ||
    url.startsWith("http://localhost:34116")
  )
    return url;
  return `http://127.0.0.1:34116/image?url=${encodeURIComponent(url)}`;
}
