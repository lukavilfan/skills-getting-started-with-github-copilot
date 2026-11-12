const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const appScript = readFileSync(path.join(__dirname, "../src/static/app.js"), "utf8");
const i18nScript = readFileSync(path.join(__dirname, "../src/static/i18n.js"), "utf8");

class Element {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.className = "";
    this.textContent = "";
    this.attributes = {};
    this.disabled = false;
    this.listeners = {};
    this.classList = { add() {}, remove() {} };
    this.validity = { valueMissing: false, typeMismatch: false, customError: false };
    this.validationMessage = "";
    this.html = "";
  }

  set innerHTML(value) {
    this.html = value;
    this.children = [];
  }

  get innerHTML() {
    return this.html;
  }

  appendChild(child) {
    this.children.push(child);
  }

  addEventListener(event, handler) {
    this.listeners[event] = handler;
  }

  setAttribute(name, value) {
    this.attributes[name] = value;
  }

  setCustomValidity(message) {
    this.validationMessage = message;
    this.validity.customError = Boolean(message);
  }
}

class Select extends Element {
  constructor() {
    super("select");
    const placeholder = new Element("option");
    placeholder.value = "";
    this.appendChild(placeholder);
    this.selectedIndex = 0;
  }

  get value() {
    return this.children[this.selectedIndex]?.value ?? "";
  }

  set value(value) {
    this.selectedIndex = this.children.findIndex((option) => option.value === value);
  }

  get length() {
    return this.children.length;
  }

  set length(length) {
    this.children.length = length;
    if (this.selectedIndex >= length) {
      this.selectedIndex = length > 0 ? 0 : -1;
    }
  }
}

function response(data, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => data };
}

function createApp(responses) {
  const elements = {
    "activities-list": new Element("div"),
    activity: new Select(),
    "signup-form": new Element("form"),
    message: new Element("div"),
    email: new Element("input"),
  };
  const calls = [];
  const errors = [];
  const documentHandlers = {};
  const windowHandlers = {};

  elements["signup-form"].reset = () => {
    elements.email.value = "";
    elements.activity.value = "";
  };

  const document = {
    documentElement: { lang: "en" },
    getElementById: (id) => elements[id],
    createElement: (tagName) => new Element(tagName),
    querySelectorAll: () => [],
    addEventListener: (event, handler) => {
      (documentHandlers[event] ??= []).push(handler);
    },
    dispatchEvent: (event) => {
      for (const handler of documentHandlers[event.type] ?? []) handler(event);
    },
  };
  const window = {
    localStorage: { getItem: () => null, setItem() {} },
    addEventListener: (event, handler) => { windowHandlers[event] = handler; },
  };

  const context = {
    document,
    window,
    CustomEvent: class {
      constructor(type) { this.type = type; }
    },
    fetch: (url, options) => {
      calls.push({ url, options });
      assert.ok(responses.length, `Unexpected request: ${url}`);
      return Promise.resolve(responses.shift());
    },
    console: { error: (...args) => errors.push(args), warn() {} },
    setTimeout() {},
  };
  vm.runInNewContext(i18nScript, context);
  vm.runInNewContext(appScript, context);
  for (const handler of documentHandlers.DOMContentLoaded) handler();
  return {
    elements,
    calls,
    errors,
    i18n: window.i18n,
    changeLanguage: (language) => windowHandlers.storage({ key: "mergington-language", newValue: language }),
  };
}

const settle = () => new Promise((resolve) => setImmediate(resolve));

function participants(card) {
  return card.children.find((child) => child.className === "participants-section");
}

function participantItems(card) {
  const list = participants(card).children.find((child) => child.tagName === "UL");
  return list ? list.children : [];
}

function participantEmails(card) {
  return participantItems(card).map((item) => item.children[0].textContent);
}

function removeButton(item) {
  return item.children.find((child) => child.className === "remove-participant");
}

function participantFeedback(card) {
  return participants(card).children.find((child) => child.className.startsWith("participant-feedback"));
}

function activities() {
  return {
    Chess: {
      description: "Play chess",
      schedule: "Friday",
      max_participants: 4,
      participants: ["alex@example.test", "<img src=x onerror=alert(1)>"],
      translations: { sl: { name: "Šahovski krožek", description: "Igrajte šah", schedule: "Petek" } },
    },
    Art: {
      description: "Make art",
      schedule: "Wednesday",
      max_participants: 3,
      participants: [],
      translations: { sl: { name: "Likovni krožek", description: "Ustvarjajte", schedule: "Sreda" } },
    },
  };
}

