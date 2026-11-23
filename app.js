"use strict";
/* ---------- storage ---------- */
const KEY = "gymlog.v1";
const DEFAULTS = { workouts: [], settings: { unit: "kg", restSecs: 90 } };
let db = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw);
      return { workouts: d.workouts || [], settings: { ...DEFAULTS.settings, ...(d.settings || {}) } };
    }
  } catch (e) {}
  return JSON.parse(JSON.stringify(DEFAULTS));
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { toast("⚠️ Could not save (storage full/blocked)"); }
}
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const exById = id => EXERCISES.find(e => e.id === id) || { id, name: id, category: "?", equipment: "" };
const unit = () => db.settings.unit;
const fmtNum = n => (Math.round(n * 100) / 100).toString();
const epley = (w, r) => (r <= 1 ? w : w * (1 + r / 30));
const activeWorkout = () => db.workouts.find(w => !w.end);
const fmtDate = ts => new Date(ts).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
const fmtDur = ms => { const m = Math.round(ms / 60000); return m >= 60 ? Math.floor(m / 60) + "h " + (m % 60) + "m" : m + " min"; };
const fmtSet = s => fmtNum(s.weight) + "×" + s.reps;

let toastTimer;
function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.classList.remove("hidden");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.add("hidden"), 2600);
}

/* Last finished-or-earlier session sets for an exercise (excluding current workout). */
function lastSessionSets(exId, excludeWorkoutId) {
  const ws = db.workouts.filter(w => w.id !== excludeWorkoutId).sort((a, b) => b.start - a.start);
  for (const w of ws) {
    const ex = w.exercises.find(e => e.exerciseId === exId);
    if (ex && ex.sets.length) return { sets: ex.sets, start: w.start };
  }
  return null;
}

/* Set ids that beat every earlier set (by timestamp) on weight or est. 1RM. */
function prMap() {
  const all = {};
  for (const w of db.workouts) for (const e of w.exercises) for (const s of e.sets)
    (all[e.exerciseId] = all[e.exerciseId] || []).push(s);
  const out = {};
  for (const id in all) {
    const sets = all[id].slice().sort((a, b) => a.ts - b.ts);
    let maxW = 0, maxE = 0;
    sets.forEach((s, i) => {
      const e1 = epley(s.weight, s.reps);
      if (i > 0 && s.weight > 0 && (s.weight > maxW || e1 > maxE + 0.001)) out[s.id] = s.weight > maxW ? "weight" : "1rm";
      maxW = Math.max(maxW, s.weight); maxE = Math.max(maxE, e1);
    });
  }
  return out;
}

/* ---------- state ---------- */
let tab = "workout";
const drafts = {}; // exerciseId -> {w, r}

/* ---------- rest timer ---------- */
let restEnd = 0, restTick = null, restDone = false;
function startRest(secs) {
  restEnd = Date.now() + secs * 1000; restDone = false;
  $("#rest").classList.remove("hidden", "done");
  clearInterval(restTick); restTick = setInterval(tickRest, 250); tickRest();
}
function stopRest() { clearInterval(restTick); restTick = null; $("#rest").classList.add("hidden"); }
function tickRest() {
  const left = Math.ceil((restEnd - Date.now()) / 1000);
  if (left > 0) {
    $("#rest-time").textContent = Math.floor(left / 60) + ":" + String(left % 60).padStart(2, "0");
  } else {
    $("#rest-time").textContent = "GO!";
    $("#rest").classList.add("done");
    if (!restDone) { restDone = true; beep(); if (navigator.vibrate) navigator.vibrate([200, 100, 200]); setTimeout(() => { if (restDone) stopRest(); }, 6000); }
  }
}
function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.25, 0.5].forEach(t => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.2, ctx.currentTime + t); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.2);
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.2);
    });
  } catch (e) {}
}
$("#rest-skip").onclick = stopRest;
$("#rest-plus").onclick = () => { restEnd += 15000; restDone = false; $("#rest").classList.remove("done"); tickRest(); };
$("#rest-minus").onclick = () => { restEnd -= 15000; tickRest(); };
document.addEventListener("visibilitychange", () => { if (!document.hidden && restTick) tickRest(); });

