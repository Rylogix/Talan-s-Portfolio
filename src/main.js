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
      player.root.dataset.playing = "false";
    }
  }
}

function initAudioPlayers() {
  const playerRoots = document.querySelectorAll("[data-player]");

  playerRoots.forEach((root) => {
    const audio = root.querySelector("audio");
    const playBtn = root.querySelector('[data-action="play"]');
    const pauseBtn = root.querySelector('[data-action="pause"]');
    const restartBtn = root.querySelector('[data-action="restart"]');
    const timeline = root.querySelector("[data-timeline]");
    const currentTimeLabel = root.querySelector("[data-current]");
    const durationLabel = root.querySelector("[data-duration]");

    if (
      !audio ||
      !playBtn ||
      !pauseBtn ||
      !restartBtn ||
      !timeline ||
      !currentTimeLabel ||
      !durationLabel
    ) {
      return;
    }

    root.dataset.playing = "false";
    timeline.style.setProperty("--timeline-progress", "0%");

    const updateProgress = () => {
      const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
      const current = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
      const ratio = duration ? current / duration : 0;
      const clampedRatio = Math.max(0, Math.min(ratio, 1));

      timeline.value = duration ? String(Math.round(clampedRatio * 1000)) : "0";
      timeline.style.setProperty("--timeline-progress", `${clampedRatio * 100}%`);
      currentTimeLabel.textContent = formatTime(current);
      durationLabel.textContent = formatTime(duration);
      timeline.setAttribute("aria-valuetext", `${formatTime(current)} of ${formatTime(duration)}`);
    };

    playBtn.addEventListener("click", async () => {
      try {
        pauseOtherPlayers(audio);
        await audio.play();
      } catch {
        // Browser blocked play or audio failed to load.
      } finally {
        root.dataset.playing = String(!audio.paused);
      }
    });

    pauseBtn.addEventListener("click", () => {
      audio.pause();
      root.dataset.playing = "false";
    });

    restartBtn.addEventListener("click", async () => {
      audio.currentTime = 0;
      try {
        pauseOtherPlayers(audio);
        await audio.play();
      } catch {
        root.dataset.playing = String(!audio.paused);
      }
    });

    timeline.addEventListener("input", () => {
      if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
      const ratio = Number(timeline.value) / 1000;
      audio.currentTime = audio.duration * ratio;
      updateProgress();
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
      updateProgress();
    });
    audio.addEventListener("error", () => {
      const note = root.querySelector(".demo-player__note");
      if (note) {
        note.textContent = "Audio file missing. Add your reel file in /public/audio and update the source.";
      }
    });

    updateProgress();
    allPlayers.add({ root, audio });
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