test("shows participant emails safely with labeled remove buttons and an empty state", async () => {
  const app = createApp([response(activities())]);
  await settle();

  const [chess, art] = app.elements["activities-list"].children;
  const items = participantItems(chess);
  assert.deepEqual(participantEmails(chess), [
    "alex@example.test",
    "<img src=x onerror=alert(1)>",
  ]);
  assert.equal(items[1].children[0].innerHTML, "");
  assert.equal(items[1].children[0].children.length, 0);
  assert.equal(removeButton(items[0]).type, "button");
  assert.equal(removeButton(items[0]).attributes["aria-label"], "Remove alex@example.test from Chess");
  assert.match(removeButton(items[0]).innerHTML, /<svg/);
  assert.match(participants(chess).innerHTML, /Participants/);
  assert.equal(participantItems(art).length, 0);
  assert.match(participants(art).children[0].textContent, /No participants yet/);
});

test("refreshes participants and availability after sign-ups without duplicating activity options", async () => {
  const initial = activities();
  const afterFirst = activities();
  afterFirst.Art.participants.push("first@example.test");
  const afterSecond = activities();
  afterSecond.Art.participants.push("first@example.test", "second@example.test");
  const app = createApp([
    response(initial),
    response({ message: "First signup complete" }),
    response(afterFirst),
    response({ message: "Second signup complete" }),
    response(afterSecond),
  ]);
  await settle();

  for (const email of ["first@example.test", "second@example.test"]) {
    app.elements.activity.value = "Art";
    app.elements.email.value = email;
    await app.elements["signup-form"].listeners.submit({ preventDefault() {} });
    await settle();
  }

  const art = app.elements["activities-list"].children[1];
  assert.deepEqual(participantEmails(art), [
    "first@example.test",
    "second@example.test",
  ]);
  assert.match(art.innerHTML, /1 spot left/);
  assert.equal(app.elements.activity.length, 3);
  assert.equal(app.elements.activity.value, "");
  assert.equal(app.elements.email.value, "");
  assert.equal(app.elements.message.textContent, "Second signup complete");
});

test("preserves a new selection made while a successful signup refresh is pending", async () => {
  let finishRefresh;
  const refresh = new Promise((resolve) => {
    finishRefresh = resolve;
  });
  const updated = activities();
  updated.Art.participants.push("new@example.test");
  const app = createApp([response(activities()), response({ message: "Signed up" }), refresh]);
  await settle();

  app.elements.activity.value = "Art";
  app.elements.email.value = "new@example.test";
  await app.elements["signup-form"].listeners.submit({ preventDefault() {} });
  app.elements.activity.value = "Chess";
  finishRefresh(response(updated));
  await settle();

  assert.equal(app.elements.activity.value, "Chess");
  assert.equal(app.elements.activity.length, 3);
  assert.deepEqual(participantEmails(app.elements["activities-list"].children[1]), [
    "new@example.test",
  ]);
});

test("keeps the newest participant list when an older refresh succeeds or fails late", async () => {
  const afterFirst = activities();
  afterFirst.Art.participants.push("first@example.test");
  const afterSecond = activities();
  afterSecond.Art.participants.push("first@example.test", "second@example.test");

  for (const staleResponse of [response(afterFirst), response({ detail: "Unavailable" }, 503)]) {
    let finishFirstRefresh;
    let finishSecondRefresh;
    const firstRefresh = new Promise((resolve) => {
      finishFirstRefresh = resolve;
    });
    const secondRefresh = new Promise((resolve) => {
      finishSecondRefresh = resolve;
    });
    const app = createApp([
      response(activities()),
      response({ message: "First signup complete" }),
      firstRefresh,
      response({ message: "Second signup complete" }),
      secondRefresh,
    ]);
    await settle();

    for (const email of ["first@example.test", "second@example.test"]) {
      app.elements.activity.value = "Art";
      app.elements.email.value = email;
      await app.elements["signup-form"].listeners.submit({ preventDefault() {} });
    }

    finishSecondRefresh(response(afterSecond));
    await settle();
    finishFirstRefresh(staleResponse);
    await settle();

    assert.deepEqual(participantEmails(app.elements["activities-list"].children[1]), [
      "first@example.test",
      "second@example.test",
    ]);
    assert.equal(app.errors.length, staleResponse.ok ? 0 : 1);
  }
});

