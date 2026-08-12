import { useEffect, useState } from "react";

type Theme = "dark" | "light";
const KEY = "ppke-theme-v2";

let transitionTimer: ReturnType<typeof setTimeout> | undefined;

function apply(theme: Theme, animate = false) {
  const root = document.documentElement;

  if (animate && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    root.classList.add("theme-transition");
    if (transitionTimer) clearTimeout(transitionTimer);
    transitionTimer = setTimeout(() => {
      root.classList.remove("theme-transition");
    }, 520);
  }

  root.classList.toggle("light", theme === "light");
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const saved = (localStorage.getItem(KEY) as Theme | null) ?? "light";
    setTheme(saved);
    apply(saved);
  }, []);

  function toggle() {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      localStorage.setItem(KEY, next);
      apply(next, true);
      return next;
    });
  }

  return { theme, toggle };
}