/* ---------- rendering ---------- */
const view = $("#view");
const TITLES = { workout: "Workout", history: "History", progress: "Progress" };

function render() {
  $("#title").textContent = TITLES[tab];
  document.querySelectorAll("#tabs button").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  if (tab === "workout") renderWorkout();
  else if (tab === "history") renderHistory();
  else renderProgress();
}

function renderWorkout() {
  const w = activeWorkout();
  if (!w) {
    const last = db.workouts.slice().sort((a, b) => b.start - a.start)[0];
    view.innerHTML = `
      <div class="empty"><div class="big">💪</div><p class="h2">Ready to train?</p>
      <p>Log every set so you never forget.</p></div>
      <button class="btn btn-primary" data-act="start">Start workout</button>
      ${last ? `<div class="card" style="margin-top:18px"><div class="mute small">Last workout · ${fmtDate(last.start)}</div>
        <div class="summary-line">${last.exercises.map(e => esc(exById(e.exerciseId).name)).join(", ") || "No exercises"}</div></div>` : ""}`;
    return;
  }
  const prs = prMap();
  view.innerHTML = `
    <div class="row between" style="margin-bottom:12px">
      <div><div class="h2">${fmtDate(w.start)}</div><div class="mute small" id="elapsed">${fmtDur(Date.now() - w.start)}</div></div>
      <button class="btn btn-sm btn-ok" data-act="finish">Finish</button>
    </div>
    ${w.exercises.map(e => exerciseCard(w, e, prs)).join("")}
    <button class="btn btn-primary" data-act="add-ex">＋ Add exercise</button>
    <button class="btn btn-danger" style="margin-top:10px" data-act="discard">Discard workout</button>`;
}

function exerciseCard(w, e, prs) {
  const ex = exById(e.exerciseId);
  const last = lastSessionSets(e.exerciseId, w.id);
  const d = draftFor(w, e, last);
  return `<div class="card" data-ex="${esc(e.exerciseId)}">
    <div class="ex-head">
      <div><div class="ex-name">${esc(ex.name)}</div><div class="ex-sub">${esc(ex.category)} · ${esc(ex.equipment)}</div></div>
      <button class="icon-btn" data-act="remove-ex" aria-label="Remove exercise">🗑</button>
    </div>
    <div class="last">${last ? `Last time (${fmtDate(last.start).replace(/, \d{4}$/, "")}): <b>${last.sets.map(fmtSet).join(" · ")}</b>` : "First time doing this — no history yet"}</div>
    <div class="sets">
      ${e.sets.map((s, i) => `<div class="set" data-set="${s.id}">
        <span class="n">${i + 1}</span>
        <input type="number" inputmode="decimal" step="any" value="${s.weight}" data-f="weight" aria-label="Weight">
        <input type="number" inputmode="numeric" value="${s.reps}" data-f="reps" aria-label="Reps">
        <span class="pr">${prs[s.id] ? "🏆" : ""}</span>
        <button class="x" data-act="del-set" aria-label="Delete set">✕</button>
      </div>`).join("")}
    </div>
    <div class="add-row">
      <div class="stepper"><div class="ctl"><button data-act="step" data-f="w" data-d="-2.5">−</button>
        <input type="number" inputmode="decimal" step="any" data-draft="w" value="${d.w}" placeholder="0"><button data-act="step" data-f="w" data-d="2.5">＋</button></div>
        <label>Weight (${unit()})</label></div>
      <div class="stepper"><div class="ctl"><button data-act="step" data-f="r" data-d="-1">−</button>
        <input type="number" inputmode="numeric" data-draft="r" value="${d.r}" placeholder="0"><button data-act="step" data-f="r" data-d="1">＋</button></div>
        <label>Reps</label></div>
    </div>
    <button class="btn btn-primary" data-act="add-set">Add set ${e.sets.length + 1}</button>
  </div>`;
}