test("does not refresh cards after a rejected signup", async () => {
  const app = createApp([response(activities()), response({ detail: "Already signed up" }, 409)]);
  await settle();

  app.elements.activity.value = "Chess";
  app.elements.email.value = "alex@example.test";
  await app.elements["signup-form"].listeners.submit({ preventDefault() {} });
  await settle();

  assert.equal(app.calls.length, 2);
  assert.equal(app.elements.message.textContent, "Already signed up");
  assert.equal(participantItems(app.elements["activities-list"].children[0]).length, 2);
});

test("translates existing cards and signup feedback without changing the selected activity", async () => {
  const updated = activities();
  updated.Art.participants.push("first@example.test");
  const app = createApp([
    response(activities()),
    response({ message: "Signed up first@example.test for Art" }),
    response(updated),
  ]);
  await settle();

  app.elements.activity.value = "Art";
  app.elements.email.value = "first@example.test";
  app.changeLanguage("sl");

  assert.match(app.elements["activities-list"].children[1].innerHTML, /Likovni krožek/);
  assert.match(participants(app.elements["activities-list"].children[1]).innerHTML, /Udeleženci/);
  assert.equal(app.elements.activity.children[2].textContent, "Likovni krožek");
  assert.equal(app.elements.activity.value, "Art");
  assert.equal(app.elements.email.value, "first@example.test");
  assert.equal(app.calls.length, 1);

  await app.elements["signup-form"].listeners.submit({ preventDefault() {} });
  await settle();
  assert.match(app.calls[1].url, /\/activities\/Art\/signup/);
  assert.equal(app.elements.message.textContent, "Uspešna prijava: first@example.test — Likovni krožek");
  assert.deepEqual(participantEmails(app.elements["activities-list"].children[1]), [
    "first@example.test",
  ]);

  app.changeLanguage("en");
  assert.equal(app.elements.message.textContent, "Signed up first@example.test for Art");
});

test("translates known signup errors when the language changes", async () => {
  const app = createApp([
    response(activities()),
    response({ detail: "Student already signed up for this activity" }, 409),
  ]);
  await settle();
  app.changeLanguage("sl");
  app.elements.activity.value = "Chess";
  app.elements.email.value = "alex@example.test";
  await app.elements["signup-form"].listeners.submit({ preventDefault() {} });

  assert.match(app.elements.message.textContent, /že prijavljen/);
  app.changeLanguage("en");
  assert.equal(app.elements.message.textContent, "Student already signed up for this activity");
  assert.equal(app.calls.length, 2);
});

