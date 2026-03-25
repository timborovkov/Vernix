// Runs before React hydration to prevent dark mode flash (FOUC).
// Reads the stored theme preference and applies the `dark` class
// to <html> synchronously so the first paint is correct.
(function () {
  try {
    var theme = localStorage.getItem("theme");
    var prefersDark =
      theme === "dark" ||
      (theme !== "light" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);

    if (prefersDark) {
      document.documentElement.classList.add("dark");
    }
  } catch (e) {
    // localStorage may be unavailable (private browsing, SSR)
  }
})();