function draftFor(w, e, last) {
  if (!drafts[e.exerciseId]) {
    const ref = e.sets.length ? e.sets[e.sets.length - 1] : last && last.sets[0];
    drafts[e.exerciseId] = { w: ref ? ref.weight : "", r: ref ? ref.reps : "" };
  }
  return drafts[e.exerciseId];
}

function renderHistory() {
  const ws = db.workouts.slice().sort((a, b) => b.start - a.start);
  if (!ws.length) { view.innerHTML = `<div class="empty"><div class="big">📅</div>No workouts yet.<br>Start one from the Workout tab.</div>`; return; }
  const prs = prMap();
  view.innerHTML = ws.map(w => {
    const sets = w.exercises.reduce((n, e) => n + e.sets.length, 0);
    const vol = w.exercises.reduce((n, e) => n + e.sets.reduce((m, s) => m + s.weight * s.reps, 0), 0);
    const nPR = w.exercises.reduce((n, e) => n + e.sets.filter(s => prs[s.id]).length, 0);
    return `<div class="card" data-w="${w.id}">
      <div class="row between"><div class="h2">${fmtDate(w.start)}</div>${w.end ? "" : '<span class="pill pr">in progress</span>'}</div>
      <div class="summary-line">${w.exercises.length} exercises · ${sets} sets · ${fmtNum(vol)} ${unit()} volume${w.end ? " · " + fmtDur(w.end - w.start) : ""}${nPR ? ` · 🏆 ${nPR}` : ""}</div>
      <div style="margin-top:10px">${w.exercises.map(e => `<div style="margin-top:6px"><b>${esc(exById(e.exerciseId).name)}</b>
        <div class="mute small">${e.sets.map(s => (prs[s.id] ? "🏆" : "") + fmtSet(s)).join(" · ") || "—"}</div></div>`).join("")}</div>
      <div class="row" style="margin-top:12px">
        ${w.end ? `<button class="btn btn-sm" data-act="reopen">Edit</button>` : ""}
        <button class="btn btn-sm btn-danger" data-act="del-workout">Delete</button>
      </div></div>`;
  }).join("");
}

let progEx = null, progMetric = "weight";
function renderProgress() {
  const ids = [...new Set(db.workouts.flatMap(w => w.exercises.filter(e => e.sets.length).map(e => e.exerciseId)))];
  if (!ids.length) { view.innerHTML = `<div class="empty"><div class="big">📈</div>Log some sets to see your progress here.</div>`; return; }
  ids.sort((a, b) => exById(a).name.localeCompare(exById(b).name));
  if (!progEx || !ids.includes(progEx)) progEx = ids[0];
  const pts = [];
  db.workouts.slice().sort((a, b) => a.start - b.start).forEach(w => {
    const e = w.exercises.find(x => x.exerciseId === progEx);
    if (!e || !e.sets.length) return;
    const best = e.sets.reduce((m, s) => Math.max(m, progMetric === "weight" ? s.weight : epley(s.weight, s.reps)), 0);
    pts.push({ t: w.start, v: best });
  });
  const allSets = db.workouts.flatMap(w => w.exercises.filter(e => e.exerciseId === progEx).flatMap(e => e.sets));
  const maxW = Math.max(...allSets.map(s => s.weight));
  const bestSet = allSets.filter(s => s.weight === maxW).sort((a, b) => b.reps - a.reps)[0];
  const max1 = Math.max(...allSets.map(s => epley(s.weight, s.reps)));
  const vol = allSets.reduce((n, s) => n + s.weight * s.reps, 0);
  view.innerHTML = `
    <select class="full" id="prog-ex">${ids.map(id => `<option value="${esc(id)}" ${id === progEx ? "selected" : ""}>${esc(exById(id).name)}</option>`).join("")}</select>
    <div class="seg"><button data-metric="weight" class="${progMetric === "weight" ? "on" : ""}">Top weight</button>
      <button data-metric="1rm" class="${progMetric === "1rm" ? "on" : ""}">Est. 1RM</button></div>
    <div class="card">${chartSVG(pts)}</div>
    <div class="stats">
      <div class="stat"><div class="v">🏆 ${fmtNum(maxW)} ${unit()}</div><div class="l">Heaviest (${bestSet.reps} reps)</div></div>
      <div class="stat"><div class="v">${fmtNum(max1)} ${unit()}</div><div class="l">Best est. 1RM</div></div>
      <div class="stat"><div class="v">${pts.length}</div><div class="l">Sessions</div></div>
      <div class="stat"><div class="v">${fmtNum(vol)}</div><div class="l">Total volume</div></div>
    </div>`;
}

