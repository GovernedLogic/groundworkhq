// Groundwork Release 1 — DreamHome dashboard.
// Renders from dreamhomedata.txt.
"use strict";

// Labels verbatim from the signed DreamHome agreement ("Paul leads" / "DreamHome receives").
const GROUPS = {
  a: { prefix: "A", list: "gauges-a", labels: [
    "Mercury + causal-result discovery",
    "Requirements, rules + working product",
    "Technical direction + implementation",
    "Testing, demos + measurement",
    "Risks, blockers + ownership questions"
  ]},
  d: { prefix: "D", list: "gauges-d", labels: [
    "Working Springfield lead-generation POC",
    "Clear picture of what drives results",
    "Baseline + simple measurements",
    "Tested and demonstrated product",
    "Enough documentation to maintain/improve"
  ]}
};
const BLOCKS = 10;
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const VIEW_KEY = "groundwork-view";
const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
const hasText = (v) => v !== undefined && v !== null && String(v).trim() !== "";
const wholeNum = (v) => hasText(v) && /^(?:0|[1-9]\d*)$/.test(String(v).trim());

// Format: see dreamhomedata.txt header.
function parse(text) {
  const gauges = {}, notes = [];
  let asOf = null, cur = null;
  let mqlTarget = null;
  const mqlSources = [];
  let currentMql = null;
  const calls = [];
  let currentCall = null;
  for (const line of text.split(/\r?\n/)) {
    const h = line.match(/^##\s+(\d{4}-\d{2}-\d{2})\s*$/);
    if (h) {
      currentMql = null;
      currentCall = null;
      cur = { date: h[1], lines: [] };
      notes.push(cur);
      continue;
    }
    if (/^#(\s|$)/.test(line)) continue;
    if (!cur) {
      const a = line.match(/^as-of:\s*(\d{4}-\d{2}-\d{2})\s*$/i);
      if (a) { asOf = a[1]; continue; }
      const m = line.match(/^gauge:\s*(.+?)\s*=\s*(.*?)\s*$/);
      if (m) { gauges[m[1]] = m[2]; continue; }

      const mt = line.match(/^mql-target:\s*(.*?)\s*$/i);
      if (mt) { mqlTarget = mt[1]; continue; }
      const mn = line.match(/^mql-name:\s*(.*?)\s*$/i);
      if (mn) {
        currentMql = { name: mn[1], count: undefined, asOf: undefined, source: undefined, rationale: undefined };
        mqlSources.push(currentMql);
        currentCall = null;
        continue;
      }
      const mk = line.match(/^mql-(count|as-of|source|rationale):\s*(.*?)\s*$/i);
      if (mk) {
        if (!currentMql) {
          currentMql = { name: undefined, count: undefined, asOf: undefined, source: undefined, rationale: undefined };
          mqlSources.push(currentMql);
        }
        const field = mk[1].toLowerCase();
        if (field === "count") currentMql.count = mk[2];
        else if (field === "as-of") currentMql.asOf = mk[2];
        else if (field === "source") currentMql.source = mk[2];
        else if (field === "rationale") currentMql.rationale = mk[2];
        continue;
      }

      const cid = line.match(/^call-id:\s*(.*?)\s*$/i);
      if (cid) {
        currentCall = { id: cid[1], asOf: undefined, source: undefined, rationale: undefined };
        calls.push(currentCall);
        currentMql = null;
        continue;
      }
      const ck = line.match(/^call-(as-of|source|rationale):\s*(.*?)\s*$/i);
      if (ck) {
        if (!currentCall) {
          currentCall = { id: undefined, asOf: undefined, source: undefined, rationale: undefined };
          calls.push(currentCall);
        }
        const field = ck[1].toLowerCase();
        if (field === "as-of") currentCall.asOf = ck[2];
        else if (field === "source") currentCall.source = ck[2];
        else if (field === "rationale") currentCall.rationale = ck[2];
        continue;
      }
      // Ignore any other call-* key so names, phone numbers, recordings and content never render.
      if (/^call-[\w-]+:/i.test(line)) continue;
    } else cur.lines.push(line);
  }
  notes.forEach((n) => (n.text = n.lines.join("\n").replace(/^\s*\n|\s+$/g, "")));
  return {
    asOf,
    gauges,
    notes: notes.filter((n) => n.text.trim()).sort((x, y) => y.date.localeCompare(x.date)),
    mqlTarget,
    mqlSources,
    calls
  };
}

function fmtDate(iso) {
  const m = iso && iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m || +m[2] < 1 || +m[2] > 12) return null;
  return `${MONTHS[+m[2] - 1]} ${+m[3]}, ${m[1]}`;
}

function addMeta(dl, label, value) {
  const row = el("div", "meta-row");
  row.append(el("dt", "", label), el("dd", "", value));
  dl.append(row);
}

function gauge(prefix, i, label, raw) {
  const li = el("li", "gauge");
  const head = el("div", "gauge__head");
  head.append(el("span", "gauge__id", `${prefix}${i + 1}`), el("span", "gauge__label", label));
  li.append(head);
  const ok = raw !== undefined && /^(10|[0-9])$/.test(raw);
  if (!ok) {
    const trackNa = el("div", "track track--na");
    trackNa.setAttribute("role", "img");
    trackNa.setAttribute("aria-label", `${label}: Not available`);
    trackNa.append(el("span", "track__na", "Not available"));
    li.append(trackNa); li.classList.add("is-na");
    return li;
  }
  const n = +raw;
  const track = el("div", "track");
  track.setAttribute("role", "img");
  track.setAttribute("aria-label", `${label}: ${n} of ${BLOCKS} blocks`);
  for (let b = 0; b < BLOCKS; b++) {
    const s = el("span", "seg" + (b < n ? " seg--on" : ""));
    s.style.setProperty("--i", b);
    s.setAttribute("aria-hidden", "true");
    track.append(s);
  }
  li.append(track);
  return li;
}

function renderMql(d) {
  const targetEl = $("mql-target");
  const tiles = $("mql-tiles");
  if (!targetEl || !tiles) return;
  tiles.textContent = "";
  if (d && wholeNum(d.mqlTarget)) targetEl.textContent = String(d.mqlTarget).trim();
  else targetEl.textContent = "Not available";

  const sources = (d && d.mqlSources) || [];
  if (!sources.length) {
    const tile = el("article", "mql-tile mql-tile--empty");
    tile.append(el("p", "mql-tile__await", "Awaiting data, as of 2026-11-10"));
    const dl = el("dl", "mql-tile__meta");
    addMeta(dl, "Source", "Not available");
    addMeta(dl, "Rationale", "Not available");
    tile.append(dl);
    tiles.append(tile);
    return;
  }
  for (const src of sources) {
    const tile = el("article", "mql-tile");
    tile.append(el("h3", "mql-tile__name", hasText(src.name) ? String(src.name).trim() : "Not available"));
    const count = el("p", "mql-tile__count" + (wholeNum(src.count) ? "" : " is-na"));
    count.textContent = wholeNum(src.count) ? String(src.count).trim() : "Not available";
    tile.append(count);
    const dl = el("dl", "mql-tile__meta");
    addMeta(dl, "As of", fmtDate(src.asOf) || "Not available");
    addMeta(dl, "Source", hasText(src.source) ? String(src.source).trim() : "Not available");
    addMeta(dl, "Rationale", hasText(src.rationale) ? String(src.rationale).trim() : "Not available");
    tile.append(dl);
    tiles.append(tile);
  }
}

function renderCalls(d) {
  const box = $("calls");
  if (!box) return;
  box.textContent = "";
  const calls = (d && d.calls) || [];
  if (!calls.length) {
    const empty = el("div", "empty");
    empty.append(el("p", "empty__text", d ? "Awaiting data, as of 2026-11-10" : "Not available"));
    box.append(empty);
    return;
  }
  const ul = el("ul", "call-list");
  for (const c of calls) {
    const li = el("li", "call-card");
    li.append(el("p", "call-card__id", hasText(c.id) ? String(c.id).trim() : "Not available"));
    const dl = el("dl", "call-card__meta");
    addMeta(dl, "As of", fmtDate(c.asOf) || "Not available");
    addMeta(dl, "Source", hasText(c.source) ? String(c.source).trim() : "Not available");
    addMeta(dl, "Rationale", hasText(c.rationale) ? String(c.rationale).trim() : "Not available");
    li.append(dl);
    ul.append(li);
  }
  box.append(ul);
}

function render(d, failed) {
  for (const g of Object.values(GROUPS)) {
    const ol = $(g.list); ol.textContent = "";
    g.labels.forEach((l, i) => ol.append(gauge(g.prefix, i, l, d ? d.gauges[l] : undefined)));
  }
  const asof = $("asof"), nice = d && fmtDate(d.asOf);
  if (nice) { asof.textContent = nice; asof.dateTime = d.asOf; }
  else { asof.textContent = "Not available"; asof.classList.add("is-na"); }
  document.querySelector(".asof .pulse").classList.toggle("is-static", !nice); // no date: dot stays still

  const feed = $("notes"); feed.textContent = "";
  if (!d || !d.notes.length) {
    const e = el("div", "empty");
    e.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16v11H8l-4 4z"/></svg>';
    e.append(el("p", "empty__text", failed ? "Not available" : "No notes yet."));
    feed.append(e);
  } else {
    const ol = el("ol", "timeline");
    ol.tabIndex = 0; // scrollable region: reachable by keyboard
    ol.setAttribute("aria-labelledby", "notes-h");
    for (const n of d.notes) {
      const li = el("li", "entry");
      const t = el("time", "entry__date", fmtDate(n.date) || n.date); t.dateTime = n.date;
      li.append(t, el("p", "entry__text", n.text));
      ol.append(li);
    }
    feed.append(ol);
  }
  renderMql(d);
  renderCalls(d);
  // Animate fills after first paint (CSS disables motion under prefers-reduced-motion).
  requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add("is-ready")));
}

