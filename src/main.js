import "./styles.css";

const FORM_ENDPOINT = "https://formspree.io/f/mqedozga";
const allPlayers = new Set();

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
      player.audio.pause();
      player.audio.currentTime = 0;
      player.root.dataset.playing = "false";
      player.updateProgress();
    }
  }
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

    const configuredSrc = audio.getAttribute("src") || "";
    const normalizedSrc = configuredSrc.replace(/^\/+/, "");
    if (configuredSrc && configuredSrc !== normalizedSrc) {
      audio.setAttribute("src", normalizedSrc);
      audio.load();
    }

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

      if (!root.dataset.srcFallbackTried && currentAttrSrc && !currentAttrSrc.startsWith("/")) {
        root.dataset.srcFallbackTried = "true";
        audio.setAttribute("src", `/${currentAttrSrc}`);
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
    allPlayers.add({ root, audio, updateProgress });
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
  const payload = {
    email: String(formData.get("email") || ""),
    projectType: String(formData.get("projectType") || ""),
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
      status.textContent = "Sent. I\u2019ll get back to you by email.";
      status.dataset.state = "success";
    }
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
  form.addEventListener("submit", handleContactSubmit);
}

function initFooterYear() {
  const yearNode = document.querySelector("[data-year]");
  if (yearNode) yearNode.textContent = String(new Date().getFullYear());
}

initRevealAnimations();
initAudioPlayers();
initContactForm();
initFooterYear();
