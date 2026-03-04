import "./styles.css";

const FORM_ENDPOINT = "https://formspree.io/f/mqedozga";
const DEMO_PREVIEW_COUNT = 1;
const CONTACT_FOLLOW_CTA = {
  instagram: {
    label: "Make sure to follow to recieve messages",
    href: "https://www.instagram.com/talangrayva"
  },
  discord: {
    label: "Make sure to add me to recieve messages",
    href: "https://discord.com/users/880863432247771167"
  }
};
const CONTACT_FIELD_CONFIG = {
  email: {
    label: "Email",
    type: "email",
    autocomplete: "email",
    placeholder: "you@example.com",
    inputmode: "email"
  },
  phone: {
    label: "Phone Number",
    type: "tel",
    autocomplete: "tel",
    placeholder: "(555) 123-4567",
    inputmode: "tel"
  },
  instagram: {
    label: "Instagram Username",
    type: "text",
    autocomplete: "off",
    placeholder: "@yourusername",
    inputmode: "text"
  },
  discord: {
    label: "Discord Username",
    type: "text",
    autocomplete: "off",
    placeholder: "username",
    inputmode: "text"
  }
};
const allPlayers = new Set();
const playersByRoot = new Map();

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${mins}:${secs}`;
}

function pauseOtherPlayers(currentAudio) {
  for (const player of allPlayers) {
    if (player.audio !== currentAudio) {
      stopPlayer(player);
    }
  }
}

function stopPlayer(player) {
  player.audio.pause();
  player.audio.currentTime = 0;
  player.root.dataset.playing = "false";
  player.updateProgress();
}

function initAudioPlayers() {
  const playerRoots = document.querySelectorAll("[data-player]");

  playerRoots.forEach((root) => {
    const audio = root.querySelector("audio");
    const toggleBtn = root.querySelector('[data-action="toggle"]');
    const timeline = root.querySelector("[data-timeline]");
    const progress = root.querySelector("[data-progress]");

    if (!audio || !toggleBtn || !timeline || !progress) {
      return;
    }

    root.dataset.playing = "false";
    progress.style.width = "0%";

    const updateProgress = () => {
      const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
      const current = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
      const ratio = duration ? current / duration : 0;
      const clampedRatio = Math.max(0, Math.min(ratio, 1));
      const percent = clampedRatio * 100;

      progress.style.width = `${percent}%`;
      timeline.setAttribute("aria-valuenow", String(Math.round(percent)));
      timeline.setAttribute("aria-valuetext", `${formatTime(current)} of ${formatTime(duration)}`);
    };

    toggleBtn.addEventListener("click", async () => {
      if (!audio.paused) {
        audio.pause();
        audio.currentTime = 0;
        updateProgress();
        return;
      }

      try {
        pauseOtherPlayers(audio);
        await audio.play();
      } catch {
        // Browser blocked play or audio failed to load.
        root.dataset.playing = String(!audio.paused);
      }
    });

    audio.addEventListener("loadedmetadata", updateProgress);
    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("play", () => {
      root.dataset.playing = "true";
    });
    audio.addEventListener("pause", () => {
      root.dataset.playing = "false";
    });
    audio.addEventListener("ended", () => {
      root.dataset.playing = "false";
      audio.currentTime = 0;
      updateProgress();
    });
    audio.addEventListener("error", () => {
      const currentAttrSrc = audio.getAttribute("src") || "";

      if (
        !root.dataset.srcFallbackTried &&
        currentAttrSrc &&
        !currentAttrSrc.startsWith("/") &&
        !/^(https?:|data:|blob:)/i.test(currentAttrSrc)
      ) {
        root.dataset.srcFallbackTried = "true";
        audio.setAttribute("src", `/${currentAttrSrc.replace(/^\/+/, "")}`);
        audio.load();
        return;
      }

      progress.style.width = "0%";
      timeline.setAttribute("aria-valuenow", "0");
      timeline.setAttribute("aria-valuetext", "Audio unavailable");
      toggleBtn.disabled = true;
      toggleBtn.setAttribute("aria-label", "Audio unavailable");
    });

    updateProgress();
    const player = { root, audio, updateProgress };
    allPlayers.add(player);
    playersByRoot.set(root, player);
  });
}

function setDemoGroupExpanded(group, items, toggleBtn, expanded) {
  group.dataset.expanded = String(expanded);

  items.forEach((item, index) => {
    const shouldHide = !expanded && index >= DEMO_PREVIEW_COUNT;
    item.hidden = shouldHide;

    if (!shouldHide) return;

    const nestedPlayers = item.querySelectorAll("[data-player]");
    nestedPlayers.forEach((playerRoot) => {
      const player = playersByRoot.get(playerRoot);
      if (player) stopPlayer(player);
    });
  });

  toggleBtn.textContent = expanded ? "Show less" : "Show more";
  toggleBtn.setAttribute("aria-expanded", String(expanded));
}

function initDemoGroupToggles() {
  const groups = document.querySelectorAll(".demo-group");
  let generatedIdCounter = 0;

  groups.forEach((group) => {
    const itemsList = group.querySelector(".demo-group__items");
    if (!(itemsList instanceof HTMLUListElement)) return;

    const items = Array.from(itemsList.querySelectorAll(":scope > .demo-item"));
    if (items.length <= DEMO_PREVIEW_COUNT) return;

    if (!itemsList.id) {
      generatedIdCounter += 1;
      itemsList.id = `demo-group-items-${generatedIdCounter}`;
    }

    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.className = "demo-group__toggle";
    toggleBtn.setAttribute("aria-controls", itemsList.id);

    setDemoGroupExpanded(group, items, toggleBtn, false);

    toggleBtn.addEventListener("click", () => {
      const isExpanded = group.dataset.expanded === "true";
      setDemoGroupExpanded(group, items, toggleBtn, !isExpanded);
    });

    group.append(toggleBtn);
  });
}

function initRevealAnimations() {
  const nodes = document.querySelectorAll("[data-reveal]");
  if (!nodes.length) return;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    nodes.forEach((node) => node.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries, obs) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        }
      }
    },
    {
      threshold: 0.12,
      rootMargin: "0px 0px -5% 0px"
    }
  );

  nodes.forEach((node) => observer.observe(node));
}

async function handleContactSubmit(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const submitButton = form.querySelector("[data-submit-button]");
  const status = form.querySelector("[data-form-status]");

  if (!(form instanceof HTMLFormElement) || !(submitButton instanceof HTMLButtonElement)) return;

  if (!form.reportValidity()) return;

  const formData = new FormData(form);
  const contactMethodRaw = String(formData.get("contactMethod") || "email").toLowerCase();
  const contactMethod = CONTACT_FIELD_CONFIG[contactMethodRaw] ? contactMethodRaw : "email";
  const contactValue = String(formData.get("contactValue") || "").trim();
  const payload = {
    contactMethod,
    contactValue,
    email: contactMethod === "email" ? contactValue : "",
    phone: contactMethod === "phone" ? contactValue : "",
    instagram: contactMethod === "instagram" ? contactValue : "",
    discord: contactMethod === "discord" ? contactValue : "",
    projectType: String(formData.get("projectType") || ""),
    estimatedBudget: String(formData.get("estimatedBudget") || ""),
    message: String(formData.get("message") || ""),
    _gotcha: String(formData.get("_gotcha") || ""),
    _subject: String(formData.get("_subject") || "")
  };

  submitButton.disabled = true;
  submitButton.textContent = "Sending...";
  if (status) {
    status.textContent = "";
    status.dataset.state = "";
  }

  try {
    const response = await fetch(FORM_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      let message = "Something went wrong. Try again.";
      try {
        const data = await response.json();
        message =
          data?.errors?.[0]?.message || data?.error || data?.message || "Something went wrong. Try again.";
      } catch {
        // Ignore JSON parse failures.
      }
      throw new Error(message);
    }

    form.reset();
    if (status) {
      status.textContent = "Sent. I\u2019ll get back to you by the platform you provided.";
      status.dataset.state = "success";
    }
    syncContactField(form);
  } catch (error) {
    if (status) {
      status.textContent = error instanceof Error ? error.message : "Something went wrong. Try again.";
      status.dataset.state = "error";
    }
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Send";
  }
}

function initContactForm() {
  const form = document.querySelector("[data-contact-form]");
  if (!(form instanceof HTMLFormElement)) return;

  const contactMethod = form.querySelector("[data-contact-method]");
  const contactButtons = form.querySelectorAll("[data-contact-choice]");
  contactButtons.forEach((button) => {
    if (!(button instanceof HTMLButtonElement)) return;
    button.addEventListener("click", () => {
      const selectedMethod = button.dataset.contactChoice || "email";
      setContactMethod(form, selectedMethod);
      syncContactField(form);
    });
  });

  if (contactMethod instanceof HTMLInputElement) {
    setContactMethod(form, contactMethod.value || "email");
  } else {
    setContactMethod(form, "email");
  }

  syncContactField(form);
  form.addEventListener("submit", handleContactSubmit);
}

function setContactMethod(form, method) {
  const contactMethod = form.querySelector("[data-contact-method]");
  if (!(contactMethod instanceof HTMLInputElement)) return;

  const selectedMethod = CONTACT_FIELD_CONFIG[method] ? method : "email";
  contactMethod.value = selectedMethod;

  const contactButtons = form.querySelectorAll("[data-contact-choice]");
  contactButtons.forEach((button) => {
    if (!(button instanceof HTMLButtonElement)) return;
    const isActive = button.dataset.contactChoice === selectedMethod;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function syncContactField(form) {
  const contactMethod = form.querySelector("[data-contact-method]");
  const contactInput = form.querySelector("[data-contact-input]");
  const contactLabel = form.querySelector("[data-contact-input-label]");
  if (
    !(contactMethod instanceof HTMLInputElement) ||
    !(contactInput instanceof HTMLInputElement) ||
    !(contactLabel instanceof HTMLElement)
  ) {
    return;
  }

  const selectedMethod = CONTACT_FIELD_CONFIG[contactMethod.value] ? contactMethod.value : "email";
  const config = CONTACT_FIELD_CONFIG[selectedMethod];
  setContactMethod(form, selectedMethod);

  contactLabel.textContent = config.label;
  contactInput.type = config.type;
  contactInput.autocomplete = config.autocomplete;
  contactInput.placeholder = config.placeholder;
  contactInput.setAttribute("inputmode", config.inputmode);
  syncContactFollowCta(form, selectedMethod);
}

function syncContactFollowCta(form, method) {
  const followCta = form.querySelector("[data-contact-follow-cta]");
  if (!(followCta instanceof HTMLAnchorElement)) return;

  const ctaConfig = CONTACT_FOLLOW_CTA[method];
  if (!ctaConfig) {
    followCta.hidden = true;
    followCta.textContent = "";
    followCta.removeAttribute("href");
    return;
  }

  followCta.textContent = ctaConfig.label;
  followCta.href = ctaConfig.href;
  followCta.hidden = false;
}

function initFooterYear() {
  const yearNode = document.querySelector("[data-year]");
  if (yearNode) yearNode.textContent = String(new Date().getFullYear());
}

initRevealAnimations();
initAudioPlayers();
initDemoGroupToggles();
initContactForm();
initFooterYear();
