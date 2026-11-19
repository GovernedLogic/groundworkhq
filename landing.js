// Landing intro: 1s black, then the logo with sound, then the existing access-code gate
// sits under the finished logo. Does not change gate.js.
(function () {
  var BLACK_MS = 1000;
  var body = document.body;
  var intro = document.getElementById("intro");
  var logo = document.getElementById("logo-film");
  var holdImg = document.getElementById("logo-hold");
  var soundBtn = document.getElementById("logo-sound");
  var app = document.getElementById("app");
  if (!intro || !logo || !body.classList.contains("is-intro")) return;

  var finishing = false;

  function unlocked() {
    return window.GroundworkGate && window.GroundworkGate.isUnlocked();
  }

  function snapshotHold() {
    if (!holdImg || holdImg.getAttribute("data-ready") === "1") return;
    try {
      if (!logo.videoWidth || logo.currentTime < 1) return;
      var c = document.createElement("canvas");
      c.width = logo.videoWidth;
      c.height = logo.videoHeight;
      c.getContext("2d").drawImage(logo, 0, 0);
      holdImg.src = c.toDataURL("image/jpeg", 0.92);
      holdImg.setAttribute("data-ready", "1");
    } catch (e) { /* canvas may be tainted; the video element is kept as fallback */ }
  }

  function showHoldImage() {
    if (holdImg && holdImg.getAttribute("data-ready") === "1") {
      holdImg.hidden = false;
      body.classList.add("is-logo-held");
    }
  }

  function enterApp() {
    body.classList.remove("is-intro", "is-logo-login", "is-logo-playing", "is-logo-held");
    intro.hidden = true;
    try { logo.pause(); } catch (e) {}
    if (typeof window.groundworkTryFilm === "function") window.groundworkTryFilm();
  }

  function enterLogin() {
    body.classList.remove("is-intro", "is-logo-playing", "is-logo-held");
    body.classList.add("is-logo-login");
    try {
      logo.pause();
      if (logo.duration && isFinite(logo.duration)) {
        logo.currentTime = Math.max(0, logo.duration - 0.12);
      }
    } catch (e) {}
    if (holdImg) holdImg.hidden = true;
    if (soundBtn) soundBtn.hidden = true;
    var input = document.getElementById("gate-code");
    if (input) input.focus();
  }

  function finishLogo() {
    if (finishing) return;
    finishing = true;
    try { logo.pause(); } catch (e) {}
    snapshotHold();
    if (unlocked()) enterApp();
    else enterLogin();
  }

  logo.addEventListener("timeupdate", function () {
    if (!finishing && logo.duration && isFinite(logo.duration) && logo.currentTime >= logo.duration - 0.2) {
      snapshotHold();
      finishLogo();
    } else if (logo.currentTime >= 8.0) {
      snapshotHold();
    }
  });

  function setSoundLabel(playingMuted, blocked) {
    if (!soundBtn) return;
    if (blocked) {
      soundBtn.hidden = false;
      soundBtn.textContent = "Tap to play";
      soundBtn.setAttribute("aria-label", "Play the logo with sound");
    } else if (playingMuted) {
      soundBtn.hidden = false;
      soundBtn.textContent = "Sound on";
      soundBtn.setAttribute("aria-label", "Turn the logo sound on");
    } else {
      soundBtn.hidden = true;
    }
  }

  function tryPlay(withSound) {
    logo.muted = !withSound;
    logo.volume = 1;
    body.classList.add("is-logo-playing");
    var play = logo.play();
    if (play && play.then) {
      return play.then(function () {
        setSoundLabel(!!logo.muted, false);
      }).catch(function () {
        if (withSound) return tryPlay(false);
        body.classList.remove("is-logo-playing");
        setSoundLabel(false, true);
      });
    }
  }

  if (soundBtn) {
    soundBtn.addEventListener("click", function () {
      logo.muted = false;
      body.classList.add("is-logo-playing");
      var play = logo.play();
      if (play && play.catch) play.catch(function () {});
      setSoundLabel(false, false);
    });
  }

  logo.addEventListener("ended", finishLogo);

  if (app) {
    new MutationObserver(function () {
      if (!app.hidden) enterApp();
    }).observe(app, { attributes: true, attributeFilter: ["hidden"] });
  }

  setTimeout(function () { tryPlay(true); }, BLACK_MS);
})();
