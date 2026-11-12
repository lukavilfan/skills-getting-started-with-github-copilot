(() => {
  const storageKey = "mergington-theme";
  const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
  let preference = null;
  let storage;

  try {
    storage = window.localStorage;
    const savedTheme = storage.getItem(storageKey);
    if (savedTheme === "light" || savedTheme === "dark") {
      preference = savedTheme;
    } else if (savedTheme !== null) {
      console.warn("Ignoring invalid saved theme preference:", savedTheme);
    }
  } catch (error) {
    console.warn("Unable to read the saved theme preference:", error);
  }

  function applyTheme() {
    const theme = preference || (systemTheme.matches ? "dark" : "light");
    document.documentElement.dataset.theme = theme;
    const toggle = document.getElementById("theme-toggle");
    if (toggle) {
      toggle.setAttribute("aria-pressed", String(theme === "dark"));
    }
  }

  applyTheme();

  document.addEventListener("DOMContentLoaded", () => {
    const toggle = document.getElementById("theme-toggle");
    toggle.hidden = false;
    toggle.addEventListener("click", () => {
      preference = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      applyTheme();
      try {
        window.localStorage.setItem(storageKey, preference);
      } catch (error) {
        console.warn("Unable to save the theme preference:", error);
      }
    });
    applyTheme();
  });

  systemTheme.addEventListener("change", () => {
    if (preference === null) {
      applyTheme();
    }
  });

  window.addEventListener("storage", (event) => {
    if ((event.storageArea && event.storageArea !== storage) || (event.key !== storageKey && event.key !== null)) {
      return;
    }
    if (event.newValue === "light" || event.newValue === "dark" || event.newValue === null) {
      preference = event.newValue;
      applyTheme();
    } else {
      console.warn("Ignoring invalid saved theme preference:", event.newValue);
    }
  });
})();