function chartSVG(pts) {
  if (pts.length < 2) return `<div class="empty" style="padding:24px 0">${pts.length ? `One session so far: <b>${fmtNum(pts[0].v)} ${unit()}</b>.<br>Log another to see a trend.` : "No data"}</div>`;
  const W = 340, H = 190, p = { l: 38, r: 10, t: 12, b: 26 };
  const vs = pts.map(x => x.v), lo = Math.min(...vs), hi = Math.max(...vs);
  const pad = (hi - lo || hi || 1) * 0.15, y0 = Math.max(0, lo - pad), y1 = hi + pad;
  const x = i => p.l + (i / (pts.length - 1)) * (W - p.l - p.r);
  const y = v => p.t + (1 - (v - y0) / (y1 - y0)) * (H - p.t - p.b);
  const line = pts.map((q, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(q.v).toFixed(1)}`).join(" ");
  const ticks = [y0, (y0 + y1) / 2, y1].map(v => `<line x1="${p.l}" x2="${W - p.r}" y1="${y(v)}" y2="${y(v)}" stroke="#2a2a34"/><text x="${p.l - 6}" y="${y(v) + 4}" fill="#8d8d9b" font-size="10" text-anchor="end">${Math.round(v)}</text>`).join("");
  const fd = t => new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `<svg class="chart" viewBox="0 0 ${W} ${H}">${ticks}
    <path d="${line}" fill="none" stroke="#ff5a36" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    ${pts.map((q, i) => `<circle cx="${x(i)}" cy="${y(q.v)}" r="3.5" fill="#ff5a36"/>`).join("")}
    <text x="${p.l}" y="${H - 6}" fill="#8d8d9b" font-size="10">${fd(pts[0].t)}</text>
    <text x="${W - p.r}" y="${H - 6}" fill="#8d8d9b" font-size="10" text-anchor="end">${fd(pts[pts.length - 1].t)}</text></svg>`;
}

/* ---------- sheets ---------- */
const sheet = $("#sheet");
function openSheet(html) { sheet.innerHTML = html; sheet.classList.remove("hidden"); document.body.style.overflow = "hidden"; }
function closeSheet() { sheet.classList.add("hidden"); sheet.innerHTML = ""; document.body.style.overflow = ""; }

let pickCat = "All", pickQ = "";
function openPicker() {
  pickCat = "All"; pickQ = "";
  openSheet(`<div class="sheet-head"><h2>Add exercise</h2><button class="chip" data-act="close-sheet">Close</button></div>
    <div class="sheet-body">
      <input class="search" id="pick-q" type="search" placeholder="Search exercises…" autocomplete="off">
      <div class="chips" id="pick-chips"></div><div id="pick-list"></div></div>`);
  renderPicker();
}
function renderPicker() {
  $("#pick-chips").innerHTML = ["All", ...CATEGORIES].map(c => `<button class="chip ${c === pickCat ? "on" : ""}" data-cat="${c}">${c}</button>`).join("");
  const q = pickQ.trim().toLowerCase();
  const list = EXERCISES.filter(e => (pickCat === "All" || e.category === pickCat) && (!q || (e.name + " " + e.equipment + " " + e.category).toLowerCase().includes(q)));
  $("#pick-list").innerHTML = list.length ? list.map(e => `<button class="list-item" data-pick="${esc(e.id)}"><span>${esc(e.name)}<br><small>${esc(e.category)} · ${esc(e.equipment)}</small></span><span class="mute">＋</span></button>`).join("")
    : `<div class="empty">No match.</div>`;
}

function openSettings() {
  openSheet(`<div class="sheet-head"><h2>Settings</h2><button class="chip" data-act="close-sheet">Done</button></div>
    <div class="sheet-body">
      <div class="field"><span>Weight unit</span><select id="set-unit"><option value="kg">kg</option><option value="lb">lb</option></select></div>
      <div class="field"><span>Rest timer (seconds)</span><input id="set-rest" type="number" inputmode="numeric" min="10" step="5"></div>
      <p class="mute small">Changing the unit only changes the label; saved numbers are not converted.</p>
      <button class="btn" style="margin-top:14px" data-act="export">⬇︎ Export backup (JSON)</button>
      <button class="btn" style="margin-top:10px" data-act="import">⬆︎ Import backup</button>
      <input type="file" id="import-file" accept="application/json,.json" class="hidden">
      <button class="btn btn-danger" style="margin-top:10px" data-act="wipe">Delete all data</button>
      <p class="mute small" style="margin-top:18px">Data lives only on this phone. Export a backup now and then.</p>
    </div>`);
  $("#set-unit").value = unit(); $("#set-rest").value = db.settings.restSecs;
}

/* ---------- actions ---------- */
function curExId(el) { const c = el.closest("[data-ex]"); return c && c.dataset.ex; }

function addExercise(id) {
  const w = activeWorkout(); if (!w) return;
  if (!w.exercises.some(e => e.exerciseId === id)) w.exercises.push({ exerciseId: id, sets: [] });
  save(); closeSheet(); render();
}

function addSet(exId, card) {
  const w = activeWorkout(); const e = w.exercises.find(x => x.exerciseId === exId);
  const d = drafts[exId] || {};
  const weight = parseFloat(d.w), reps = parseInt(d.r, 10);
  if (!(reps > 0) || isNaN(weight) || weight < 0) { toast("Enter weight and reps"); return; }
  const s = { id: uid(), weight, reps, ts: Date.now() };
  e.sets.push(s); save();
  const isPR = prMap()[s.id];
  if (isPR) { toast("🏆 New PR! " + fmtSet(s) + " " + unit()); if (navigator.vibrate) navigator.vibrate(60); }
  startRest(db.settings.restSecs);
  render();
}

function onClick(ev) {
  const t = ev.target.closest("button, [data-pick]"); if (!t) return;
  if (t.dataset.tab) { tab = t.dataset.tab; render(); window.scrollTo(0, 0); return; }
  if (t.id === "btn-settings") return openSettings();
  if (t.dataset.cat) { pickCat = t.dataset.cat; return renderPicker(); }
  if (t.dataset.pick) return addExercise(t.dataset.pick);
  if (t.dataset.metric) { progMetric = t.dataset.metric; return render(); }
  const a = t.dataset.act; if (!a) return;
  const w = activeWorkout();
  switch (a) {
    case "close-sheet": closeSheet(); break;
    case "start":
      db.workouts.push({ id: uid(), start: Date.now(), end: null, exercises: [] }); save(); render(); break;
    case "add-ex": openPicker(); break;
    case "finish":
      if (!w.exercises.some(e => e.sets.length)) { if (!confirm("No sets logged. Discard this workout?")) break; db.workouts = db.workouts.filter(x => x !== w); }
      else w.end = Date.now();
      save(); stopRest(); render(); toast("Workout saved 💪"); break;
    case "discard":
      if (confirm("Discard this workout and all its sets?")) { db.workouts = db.workouts.filter(x => x !== w); save(); stopRest(); render(); } break;
    case "remove-ex": {
      const id = curExId(t); const e = w.exercises.find(x => x.exerciseId === id);
      if (e.sets.length && !confirm("Remove exercise and its sets?")) break;
      w.exercises = w.exercises.filter(x => x !== e); save(); render(); break; }
    case "step": {
      const id = curExId(t), f = t.dataset.f, d = drafts[id] = drafts[id] || { w: "", r: "" };
      const step = unit() === "lb" && f === "w" ? parseFloat(t.dataset.d) * 2 : parseFloat(t.dataset.d);
      d[f] = Math.max(0, Math.round(((parseFloat(d[f]) || 0) + step) * 100) / 100);
      t.closest(".stepper").querySelector("input").value = d[f]; break; }
    case "add-set": addSet(curExId(t), t.closest(".card")); break;
    case "del-set": {
      const id = curExId(t), sid = t.closest("[data-set]").dataset.set;
      const e = w.exercises.find(x => x.exerciseId === id); e.sets = e.sets.filter(s => s.id !== sid); save(); render(); break; }
    case "del-workout": {
      const id = t.closest("[data-w]").dataset.w;
      if (confirm("Delete this workout permanently?")) { db.workouts = db.workouts.filter(x => x.id !== id); save(); render(); } break; }
    case "reopen": {
      if (w) { toast("Finish your current workout first"); break; }
      const id = t.closest("[data-w]").dataset.w; const x = db.workouts.find(y => y.id === id); x.end = null; save(); tab = "workout"; render(); break; }
    case "export": {
      const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
      const aEl = document.createElement("a"); aEl.href = URL.createObjectURL(blob);
      aEl.download = "gymlog-backup-" + new Date().toISOString().slice(0, 10) + ".json"; document.body.appendChild(aEl); aEl.click(); aEl.remove(); break; }
    case "import": $("#import-file").click(); break;
    case "wipe":
      if (confirm("Delete ALL workouts and settings? This cannot be undone.")) { db = JSON.parse(JSON.stringify(DEFAULTS)); save(); stopRest(); closeSheet(); render(); } break;
  }
}

function onInput(ev) {
  const el = ev.target;
  if (el.id === "pick-q") { pickQ = el.value; return renderPicker(); }
  if (el.dataset.draft) { const id = curExId(el); drafts[id] = drafts[id] || { w: "", r: "" }; drafts[id][el.dataset.draft] = el.value; return; }
}

function onChange(ev) {
  const el = ev.target;
  if (el.id === "prog-ex") { progEx = el.value; return render(); }
  if (el.id === "set-unit") { db.settings.unit = el.value; save(); return; }
  if (el.id === "set-rest") { db.settings.restSecs = Math.max(10, parseInt(el.value, 10) || 90); save(); return; }
  if (el.id === "import-file") {
    const f = el.files[0]; if (!f) return;
    f.text().then(txt => {
      const d = JSON.parse(txt);
      if (!Array.isArray(d.workouts)) throw new Error("bad file");
      if (!confirm("Replace current data with backup (" + d.workouts.length + " workouts)?")) return;
      db = { workouts: d.workouts, settings: { ...DEFAULTS.settings, ...(d.settings || {}) } }; save(); closeSheet(); render(); toast("Backup restored");
    }).catch(() => toast("Invalid backup file"));
    return;
  }
  if (el.dataset.f && el.closest("[data-set]")) {
    const w = activeWorkout() || db.workouts.find(x => x.exercises.some(e => e.sets.some(s => s.id === el.closest("[data-set]").dataset.set)));
    const e = w.exercises.find(x => x.exerciseId === curExId(el)); const s = e.sets.find(x => x.id === el.closest("[data-set]").dataset.set);
    const v = el.dataset.f === "reps" ? parseInt(el.value, 10) : parseFloat(el.value);
    if (isNaN(v) || v < 0 || (el.dataset.f === "reps" && v < 1)) { el.value = s[el.dataset.f]; return; }
    s[el.dataset.f] = v; save(); render();
  }
}

document.addEventListener("click", onClick);
document.addEventListener("input", onInput);
document.addEventListener("change", onChange);
document.addEventListener("keydown", ev => { if (ev.key === "Enter" && ev.target.matches("input[data-draft]")) { ev.target.blur(); } });

// keep the elapsed clock fresh
setInterval(() => { const el = $("#elapsed"), w = activeWorkout(); if (el && w) el.textContent = fmtDur(Date.now() - w.start); }, 30000);

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
render();
