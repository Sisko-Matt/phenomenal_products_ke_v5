import { useEffect, useState } from "react";

const KEY = "ppke.recent.v1";
const MAX = 6;

export function pushRecentlyViewed(slug: string) {
  if (typeof window === "undefined") return;
  try {
    const cur: string[] = JSON.parse(localStorage.getItem(KEY) || "[]");
    const next = [slug, ...cur.filter((s) => s !== slug)].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("ppke.recent.change"));
  } catch {
    /* ignore */
  }
}

export function useRecentlyViewed() {
  const [slugs, setSlugs] = useState<string[]>([]);
  useEffect(() => {
    const read = () => {
      try {
        setSlugs(JSON.parse(localStorage.getItem(KEY) || "[]"));
      } catch {
        setSlugs([]);
      }
    };
    read();
    window.addEventListener("ppke.recent.change", read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener("ppke.recent.change", read);
      window.removeEventListener("storage", read);
    };
  }, []);
  return slugs;
}
