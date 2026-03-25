/**
 * Blocking theme initialization script.
 *
 * Runs before React hydration to prevent a flash of wrong theme (FOUC).
 * Reads the stored theme from localStorage and applies the `dark` class
 * to <html> synchronously so the first paint matches the user's preference.
 *
 * This is the standard approach used by next-themes and similar libraries.
 * It must use dangerouslySetInnerHTML because Next.js does not allow
 * synchronous <script> tags via the `src` attribute.
 */
export function ThemeScript() {
  const script = `
    (function() {
      try {
        var theme = localStorage.getItem("theme");
        var prefersDark = theme === "dark" ||
          (theme !== "light" && matchMedia("(prefers-color-scheme:dark)").matches);
        if (prefersDark) document.documentElement.classList.add("dark");
      } catch(e) {}
    })();
  `;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
