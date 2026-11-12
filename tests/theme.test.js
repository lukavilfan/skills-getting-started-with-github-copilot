const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const themeScript = readFileSync(path.join(__dirname, "../src/static/theme.js"), "utf8");

function createTheme({ saved = null, systemDark = false, storageBlocked = false } = {}) {
  const documentHandlers = {};
  const windowHandlers = {};
  const mediaHandlers = {};
  const toggleHandlers = {};
  const warnings = [];
  const attributes = {};
  let stored = saved;
  let ready = false;

  const toggle = {
    hidden: true,
    setAttribute: (name, value) => { attributes[name] = value; },
    addEventListener: (name, handler) => { toggleHandlers[name] = handler; },
  };
  const systemTheme = {
    matches: systemDark,
    addEventListener: (name, handler) => { mediaHandlers[name] = handler; },
  };
  const document = {
    documentElement: { dataset: {} },
    getElementById: () => ready ? toggle : null,
    addEventListener: (name, handler) => { documentHandlers[name] = handler; },
  };
  const window = {
    matchMedia: () => systemTheme,
    localStorage: {
      getItem() {
        if (storageBlocked) throw new Error("Storage blocked");
        return stored;
      },
      setItem(key, value) {
        if (storageBlocked) throw new Error("Storage blocked");
        assert.equal(key, "mergington-theme");
        stored = value;
      },
    },
    addEventListener: (name, handler) => { windowHandlers[name] = handler; },
  };

  vm.runInNewContext(themeScript, {
    document,
    window,
    console: { warn: (...args) => warnings.push(args) },
  });

  return {
    document,
    toggle,
    attributes,
    warnings,
    stored: () => stored,
    ready() {
      ready = true;
      documentHandlers.DOMContentLoaded();
    },
    click: () => toggleHandlers.click(),
    setSystemDark(dark) {
      systemTheme.matches = dark;
      mediaHandlers.change({ matches: dark });
    },
    storage: (key, newValue, storageArea = window.localStorage) => {
      windowHandlers.storage({ key, newValue, storageArea });
    },
  };
}

test("follows the system theme until the user chooses a preference", () => {
  const app = createTheme({ systemDark: true });
  assert.equal(app.document.documentElement.dataset.theme, "dark");
  app.ready();
  assert.equal(app.toggle.hidden, false);
  assert.equal(app.attributes["aria-pressed"], "true");

  app.setSystemDark(false);
  assert.equal(app.document.documentElement.dataset.theme, "light");
  assert.equal(app.attributes["aria-pressed"], "false");
  assert.equal(app.stored(), null);
});

test("persists the selected theme and keeps it when the system changes", () => {
  const app = createTheme({ saved: "light", systemDark: true });
  assert.equal(app.document.documentElement.dataset.theme, "light");
  app.ready();
  app.click();

  assert.equal(app.document.documentElement.dataset.theme, "dark");
  assert.equal(app.attributes["aria-pressed"], "true");
  assert.equal(app.stored(), "dark");
  app.setSystemDark(false);
  assert.equal(app.document.documentElement.dataset.theme, "dark");
  assert.equal(createTheme({ saved: app.stored() }).document.documentElement.dataset.theme, "dark");
});

test("syncs a changed or cleared preference from another tab", () => {
  const app = createTheme({ saved: "light", systemDark: true });
  app.ready();
  app.storage("another-key", "dark");
  app.storage("mergington-theme", "dark", {});
  assert.equal(app.document.documentElement.dataset.theme, "light");

  app.storage("mergington-theme", "dark");
  assert.equal(app.document.documentElement.dataset.theme, "dark");
  app.setSystemDark(false);
  app.storage("mergington-theme", null);
  assert.equal(app.document.documentElement.dataset.theme, "light");
  assert.equal(app.attributes["aria-pressed"], "false");
});

test("keeps the toggle usable when browser storage is blocked", () => {
  const app = createTheme({ systemDark: false, storageBlocked: true });
  app.ready();
  app.click();
  assert.equal(app.document.documentElement.dataset.theme, "dark");
  assert.equal(app.attributes["aria-pressed"], "true");
  assert.equal(app.warnings.length, 2);
});

test("ignores an invalid saved preference and follows the system", () => {
  const app = createTheme({ saved: "unknown", systemDark: true });
  assert.equal(app.document.documentElement.dataset.theme, "dark");
  assert.equal(app.warnings.length, 1);
});
