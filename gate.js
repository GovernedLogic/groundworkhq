// Shared access code gate (R1). One code unlocks every page.
// The code is stored only as a SHA-256 hex digest. The value below is a
// placeholder until Paul supplies the real code. No typed value can match it.
"use strict";

// PLACEHOLDER: replace with the SHA-256 hex digest of Paul's code.
// Generate it with: printf '%s' 'THE_CODE' | sha256sum
const ACCESS_CODE_SHA256 = 'b5a9ede9a93528be3e12c5665c179c2dc0e2648aa6f1b1650f3715e56dad8bec';
const UNLOCK_KEY = "groundwork-access";

async function sha256hex(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function readUnlock() {
  try { return sessionStorage.getItem(UNLOCK_KEY); } catch (e) { return null; }
}

function writeUnlock(hash) {
  try { sessionStorage.setItem(UNLOCK_KEY, hash); } catch (e) { /* storage may be blocked */ }
}

function applyLockState(unlocked) {
  const gate = document.getElementById("gate");
  const app = document.getElementById("app");
  if (gate) gate.hidden = !!unlocked;
  if (app) app.hidden = !unlocked;
}

const pending = [];

window.GroundworkGate = {
  ACCESS_CODE_SHA256,
  isUnlocked() { return readUnlock() === ACCESS_CODE_SHA256; },
  whenUnlocked(fn) {
    if (this.isUnlocked()) fn();
    else pending.push(fn);
  }
};

function reveal() {
  applyLockState(true);
  while (pending.length) pending.shift()();
}

function initGate() {
  const unlocked = window.GroundworkGate.isUnlocked();
  applyLockState(unlocked);
  if (unlocked) reveal();

  const form = document.getElementById("gate-form");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = document.getElementById("gate-code");
    const err = document.getElementById("gate-error");
    const code = input ? input.value : "";
    const hash = await sha256hex(code);
    if (hash === ACCESS_CODE_SHA256) {
      if (err) err.hidden = true;
      writeUnlock(hash);
      reveal();
    } else {
      if (err) err.hidden = false;
      if (input) {
        input.value = "";
        input.focus();
      }
    }
  });
}

initGate();
