(() => {
  const storageKey = "mergington-language";
  const messages = {
    en: {
      pageTitle: "Mergington High School Activities",
      language: "Language",
      skip: "Skip to content",
      schoolLabel: "HIGH SCHOOL",
      studentLife: "STUDENT LIFE",
      darkMode: "Dark mode",
      heroEyebrow: "LIFE OUTSIDE THE CLASSROOM",
      heroLineOne: "Find your people.",
      heroLineTwo: "Find your thing.",
      heroDescription: "Try something new, make connections, and do more of what you love.",
      exploreActivities: "Explore activities",
      signupShortcut: "Ready to sign up?",
      artLineOne: "Make space",
      artLineTwo: "for more.",
      artFooter: "EXPLORE • CONNECT • BELONG",
      activitiesEyebrow: "DISCOVER YOUR COMMUNITY",
      activitiesDescription: "Clubs, classes, and teams for every interest.",
      allActivities: "ALL ACTIVITIES",
      loading: "Loading activities...",
      signupEyebrow: "READY WHEN YOU ARE",
      signupHeading: "Join an activity",
      signupDescription: "Found your thing? Sign up and save your spot.",
      emailLabel: "Student email",
      emailPlaceholder: "you@mergington.edu",
      emailRequired: "Enter your student email.",
      invalidEmail: "Enter a valid email address.",
      activityLabel: "Choose an activity",
      selectActivity: "Select an activity",
      activityRequired: "Choose an activity.",
      signupButton: "Sign up for an activity",
      signupHelp: "You can sign up for more than one activity.",
      footerSchool: "© Mergington High School",
      footerTagline: "Find your people. Find your thing.",
      open: "Open",
      full: "Full",
      schedule: "Schedule",
      availability: "Availability",
      spotsLeft: (count) => `${count} ${count === 1 ? "spot" : "spots"} left`,
      participants: "Participants",
      noParticipants: "No participants yet. Be the first to sign up!",
      removeParticipant: (email, activity) => `Remove ${email} from ${activity}`,
      unregisterSuccess: (email) => `Unregistered ${email}.`,
      unregisterFailed: "Failed to unregister participant. Please try again.",
      notSignedUp: "Student not signed up for this activity",
      loadFailed: "Failed to load activities. Please try again later.",
      signupFailed: "Failed to sign up. Please try again.",
      genericError: "An error occurred",
      alreadySignedUp: "Student already signed up for this activity",
      activityFull: "Activity is full",
      activityNotFound: "Activity not found",
      signupSuccess: (email, activity) => `Signed up ${email} for ${activity}`,
    },
    sl: {
      pageTitle: "Dejavnosti Srednje šole Mergington",
      language: "Jezik",
      skip: "Preskoči na vsebino",
      schoolLabel: "SREDNJA ŠOLA",
      studentLife: "DIJAŠKO ŽIVLJENJE",
      darkMode: "Temni način",
      heroEyebrow: "ŽIVLJENJE ZUNAJ UČILNICE",
      heroLineOne: "Najdi svojo družbo.",
      heroLineTwo: "Odkrij svojo strast.",
      heroDescription: "Preizkusi nekaj novega, spoznaj ljudi in odkrij, kaj te veseli.",
      exploreActivities: "Razišči dejavnosti",
      signupShortcut: "Želiš oddati prijavo?",
      artLineOne: "Več prostora",
      artLineTwo: "za ideje.",
      artFooter: "ODKRIJ • POVEŽI SE • ZAŽIVI",
      activitiesEyebrow: "ODKRIJ SVOJO SKUPNOST",
      activitiesDescription: "Krožki, tečaji in ekipe za različna zanimanja.",
      allActivities: "VSE DEJAVNOSTI",
      loading: "Nalaganje dejavnosti...",
      signupEyebrow: "PRIDRUŽI SE",
      signupHeading: "Pridruži se dejavnosti",
      signupDescription: "Izberi dejavnost, prijavi se in si zagotovi mesto.",
      emailLabel: "Šolski e-poštni naslov",
      emailPlaceholder: "tvoj-email@mergington.edu",
      emailRequired: "Vnesi šolski e-poštni naslov.",
      invalidEmail: "Vnesi veljaven e-poštni naslov.",
      activityLabel: "Izberi dejavnost",
      selectActivity: "Izberi dejavnost",
      activityRequired: "Izberi dejavnost.",
      signupButton: "Prijavi se v dejavnost",
      signupHelp: "Lahko se prijaviš na več dejavnosti.",
      footerSchool: "© Srednja šola Mergington",
      footerTagline: "Najdi svojo družbo. Odkrij svojo strast.",
      open: "Odprto",
      full: "Polno",
      schedule: "Urnik",
      availability: "Razpoložljivost",
      spotsLeft: (count) => {
        const lastTwo = Math.abs(count) % 100;
        if (lastTwo === 1) return `${count} prosto mesto`;
        if (lastTwo === 2) return `${count} prosti mesti`;
        if (lastTwo === 3 || lastTwo === 4) return `${count} prosta mesta`;
        return `${count} prostih mest`;
      },
      participants: "Udeleženci",
      noParticipants: "Ni še prijav. Prijavi se!",
      removeParticipant: (email, activity) => `Odjavi ${email} iz dejavnosti ${activity}`,
      unregisterSuccess: (email) => `Uspešna odjava: ${email}`,
      unregisterFailed: "Odjava ni uspela. Poskusi znova.",
      notSignedUp: "Udeleženec ni prijavljen na to dejavnost",
      loadFailed: "Dejavnosti ni bilo mogoče naložiti. Poskusi znova pozneje.",
      signupFailed: "Prijava ni uspela. Poskusi znova.",
      genericError: "Prišlo je do napake",
      alreadySignedUp: "Ta e-poštni naslov je že prijavljen v to dejavnost",
      activityFull: "Dejavnost je polna",
      activityNotFound: "Dejavnosti ni mogoče najti",
      signupSuccess: (email, activity) => `Uspešna prijava: ${email} — ${activity}`,
    },
  };
  let language = "en";
  let storage;

  try {
    storage = window.localStorage;
    const savedLanguage = storage.getItem(storageKey);
    if (savedLanguage === "en" || savedLanguage === "sl") {
      language = savedLanguage;
    } else if (savedLanguage !== null) {
      console.warn("Ignoring invalid saved language preference:", savedLanguage);
    }
  } catch (error) {
    console.warn("Unable to read the saved language preference:", error);
  }

  function text(key, ...args) {
    const value = messages[language][key];
    if (value === undefined) {
      throw new Error(`Missing ${language} translation: ${key}`);
    }
    return typeof value === "function" ? value(...args) : value;
  }

  function activity(name, details) {
    if (language === "sl") {
      const translated = details.translations && details.translations.sl;
      if (translated && ["name", "description", "schedule"].every(
        (key) => typeof translated[key] === "string" && translated[key].trim()
      )) {
        return translated;
      }
      console.warn("Missing Slovenian translation for activity:", name);
    }
    return { name, description: details.description, schedule: details.schedule };
  }

  function applyLanguage() {
    document.documentElement.lang = language;
    document.title = text("pageTitle");
    document.querySelectorAll("[data-i18n]").forEach((element) => {
      element.textContent = text(element.dataset.i18n);
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
      element.setAttribute("placeholder", text(element.dataset.i18nPlaceholder));
    });
    document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
      element.setAttribute("aria-label", text(element.dataset.i18nAriaLabel));
    });
    document.querySelectorAll("[data-i18n-title]").forEach((element) => {
      element.setAttribute("title", text(element.dataset.i18nTitle));
    });
    document.querySelectorAll("[data-language]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.language === language));
    });
  }

  function setLanguage(nextLanguage, persist) {
    if (nextLanguage !== "en" && nextLanguage !== "sl") {
      console.warn("Ignoring invalid language preference:", nextLanguage);
      return;
    }
    if (nextLanguage === language) {
      return;
    }
    language = nextLanguage;
    applyLanguage();
    if (persist) {
      try {
        window.localStorage.setItem(storageKey, language);
      } catch (error) {
        console.warn("Unable to save the language preference:", error);
      }
    }
    document.dispatchEvent(new CustomEvent("app-language-change"));
  }

  window.i18n = {
    text,
    activity,
    get language() {
      return language;
    },
  };
  document.documentElement.lang = language;

  document.addEventListener("DOMContentLoaded", () => {
    applyLanguage();
    document.querySelectorAll("[data-language]").forEach((button) => {
      button.addEventListener("click", () => setLanguage(button.dataset.language, true));
    });
  });

  window.addEventListener("storage", (event) => {
    if ((event.storageArea && event.storageArea !== storage) || (event.key !== storageKey && event.key !== null)) {
      return;
    }
    if (event.newValue === "en" || event.newValue === "sl" || event.newValue === null) {
      setLanguage(event.newValue || "en", false);
    } else {
      console.warn("Ignoring invalid saved language preference:", event.newValue);
    }
  });
})();
