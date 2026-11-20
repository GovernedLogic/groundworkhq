"use strict";

(() => {
  const ACCESS_CODE_SHA256 = "b5a9ede9a93528be3e12c5665c179c2dc0e2648aa6f1b1650f3715e56dad8bec";
  const FILM_SOURCE = "assets/main.mp4#t=0.001";

  const body = document.body;
  const entrance = document.getElementById("entrance");
  const logo = document.getElementById("logo-film");
  const logoSound = document.getElementById("logo-sound");
  const entryChoice = document.getElementById("entry-choice");
  const access = document.getElementById("access");
  const accessForm = document.getElementById("access-form");
  const accessInput = document.getElementById("access-code");
  const accessError = document.getElementById("access-error");
  const presentation = document.getElementById("presentation");
  const player = document.getElementById("player");
  const film = document.getElementById("film");
  const primaryAction = document.getElementById("primary-action");
  const primaryLabel = document.getElementById("primary-label");
  const playToggle = document.getElementById("play-toggle");
  const playSymbol = document.getElementById("play-symbol");
  const progress = document.getElementById("progress");
  const time = document.getElementById("time");
  const muteToggle = document.getElementById("mute-toggle");
  const volumeSymbol = document.getElementById("volume-symbol");
  const volume = document.getElementById("volume");
  const fullscreenToggle = document.getElementById("fullscreen-toggle");
  const playerStatus = document.getElementById("player-status");
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  let logoFinished = false;
  let filmAttached = false;
  let filmStarted = false;
  let idleTimer = 0;

  async function sha256hex(value) {
    const bytes = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
  }

  function finishLogo() {
    if (logoFinished) return;
    logoFinished = true;
    logo.pause();
    if (Number.isFinite(logo.duration) && logo.duration > .2) {
      try { logo.currentTime = Math.max(0, logo.duration - .08); } catch { /* keep current frame */ }
    }
    logoSound.hidden = true;
    body.dataset.state = "ready";
    entryChoice.hidden = false;
  }

  async function playLogo(withSound) {
    logo.muted = !withSound;
    logo.volume = 1;
    try {
      await logo.play();
      logoSound.hidden = !logo.muted;
      logoSound.textContent = "Sound on";
    } catch {
      if (withSound) return playLogo(false);
      logoSound.hidden = false;
      logoSound.textContent = "Play logo";
    }
  }

  logo.addEventListener("ended", finishLogo);
  logo.addEventListener("timeupdate", () => {
    if (Number.isFinite(logo.duration) && logo.currentTime >= logo.duration - .14) finishLogo();
  });
  logo.addEventListener("error", finishLogo);
  logoSound.addEventListener("click", () => {
    logo.muted = false;
    logo.play().catch(() => {});
    logoSound.hidden = true;
  });

  entryChoice.addEventListener("click", () => {
    entryChoice.hidden = true;
    access.hidden = false;
    body.dataset.state = "access";
    requestAnimationFrame(() => accessInput.focus({ preventScroll: true }));
  });

  accessForm.addEventListener("submit", async event => {
    event.preventDefault();
    accessError.hidden = true;
    access.classList.remove("is-error");
    const hash = await sha256hex(accessInput.value);
    if (hash !== ACCESS_CODE_SHA256) {
      accessError.hidden = false;
      accessInput.value = "";
      access.classList.add("is-error");
      accessInput.focus();
      return;
    }
    enterPresentation(true);
  });

  function attachFilm() {
    if (filmAttached) return;
    filmAttached = true;
    film.src = FILM_SOURCE;
    film.playbackRate = 1;
    film.defaultPlaybackRate = 1;
    film.load();
  }

  async function enterPresentation(tryAutoplay) {
    attachFilm();
    access.hidden = true;
    presentation.hidden = false;
    body.dataset.state = "presenting";
    entrance.setAttribute("aria-hidden", "true");
    film.muted = false;
    film.volume = 1;
    film.playbackRate = 1;
    setPrimary("begin");
    if (tryAutoplay) await playFilm();
  }

  async function playFilm() {
    attachFilm();
    if (film.ended) film.currentTime = 0;
    film.muted = false;
    film.playbackRate = 1;
    try { await film.play(); }
    catch { setPrimary(filmStarted ? "resume" : "begin"); }
  }

  function setPrimary(mode) {
    player.classList.toggle("is-ended", mode === "replay");
    if (mode === "hidden") {
      primaryAction.hidden = true;
      return;
    }
    primaryAction.hidden = false;
    const label = mode === "replay" ? "Replay presentation" : mode === "resume" ? "Resume presentation" : "Begin presentation";
    primaryLabel.textContent = label;
    primaryAction.setAttribute("aria-label", label);
  }

  function togglePlayback() {
    if (film.paused || film.ended) playFilm();
    else film.pause();
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const whole = Math.floor(seconds);
    return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
  }

  function updateProgress() {
    const duration = Number.isFinite(film.duration) ? film.duration : 0;
    const ratio = duration ? film.currentTime / duration : 0;
    progress.value = String(Math.round(ratio * 1000));
    progress.style.setProperty("--filled", `${ratio * 100}%`);
    time.value = `${formatTime(film.currentTime)} / ${duration ? formatTime(duration) : "4:59"}`;
  }

  function updateVolume() {
    const level = film.muted ? 0 : film.volume;
    volume.value = String(level);
    volume.style.setProperty("--filled", `${level * 100}%`);
    volumeSymbol.textContent = level === 0 ? "OFF" : "VOL";
    muteToggle.setAttribute("aria-label", level === 0 ? "Unmute presentation" : "Mute presentation");
  }

  function wakeControls() {
    player.classList.remove("is-idle");
    clearTimeout(idleTimer);
    if (!film.paused) idleTimer = setTimeout(() => player.classList.add("is-idle"), 2600);
  }

  primaryAction.addEventListener("click", playFilm);
  playToggle.addEventListener("click", togglePlayback);
  film.addEventListener("click", togglePlayback);
  player.addEventListener("pointermove", wakeControls);
  player.addEventListener("pointerdown", wakeControls);

  film.addEventListener("play", () => {
    filmStarted = true;
    film.playbackRate = 1;
    player.classList.remove("is-paused", "is-ended");
    playSymbol.dataset.icon = "pause";
    playToggle.setAttribute("aria-label", "Pause presentation");
    setPrimary("hidden");
    playerStatus.textContent = "Presentation playing";
    wakeControls();
  });

  film.addEventListener("pause", () => {
    if (film.ended) return;
    player.classList.add("is-paused");
    player.classList.remove("is-idle");
    playSymbol.dataset.icon = "play";
    playToggle.setAttribute("aria-label", "Resume presentation");
    setPrimary(filmStarted ? "resume" : "begin");
    playerStatus.textContent = "Presentation paused";
  });

  film.addEventListener("ended", () => {
    player.classList.add("is-ended", "is-paused");
    player.classList.remove("is-idle");
    playSymbol.dataset.icon = "replay";
    playToggle.setAttribute("aria-label", "Replay presentation");
    setPrimary("replay");
    updateProgress();
    playerStatus.textContent = "Presentation complete";
  });

  film.addEventListener("loadedmetadata", updateProgress);
  film.addEventListener("durationchange", updateProgress);
  film.addEventListener("timeupdate", updateProgress);
  film.addEventListener("volumechange", updateVolume);

  progress.addEventListener("input", () => {
    if (!Number.isFinite(film.duration)) return;
    film.currentTime = film.duration * (Number(progress.value) / 1000);
    updateProgress();
  });

  muteToggle.addEventListener("click", () => {
    film.muted = !film.muted;
    updateVolume();
  });

  volume.addEventListener("input", () => {
    film.volume = Number(volume.value);
    film.muted = film.volume === 0;
    updateVolume();
  });

  fullscreenToggle.addEventListener("click", async () => {
    try {
      if (!document.fullscreenElement) await player.requestFullscreen();
      else await document.exitFullscreen();
    } catch { /* browser or device may not expose fullscreen */ }
  });

  document.addEventListener("fullscreenchange", () => {
    fullscreenToggle.setAttribute("aria-label", document.fullscreenElement ? "Exit fullscreen" : "Enter fullscreen");
  });

  document.addEventListener("keydown", event => {
    if (body.dataset.state !== "presenting" || /INPUT|BUTTON/.test(document.activeElement?.tagName || "")) return;
    const key = event.key.toLowerCase();
    if (key === " " || key === "k") { event.preventDefault(); togglePlayback(); }
    else if (key === "arrowleft") film.currentTime = Math.max(0, film.currentTime - 10);
    else if (key === "arrowright") film.currentTime = Math.min(film.duration || Infinity, film.currentTime + 10);
    else if (key === "m") { film.muted = !film.muted; updateVolume(); }
    else if (key === "f") fullscreenToggle.click();
    wakeControls();
  });

  updateVolume();
  if (reduceMotion) {
    logo.addEventListener("loadedmetadata", finishLogo, { once: true });
    setTimeout(finishLogo, 900);
  } else {
    playLogo(true);
    setTimeout(finishLogo, 14000);
  }
})();
