"use strict";

(() => {
  const ACCESS_CODE_SHA256 = "b5a9ede9a93528be3e12c5665c179c2dc0e2648aa6f1b1650f3715e56dad8bec";
  const UNLOCK_KEY = "groundwork-access";
  const FILM_SOURCE = "assets/main.mp4#t=0.001";

  const body = document.body;
  const entrance = document.getElementById("entrance");
  const logo = document.getElementById("logo-film");
  const logoSound = document.getElementById("logo-sound");
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

  function readUnlock() {
    try { return sessionStorage.getItem(UNLOCK_KEY) === ACCESS_CODE_SHA256; }
    catch { return false; }
  }

  function writeUnlock() {
    try { sessionStorage.setItem(UNLOCK_KEY, ACCESS_CODE_SHA256); }
    catch { /* A blocked session store leaves the current visit usable. */ }
  }

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
    if (readUnlock()) enterPresentation(false);
    else {
      body.dataset.state = "access";
      access.hidden = false;
      requestAnimationFrame(() => accessInput.focus({ preventScroll: true }));
    }
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
    writeUnlock();
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

  function startAtmosphere() {
    const canvas = document.getElementById("atmosphere");
    const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, powerPreference: "low-power" });
    if (!gl || reduceMotion) return;

    const vertex = `#version 300 es
      in vec2 p;
      void main(){gl_Position=vec4(p,0.,1.);}`;
    const fragment = `#version 300 es
      precision highp float;
      out vec4 outColor;
      uniform vec2 resolution;
      uniform vec2 pointer;
      uniform float time;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
      float fbm(vec2 p){float v=0.,a=.5;mat2 r=mat2(1.55,1.2,-1.2,1.55);for(int i=0;i<5;i++){v+=a*noise(p);p=r*p;a*=.5;}return v;}
      void main(){
        vec2 uv=(gl_FragCoord.xy-.5*resolution)/min(resolution.x,resolution.y);
        vec2 m=(pointer-.5)*2.;
        float t=time*.095;
        vec2 q=uv+.08*vec2(sin(t+uv.y*3.+m.y),cos(t*.8+uv.x*3.+m.x));
        float n=fbm(q*2.2+vec2(t,-t*.62));
        float radius=length(uv-vec2(m.x*.035,m.y*.025));
        float ring=.018/(abs(radius-(.31+.035*sin(t*2.+atan(uv.y,uv.x)*4.)))+.022);
        float signal=pow(max(0.,cos(atan(uv.y,uv.x)*3.-t*2.+n*2.)),10.);
        vec3 color=vec3(.003,.008,.009);
        color+=vec3(.025,.20,.12)*n*n;
        color+=vec3(.06,.78,.43)*ring*.14;
        color+=vec3(.05,.43,.50)*signal*.07;
        color*=1.-smoothstep(.48,1.05,radius)*.82;
        outColor=vec4(pow(color,vec3(.86)),1.);
      }`;

    function shader(type, source) {
      const item = gl.createShader(type);
      gl.shaderSource(item, source);
      gl.compileShader(item);
      if (!gl.getShaderParameter(item, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(item));
      return item;
    }

    try {
      const program = gl.createProgram();
      gl.attachShader(program, shader(gl.VERTEX_SHADER, vertex));
      gl.attachShader(program, shader(gl.FRAGMENT_SHADER, fragment));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
      gl.useProgram(program);
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,3,-1,-1,3]), gl.STATIC_DRAW);
      const point = gl.getAttribLocation(program, "p");
      gl.enableVertexAttribArray(point);
      gl.vertexAttribPointer(point, 2, gl.FLOAT, false, 0, 0);
      const resolution = gl.getUniformLocation(program, "resolution");
      const pointer = gl.getUniformLocation(program, "pointer");
      const timeUniform = gl.getUniformLocation(program, "time");
      const target = { x: .5, y: .5 };
      const current = { x: .5, y: .5 };

      function resize() {
        const density = Math.min(devicePixelRatio || 1, 1.6);
        canvas.width = Math.round(innerWidth * density);
        canvas.height = Math.round(innerHeight * density);
        gl.viewport(0, 0, canvas.width, canvas.height);
      }

      addEventListener("resize", resize, { passive: true });
      addEventListener("pointermove", event => {
        target.x = event.clientX / innerWidth;
        target.y = 1 - event.clientY / innerHeight;
      }, { passive: true });
      resize();

      function render(now) {
        if (body.dataset.state === "presenting") return;
        current.x += (target.x - current.x) * .035;
        current.y += (target.y - current.y) * .035;
        gl.uniform2f(resolution, canvas.width, canvas.height);
        gl.uniform2f(pointer, current.x, current.y);
        gl.uniform1f(timeUniform, now * .001);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        requestAnimationFrame(render);
      }
      requestAnimationFrame(render);
    } catch {
      canvas.classList.add("is-fallback");
    }
  }

  startAtmosphere();
  updateVolume();
  if (reduceMotion) {
    logo.addEventListener("loadedmetadata", finishLogo, { once: true });
    setTimeout(finishLogo, 900);
  } else {
    playLogo(true);
    setTimeout(finishLogo, 14000);
  }
})();