function setView(view) {
  const v = view === "paul" ? "paul" : "customer";
  document.body.dataset.view = v;
  try { sessionStorage.setItem(VIEW_KEY, v); } catch (e) { /* storage may be blocked */ }
  const paul = $("view-paul");
  const cust = $("view-customer");
  if (paul && cust) {
    paul.classList.toggle("is-active", v === "paul");
    cust.classList.toggle("is-active", v === "customer");
    paul.setAttribute("aria-pressed", v === "paul" ? "true" : "false");
    cust.setAttribute("aria-pressed", v === "customer" ? "true" : "false");
  }
  const callSec = $("callinfo");
  if (callSec) callSec.hidden = v !== "paul";
}

function initViews() {
  if (!$("view-paul") || !$("view-customer")) return;
  let v = "customer";
  try { v = sessionStorage.getItem(VIEW_KEY) || "customer"; } catch (e) { /* default */ }
  setView(v);
  $("view-paul").addEventListener("click", () => setView("paul"));
  $("view-customer").addEventListener("click", () => setView("customer"));
}

async function load() {
  let d = null, failed = false;
  try { const r = await fetch("dreamhomedata.txt", { cache: "no-store" }); if (r.ok) d = parse(await r.text()); else failed = true; } catch (e) { failed = true; }
  $("load-error").hidden = !failed;
  render(d, failed);
}

function boot() {
  initViews();
  load();
}

if (window.GroundworkGate) window.GroundworkGate.whenUnlocked(boot);
else boot();
