import { useState, useEffect, useCallback } from "react";
import { loadTheme, saveTheme } from "../lib/store";

type Theme = "light" | "dark";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadTheme().then((loaded) => {
      setTheme(loaded);
      setIsLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (isLoaded) {
      document.documentElement.setAttribute("data-theme", theme);
      saveTheme(theme);
    }
  }, [theme, isLoaded]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  return { theme, toggleTheme };
}
