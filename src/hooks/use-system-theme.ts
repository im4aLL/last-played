import { useEffect } from "react";

const DARK_SCHEME_QUERY = "(prefers-color-scheme: dark)";

export function useSystemTheme() {
  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      return;
    }

    const media = window.matchMedia(DARK_SCHEME_QUERY);
    const root = document.documentElement;
    const apply = (dark: boolean) => root.classList.toggle("dark", dark);

    apply(media.matches);

    const onChange = (event: MediaQueryListEvent) => apply(event.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);
}
