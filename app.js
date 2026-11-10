// Groundwork Release 1 — DreamHome dashboard.
// Renders from dreamhomedata.txt. Access control is server-side (HTTP Basic Auth in functions/_middleware.js).
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
const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

// Format: see dreamhomedata.txt header.
function parse(text) {
  const gauges = {}, notes = []; let asOf = null, cur = null;
  for (const line of text.split(/\r?\n/)) {
    const h = line.match(/^##\s+(\d{4}-\d{2}-\d{2})\s*$/);
    if (h) { cur = { date: h[1], lines: [] }; notes.push(cur); continue; }
    if (/^#(\s|$)/.test(line)) continue;
    if (!cur) {
      const a = line.match(/^as-of:\s*(\d{4}-\d{2}-\d{2})\s*$/i);
      if (a) { asOf = a[1]; continue; }
      const m = line.match(/^gauge:\s*(.+?)\s*=\s*(.*?)\s*$/);
      if (m) { gauges[m[1]] = m[2]; continue; }
    } else cur.lines.push(line);
  }
  notes.forEach((n) => (n.text = n.lines.join("\n").replace(/^\s*\n|\s+$/g, "")));
  return { asOf, gauges, notes: notes.filter((n) => n.text.trim()).sort((x, y) => y.date.localeCompare(x.date)) };
}

function fmtDate(iso) {
  const m = iso && iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m || +m[2] < 1 || +m[2] > 12) return null;
  return `${MONTHS[+m[2] - 1]} ${+m[3]}, ${m[1]}`;
}

function gauge(prefix, i, label, raw) {
  const li = el("li", "gauge");
  const head = el("div", "gauge__head");
  head.append(el("span", "gauge__id", `${prefix}${i + 1}`), el("span", "gauge__label", label));
  li.append(head);
  const ok = raw !== undefined && /^(10|[0-9])$/.test(raw);
  if (!ok) {
    const na = el("div", "track track--na");
    na.setAttribute("role", "img");
    na.setAttribute("aria-label", `${label}: Not available`);
    na.append(el("span", "track__na", "Not available"));
    li.append(na); li.classList.add("is-na");
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
  // Animate fills after first paint (CSS disables motion under prefers-reduced-motion).
  requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add("is-ready")));
}

async function load() {
  let d = null, failed = false;
  try { const r = await fetch("dreamhomedata.txt", { cache: "no-store" }); if (r.ok) d = parse(await r.text()); else failed = true; } catch (e) { failed = true; }
  $("load-error").hidden = !failed;
  render(d, failed);
}

load();
