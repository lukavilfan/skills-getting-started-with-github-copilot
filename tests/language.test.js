const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const script = readFileSync(path.join(__dirname, "../src/static/i18n.js"), "utf8");

function createLanguage({ saved = null, storageBlocked = false } = {}) {
  const documentHandlers = {};
  const windowHandlers = {};
  const warnings = [];
  const events = [];
  let stored = saved;

  function element(dataset) {
    return {
      dataset,
      attributes: {},
      handlers: {},
      setAttribute(name, value) { this.attributes[name] = value; },
      addEventListener(name, handler) { this.handlers[name] = handler; },
    };
  }

  const label = element({ i18n: "darkMode" });
  const input = element({ i18nPlaceholder: "emailPlaceholder" });
  const group = element({ i18nAriaLabel: "language" });
  const tooltip = element({ i18nTitle: "darkMode" });
  const english = element({ language: "en" });
  const slovenian = element({ language: "sl" });
  const elements = {
    "[data-i18n]": [label],
    "[data-i18n-placeholder]": [input],
    "[data-i18n-aria-label]": [group],
    "[data-i18n-title]": [tooltip],
    "[data-language]": [english, slovenian],
  };
  const document = {
    documentElement: { lang: "en" },
    querySelectorAll: (selector) => elements[selector],
    addEventListener: (name, handler) => { documentHandlers[name] = handler; },
    dispatchEvent: (event) => events.push(event.type),
  };
  const storage = {
    getItem() {
      if (storageBlocked) throw new Error("Storage blocked");
      return stored;
    },
    setItem(key, value) {
      if (storageBlocked) throw new Error("Storage blocked");
      assert.equal(key, "mergington-language");
      stored = value;
    },
  };
  const window = {
    localStorage: storage,
    addEventListener: (name, handler) => { windowHandlers[name] = handler; },
  };
  vm.runInNewContext(script, {
    document,
    window,
    CustomEvent: class {
      constructor(type) { this.type = type; }
    },
    console: { warn: (...args) => warnings.push(args) },
  });

  return {
    document,
    window,
    label,
    input,
    group,
    tooltip,
    english,
    slovenian,
    storage,
    events,
    warnings,
    stored: () => stored,
    ready: () => documentHandlers.DOMContentLoaded(),
    click: (button) => button.handlers.click(),
    changeStorage: (key, newValue, storageArea = storage) => {
      windowHandlers.storage({ key, newValue, storageArea });
    },
  };
}

test("restores and switches language, updating labels, page language, and storage", () => {
  const app = createLanguage({ saved: "sl" });
  assert.equal(app.document.documentElement.lang, "sl");
  app.ready();
  assert.equal(app.label.textContent, "Temni način");
  assert.equal(app.input.attributes.placeholder, "tvoj-email@mergington.edu");
  assert.equal(app.group.attributes["aria-label"], "Jezik");
  assert.equal(app.tooltip.attributes.title, "Temni način");
  assert.equal(app.slovenian.attributes["aria-pressed"], "true");
  assert.equal(app.document.title, "Dejavnosti Srednje šole Mergington");

  app.click(app.english);
  assert.equal(app.document.documentElement.lang, "en");
  assert.equal(app.label.textContent, "Dark mode");
  assert.equal(app.tooltip.attributes.title, "Dark mode");
  assert.equal(app.english.attributes["aria-pressed"], "true");
  assert.equal(app.slovenian.attributes["aria-pressed"], "false");
  assert.equal(app.stored(), "en");
  assert.deepEqual(app.events, ["app-language-change"]);
});

test("syncs local-storage changes and ignores unrelated or session-storage events", () => {
  const app = createLanguage();
  app.ready();
  app.changeStorage("other", "sl");
  app.changeStorage("mergington-language", "sl", {});
  assert.equal(app.document.documentElement.lang, "en");

  app.changeStorage("mergington-language", "sl");
  assert.equal(app.document.documentElement.lang, "sl");
  app.changeStorage(null, null);
  assert.equal(app.document.documentElement.lang, "en");
});

test("uses Slovenian singular, dual, and plural forms for availability", () => {
  const app = createLanguage({ saved: "sl" });
  const text = app.window.i18n.text;
  assert.equal(text("spotsLeft", 1), "1 prosto mesto");
  assert.equal(text("spotsLeft", 2), "2 prosti mesti");
  assert.equal(text("spotsLeft", 3), "3 prosta mesta");
  assert.equal(text("spotsLeft", 5), "5 prostih mest");
  assert.equal(text("spotsLeft", 11), "11 prostih mest");
  assert.equal(text("spotsLeft", 101), "101 prosto mesto");
  assert.equal(text("spotsLeft", 102), "102 prosti mesti");
});

test("keeps switching usable when storage is blocked and warns about missing translations", () => {
  const app = createLanguage({ storageBlocked: true });
  app.ready();
  app.click(app.slovenian);
  assert.equal(app.document.documentElement.lang, "sl");
  assert.equal(app.warnings.length, 2);

  const original = { description: "Description", schedule: "Friday" };
  const activity = app.window.i18n.activity("New activity", original);
  assert.equal(activity.name, "New activity");
  assert.equal(activity.description, "Description");
  assert.equal(activity.schedule, "Friday");
  assert.equal(app.warnings.length, 3);
});