test("unregisters the selected participant and refreshes the list and availability", async () => {
  const sample = activities();
  const initial = {
    "Chess & Club": {
      ...sample.Chess,
      participants: ["alex+one@example.test", "sam@example.test"],
    },
    Art: sample.Art,
  };
  const updated = JSON.parse(JSON.stringify(initial));
  updated["Chess & Club"].participants.shift();
  const app = createApp([
    response(initial),
    response({ message: "Unregistered" }),
    response(updated),
  ]);
  await settle();

  app.elements.activity.value = "Art";
  app.elements.email.value = "draft@example.test";
  const button = removeButton(participantItems(app.elements["activities-list"].children[0])[0]);
  await button.listeners.click();

  assert.equal(app.calls[1].url, "/activities/Chess%20%26%20Club/signup?email=alex%2Bone%40example.test");
  assert.equal(app.calls[1].options.method, "DELETE");
  assert.equal(app.calls[2].url, "/activities");
  const chess = app.elements["activities-list"].children[0];
  assert.deepEqual(participantEmails(chess), ["sam@example.test"]);
  assert.match(participants(chess).innerHTML, /participants-count">1/);
  assert.match(chess.innerHTML, /3 spots left/);
  assert.match(participantFeedback(chess).textContent, /alex\+one@example\.test/);
  assert.equal(app.elements.activity.value, "Art");
  assert.equal(app.elements.email.value, "draft@example.test");
});

test("prevents duplicate removals during a language change and displays a translated error", async () => {
  let finishRemoval;
  const removal = new Promise((resolve) => { finishRemoval = resolve; });
  const app = createApp([response(activities()), removal]);
  await settle();

  const button = removeButton(participantItems(app.elements["activities-list"].children[0])[0]);
  const pending = button.listeners.click();
  assert.equal(button.disabled, true);

  app.changeLanguage("sl");
  const translatedButton = removeButton(participantItems(app.elements["activities-list"].children[0])[0]);
  assert.equal(translatedButton.disabled, true);
  assert.match(translatedButton.attributes["aria-label"], /Odjavi alex@example\.test/);
  await translatedButton.listeners.click();
  assert.equal(app.calls.length, 2);

  finishRemoval(response({ detail: "Student not signed up for this activity" }, 404));
  await pending;
  const chess = app.elements["activities-list"].children[0];
  assert.equal(removeButton(participantItems(chess)[0]).disabled, false);
  assert.equal(participantItems(chess).length, 2);
  assert.match(participantFeedback(chess).textContent, /ni prijavljen/);
  assert.equal(participantFeedback(chess).attributes.role, "alert");

  app.changeLanguage("en");
  assert.equal(
    participantFeedback(app.elements["activities-list"].children[0]).textContent,
    "Student not signed up for this activity"
  );
});

test("keeps the participant and reports a network failure when unregistering fails", async () => {
  let failRemoval;
  const removal = new Promise((resolve, reject) => { failRemoval = reject; });
  const app = createApp([response(activities()), removal]);
  await settle();

  const button = removeButton(participantItems(app.elements["activities-list"].children[0])[0]);
  const pending = button.listeners.click();
  failRemoval(new Error("Network unavailable"));
  await pending;

  const chess = app.elements["activities-list"].children[0];
  assert.equal(participantItems(chess).length, 2);
  assert.equal(removeButton(participantItems(chess)[0]).disabled, false);
  assert.match(participantFeedback(chess).textContent, /Failed to unregister/);
  assert.equal(app.errors.length, 1);
});

test("treats translated activity content as text", async () => {
  const data = activities();
  data.Art.translations.sl.name = '<img src=x onerror="alert(1)">';
  data.Art.translations.sl.description = "<b>Not markup</b>";
  const app = createApp([response(data)]);
  await settle();
  app.changeLanguage("sl");

  const card = app.elements["activities-list"].children[1];
  assert.match(card.innerHTML, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
  assert.match(card.innerHTML, /&lt;b&gt;Not markup&lt;\/b&gt;/);
  assert.equal(app.elements.activity.children[2].textContent, data.Art.translations.sl.name);
});

test("localizes form validation and updates it when the language changes", async () => {
  const app = createApp([response(activities())]);
  await settle();
  const email = app.elements.email;

  email.validity.valueMissing = true;
  email.listeners.invalid();
  assert.equal(email.validationMessage, "Enter your student email.");
  app.changeLanguage("sl");
  assert.equal(email.validationMessage, "Vnesi šolski e-poštni naslov.");

  email.validity.valueMissing = false;
  email.validity.typeMismatch = true;
  email.listeners.input();
  email.listeners.invalid();
  assert.equal(email.validationMessage, "Vnesi veljaven e-poštni naslov.");

  app.elements.activity.validity.valueMissing = true;
  app.elements.activity.listeners.invalid();
  assert.equal(app.elements.activity.validationMessage, "Izberi dejavnost.");
});

test("reports a failed refresh instead of treating an error response as activities", async () => {
  const app = createApp([
    response(activities()),
    response({ message: "Signed up" }),
    response({ detail: "Unavailable" }, 503),
  ]);
  await settle();

  app.elements.activity.value = "Art";
  app.elements.email.value = "new@example.test";
  await app.elements["signup-form"].listeners.submit({ preventDefault() {} });
  await settle();

  assert.match(app.elements["activities-list"].innerHTML, /Failed to load activities/);
  assert.equal(app.elements.message.textContent, "Signed up");
  assert.equal(app.errors.length, 1);

  app.changeLanguage("sl");
  assert.match(app.elements["activities-list"].innerHTML, /ni bilo mogoče naložiti/);
  assert.equal(app.elements["activities-list"].children.length, 0);
});
