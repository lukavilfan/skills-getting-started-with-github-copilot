document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const emailInput = document.getElementById("email");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const i18n = window.i18n;
  const signupErrors = new Map([
    ["Student already signed up for this activity", "alreadySignedUp"],
    ["Activity is full", "activityFull"],
    ["Activity not found", "activityNotFound"],
  ]);
  const unregisterErrors = new Map([
    ["Student not signed up for this activity", "notSignedUp"],
    ["Activity not found", "activityNotFound"],
  ]);
  const pendingRemovals = new Map();
  let latestActivitiesRequest = 0;
  let loadedActivities = null;
  let loadFailed = false;
  let feedback = null;
  let participantFeedback = null;

  function localizeValidation(field) {
    field.setCustomValidity("");
    if (field.validity.valueMissing) {
      field.setCustomValidity(i18n.text(field === emailInput ? "emailRequired" : "activityRequired"));
    } else if (field.validity.typeMismatch) {
      field.setCustomValidity(i18n.text("invalidEmail"));
    }
  }

  [emailInput, activitySelect].forEach((field) => {
    field.addEventListener("invalid", () => localizeValidation(field));
    field.addEventListener("input", () => field.setCustomValidity(""));
    field.addEventListener("change", () => field.setCustomValidity(""));
  });

  function escapeHtml(value) {
    const characters = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return String(value).replace(/[&<>"']/g, (character) => characters[character]);
  }

  function renderActivities(activities) {
    activitiesList.innerHTML = "";
    const selectedActivity = activitySelect.value;
    activitySelect.length = 1; // Keep the placeholder.

    Object.entries(activities).forEach(([name, details]) => {
      const localized = i18n.activity(name, details);
      const activityCard = document.createElement("article");
      activityCard.className = "activity-card";
      const spotsLeft = details.max_participants - details.participants.length;

      activityCard.innerHTML = `
        <div class="activity-card-top">
          <span class="activity-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="m12 3 2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" />
            </svg>
          </span>
          <span class="activity-status${spotsLeft <= 0 ? " is-full" : ""}">
            <span class="status-dot"></span>${i18n.text(spotsLeft > 0 ? "open" : "full")}
          </span>
        </div>
        <h3>${escapeHtml(localized.name)}</h3>
        <p class="activity-description">${escapeHtml(localized.description)}</p>
        <div class="activity-meta">
          <p>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="4" y="6" width="16" height="14" rx="2" stroke="currentColor" stroke-width="1.7" />
              <path d="M8 3v5m8-5v5M4 10h16" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
            </svg>
            <span><strong>${i18n.text("schedule")}:</strong> ${escapeHtml(localized.schedule)}</span>
          </p>
          <p>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M16 20v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1m14 0v-1a4 4 0 0 0-2-3.46M14 4.13a4 4 0 0 1 0 7.74M14 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <span><strong>${i18n.text("availability")}:</strong> ${i18n.text("spotsLeft", spotsLeft)}</span>
          </p>
        </div>
      `;

      const participantsSection = document.createElement("div");
      participantsSection.className = "participants-section";
      participantsSection.innerHTML = `
        <h4>${i18n.text("participants")} <span class="participants-count">${details.participants.length}</span></h4>
      `;

      if (details.participants.length > 0) {
        const participantsList = document.createElement("ul");
        participantsList.className = "participants-list";
        details.participants.forEach((participant) => {
          const item = document.createElement("li");
          const participantName = document.createElement("span");
          participantName.className = "participant-email";
          participantName.textContent = participant;

          const removeButton = document.createElement("button");
          const removalKey = JSON.stringify([name, participant]);
          const label = i18n.text("removeParticipant", participant, localized.name);
          removeButton.type = "button";
          removeButton.className = "remove-participant";
          removeButton.setAttribute("aria-label", label);
          removeButton.setAttribute("title", label);
          removeButton.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 3v7m4-7v7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          `;
          if (pendingRemovals.has(removalKey)) {
            removeButton.disabled = true;
            pendingRemovals.set(removalKey, removeButton);
          }
          removeButton.addEventListener("click", () => unregisterParticipant(name, participant, removeButton));
          item.appendChild(participantName);
          item.appendChild(removeButton);
          participantsList.appendChild(item);
        });
        participantsSection.appendChild(participantsList);
      } else {
        const emptyMessage = document.createElement("p");
        emptyMessage.className = "participants-empty";
        emptyMessage.textContent = i18n.text("noParticipants");
        participantsSection.appendChild(emptyMessage);
      }

      if (participantFeedback && participantFeedback.activity === name) {
        const notice = document.createElement("p");
        notice.className = `participant-feedback${participantFeedback.isError ? " is-error" : ""}`;
        notice.setAttribute("role", participantFeedback.isError ? "alert" : "status");
        notice.textContent = participantFeedback.key
          ? i18n.text(participantFeedback.key, participantFeedback.email)
          : participantFeedback.original;
        participantsSection.appendChild(notice);
      }

      activityCard.appendChild(participantsSection);
      activitiesList.appendChild(activityCard);

      const option = document.createElement("option");
      option.value = name;
      option.textContent = localized.name;
      activitySelect.appendChild(option);
    });

    activitySelect.value = selectedActivity;
    if (activitySelect.selectedIndex === -1) {
      activitySelect.value = "";
    }
  }

  function renderLoadError() {
    activitiesList.innerHTML = `<p class="load-error" role="alert">${i18n.text("loadFailed")}</p>`;
  }

  async function fetchActivities() {
    const requestId = ++latestActivitiesRequest;
    try {
      const response = await fetch("/activities");
      if (!response.ok) {
        throw new Error(`Failed to load activities (${response.status})`);
      }
      const activities = await response.json();
      // Keep late responses from overwriting a newer refresh.
      if (requestId !== latestActivitiesRequest) {
        return;
      }
      loadedActivities = activities;
      loadFailed = false;
      renderActivities(activities);
    } catch (error) {
      console.error("Error fetching activities:", error);
      if (requestId === latestActivitiesRequest) {
        loadFailed = true;
        renderLoadError();
      }
    }
  }

  async function unregisterParticipant(activity, email, button) {
    const removalKey = JSON.stringify([activity, email]);
    if (pendingRemovals.has(removalKey)) {
      return;
    }
    pendingRemovals.set(removalKey, button);
    button.disabled = true;
    let needsRender = false;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        participantFeedback = { activity, email, key: "unregisterSuccess", isError: false };
        await fetchActivities();
      } else {
        const result = await response.json();
        const detail = typeof result.detail === "string" ? result.detail : "";
        participantFeedback = detail
          ? { activity, isError: true, key: unregisterErrors.get(detail), original: detail }
          : { activity, isError: true, key: "unregisterFailed" };
        needsRender = true;
      }
    } catch (error) {
      participantFeedback = { activity, isError: true, key: "unregisterFailed" };
      needsRender = true;
      console.error("Error unregistering participant:", error);
    } finally {
      pendingRemovals.get(removalKey).disabled = false;
      pendingRemovals.delete(removalKey);
      if (needsRender && loadedActivities && !loadFailed) {
        renderActivities(loadedActivities);
      }
    }
  }

  function renderFeedback() {
    if (!feedback) {
      return;
    }
    if (feedback.key) {
      messageDiv.textContent = i18n.text(feedback.key);
    } else if (feedback.success && i18n.language === "sl") {
      const name = feedback.details
        ? i18n.activity(feedback.activity, feedback.details).name
        : feedback.activity;
      messageDiv.textContent = i18n.text("signupSuccess", feedback.email, name);
    } else {
      messageDiv.textContent = feedback.original;
    }
  }

  document.addEventListener("app-language-change", () => {
    [emailInput, activitySelect].forEach((field) => {
      if (field.validity.customError) {
        localizeValidation(field);
      }
    });
    if (loadFailed) {
      renderLoadError();
    } else if (loadedActivities) {
      renderActivities(loadedActivities);
    }
    renderFeedback();
  });

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = emailInput.value;
    const activity = activitySelect.value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        feedback = {
          success: true,
          original: result.message,
          email,
          activity,
          details: loadedActivities && loadedActivities[activity],
        };
        messageDiv.className = "message success";
        signupForm.reset();
        fetchActivities();
      } else {
        feedback = result.detail
          ? { key: signupErrors.get(result.detail), original: result.detail }
          : { key: "genericError" };
        messageDiv.className = "message error";
      }

      renderFeedback();
      messageDiv.classList.remove("hidden");

      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      feedback = { key: "signupFailed" };
      messageDiv.className = "message error";
      renderFeedback();
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  fetchActivities();
});
