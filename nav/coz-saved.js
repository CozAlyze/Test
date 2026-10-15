/* COZ SAVED · CS1.9-T r3 (Oct 15 2026, CozAlyze/Test/nav ONLY, never the Demo) · library hook
   Built from the Demo's CS1.8 (Demo 7b7e506). Navigation rulings (Jason + Chat, Oct 8 and Oct 14), all three readings:
   (a) The bottom-nav bookmark (Saved) never saves. On every page it opens the shared Saved Charts list.
   (b) Saving is its own Save Chart control (any element with data-coz-save): it saves the chart that page is
       showing (a Vedic or Tropical chart record, or the Compare record with its timing, exactly as CS1.8
       saved them), then opens the Saved Charts list. Failures say so on the page (CS1.8's message and
       wording), never with a Safari pop-up.
   (c) Account in the bottom nav (dashboard art, reading footers, Compare navs, Saved Charts) opens account.html.
   (d) Home is unchanged. CozSaved.note is exported so Account and Saved Charts can use the same message.
   Test only: the message strip loads from the Demo folder (window.COZ_TEST_ASSETS).
   CS1.8 (Oct 2 2026, local build for review):
   CS1.8 (Jason): Compare save messages are shown on the page, not with alert() (Safari dropped a
   native dialog on his iPhone before). Styled like the S1.4 remove confirmation: Saved Charts'
   message panel (sc-mid.png strip, .state), .meta text and one .pill button. Wording unchanged.
   Vedic and Tropical save messages unchanged. Modal behavior (Chat review): while the message is up
   the rest of the page is inert, Tab stays on OK, Escape works like OK, and when it closes on the
   page (chart changed) focus returns to the bookmark that was tapped.
   CS1.7 (Oct 2 2026):
   CS1.7 (Chat): a Compare save is bound to the run current when Save was tapped. Its run ID and
   fingerprint are captured at the tap, passed to the timing capture, and checked again inside
   saveCurrent() immediately before anything is written; if either changed, nothing is written, the
   prepared timing is discarded and the customer is told to save again. Other saves unchanged.
   CS1.6 (Oct 2 2026):
   CS1.6 (Compare Saved Library, Jason's rulings): (a) Saving on a Compare page first loads
   saved-compare-library.js on demand and calculates Current Timing for this run (T2, no model
   call), then saves; one save at a time; a full Compare slot is reported before any calculation.
   (b) A Compare record is complete only with the Combined Reading (all three sections), all three
   Ascendant readings, both birth charts (this run) and the timing snapshot, judged by
   saved-compare-library.js parts() (the same rule the saved document uses; unavailable = Incomplete). (c) A saved comparison (card, Compare pill,
   and right after saving) opens saved-compare-document.html?view=charts&id=... (d) Pages framed
   with in=compare record no Home memory. Vedic and Tropical behavior unchanged.
   CS1.5 (Oct 1 2026):
   CS1.5: (a) Home memory. Each visible page of a package records which dashboard is home
   (localStorage "cozHomeDash": vedic / tropical / compare) so Saved Charts' Home returns to
   that package's dashboard instead of the start of the platform. Not recorded from the hidden
   pre-write page (?pregen=1) or from pages shown inside Compare (?from=compare).
   (b) compare-system (Your Vedic / Tropical Reading inside Compare) is a Compare page, so its
   center bookmark saves the Compare record, not a Vedic chart record.
   CS1.4: tropical-current-transits (the Tropical reading's Your Current Transits page) is a
   Tropical page: its Saved button saves a Tropical chart record and opens the Tropical Saved
   Library landing page. Nothing else changed.
   CS1.3: Tropical pages open tropical-birth-chart.html?saved=1&id=... after saving; a Tropical
   chart record (and the Tropical pill) restores to that page; a chart record is complete when
   the captured reading exists for every system it holds.
   CS1.2: a page may register a payload provider (CozSaved.registerPayload) whose result is
   stored on the record as rec.library[name] at save time; pieces a provider does not return
   are kept from the previous save. Vedic pages open the Saved Library landing page
   (vedic-birth-chart.html?saved=1&id=...) after saving instead of the list. get(id) and
   currentRecord() read one record without restoring anything. restore() of a Vedic chart
   record returns the Saved Library landing page. No new store.
   One Saved Charts store for every page (localStorage "cozSavedCharts").

   - The center bookmark in the bottom nav is the save control on every page that shows it
     (his Sep 23 ruling). Tapping it saves the chart that page is showing, then opens
     saved-charts.html. Compare pages save a Compare record, Tropical pages a chart record
     with Tropical, the Vedic pages a chart record with Vedic. Saving the same chart run
     again refreshes that record; it never creates a second one.
   - A record is a snapshot of that chart run: the single-slot keys the pages read
     (emergeBirthData, cozChartJSON, ...) plus every finished reading stored for that run
     (Combined, its step 1, the Ascendant readings, the Vedic sections 3-6 draft).
   - Reopening restores the snapshot into the ordinary keys and opens the existing page.
     HARD RULE: a reopened saved chart never calls the model. While the current chart run
     is a restored one, every request to api.anthropic.com from a page that loads this
     file is refused before it is sent.
   - The Compare purchase includes one saved Compare slot (compareSlots: 1). Extra slots
     ($5 each) are not wired; the data model keeps compareSlots for that later.
   - Each record lists which of its readings were finished when it was saved
     (rec.readings, rec.complete). A record saved too early shows "Incomplete" on its card,
     and the unfinished reading says it hadn't finished when the chart was saved.
   - Records live on this device only. */
(function () {
  if (window.CozSaved) return;
  var STORE = "cozSavedCharts", RESTORED = "cozRestoredRunId", BACKUP = "cozWorkingBackup";
  var FIXED = ["emergeBirthData", "cozChartJSON", "cozTropicalChartJSON", "cozTropicalReading", "cozCompareReading",
               "cozAscendantPair", "cozVedicReadingComplete", "cozTropicalReadingComplete"];
  var RUN_PREFIX = ["cozCombinedReadingDEV:", "cozCombinedStep1DEV:", "cozAscReading:"];
  var COMPARE_PAGES = ["compare-reading", "combined-reading", "your-ascendants", "ascendant-reading",
                       "compare-current-timing", "compare-current-timing-reading", "compare-birth-charts", "compare-system"];
  var TROPICAL_PAGES = ["tropical-reading", "tropical-birth-chart", "tropical-current-transits"];
  var VEDIC_LIBRARY_PAGES = ["vedic-reading", "vedic-birth-chart", "current-life-cycle", "current-season", "key-time-windows", "what-comes-next"];
  var TROPICAL_LIBRARY_PAGES = ["tropical-reading", "tropical-birth-chart", "tropical-current-transits"];
  var PROVIDERS = {};

  function lsGet(k){ try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsJSON(k){ try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }
  function pageName(){ return (location.pathname.split("/").pop() || "index.html").replace(/\.html$/, ""); }
  function uid(){ return "sc-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7); }

  /* throws when the store exists but cannot be read, so the page can show its error state */
  function readStore(){
    var raw = localStorage.getItem(STORE);
    if (!raw) return { version: 1, compareSlots: 1, records: [] };
    var s = JSON.parse(raw);
    if (!s || !Array.isArray(s.records)) throw new Error("saved charts store is damaged");
    if (typeof s.compareSlots !== "number") s.compareSlots = 1;
    return s;
  }
  function writeStore(s){ localStorage.setItem(STORE, JSON.stringify(s)); }

  function runIdOf(v){
    try { var o = JSON.parse(v); return o && ((o.run && o.run.runId) || o.runId || (o.inputs && o.inputs.runId)) || null; } catch (e) { return null; }
  }
  /* everything stored for one chart run */
  function snapshotFor(runId){
    var snap = {}, i, k, v;
    FIXED.forEach(function (key) {
      var val = lsGet(key); if (val == null) return;
      var r = runIdOf(val);
      if (r && r !== runId) return;                 /* belongs to a different chart run */
      snap[key] = val;
    });
    for (i = 0; i < localStorage.length; i++) {
      k = localStorage.key(i); if (!k) continue;
      if (RUN_PREFIX.some(function (p) { return k.indexOf(p) === 0; }) && k.indexOf(runId) >= 0) snap[k] = lsGet(k);
      else if (k.indexOf("cozGenDraft:") === 0) { v = lsGet(k); if (runIdOf(v) === runId) snap[k] = v; }
    }
    return snap;
  }
  /* S1.1 (his ruling): which readings were finished when the record was saved, so a record
     saved too early is marked incomplete instead of looking broken later */
  function readingsFor(kind, systems, snap, runId){
    function has(test){ return Object.keys(snap).some(function (k) { try { return test(k, JSON.parse(snap[k])); } catch (e) { return false; } }); }
    function asc(sys){ return has(function (k, o) { return k.indexOf("cozAscReading:") === 0 && k.split("|")[2] === sys && o && Array.isArray(o.paragraphs); }); }
    var r = {};
    if (kind === "compare") {
      r.combined = has(function (k, o) { return k.indexOf("cozCombinedReadingDEV:") === 0 && o && o.sharedThemes && o.integratedView; });
      r.ascTropical = asc("tropical"); r.ascVedic = asc("vedic"); r.ascCombined = asc("combined");
    } else if (systems && systems.vedic) {
      r.vedic36 = has(function (k, o) { return k.indexOf("cozGenDraft:") === 0 && o && o.sections && o.inputs && o.inputs.runId === runId; });
    }
    return r;
  }
  function kindForPage(p){ return COMPARE_PAGES.indexOf(p) >= 0 ? "compare" : "chart"; }
  function systemForPage(p){ return TROPICAL_PAGES.indexOf(p) >= 0 ? "tropical" : "vedic"; }

  function saveCurrent(kind, system, expect){
    var bd = lsJSON("emergeBirthData");
    if (!bd || !bd.runId) return { ok: false, reason: "no_chart" };
    if (expect && (bd.runId !== expect.runId || (bd.fingerprint || null) !== (expect.fingerprint || null))) return { ok: false, reason: "run_changed" };   /* CS1.7 */
    var s; try { s = readStore(); } catch (e) { return { ok: false, reason: "store_error" }; }
    var rec = null;
    s.records.forEach(function (r) { if (r.runId === bd.runId && r.kind === kind) rec = r; });
    if (!rec && kind === "compare") {
      var used = s.records.filter(function (r) { return r.kind === "compare"; }).length;
      if (used >= s.compareSlots) return { ok: false, reason: "slots_full" };
    }
    var now = new Date().toISOString();
    if (!rec) { rec = { id: uid(), kind: kind, runId: bd.runId, savedAt: now, systems: {} }; s.records.unshift(rec); }
    rec.fingerprint = bd.fingerprint || null;
    rec.name = bd.name || "";
    rec.birthDate = bd.birthDate || "";
    if (kind === "chart") rec.systems[system || "vedic"] = true;
    rec.updatedAt = now;
    rec.snapshot = snapshotFor(bd.runId);
    rec.readings = readingsFor(kind, rec.systems, rec.snapshot, bd.runId);
    rec.complete = Object.keys(rec.readings).every(function (k) { return rec.readings[k]; });
    /* CS1.2: provider payloads, merged piece by piece over the previous save */
    rec.library = rec.library || {};
    Object.keys(PROVIDERS).forEach(function (name) {
      var out = null; try { out = PROVIDERS[name](rec); } catch (e) { out = null; }
      if (!out || typeof out !== "object") return;
      var prev = rec.library[name] || {};
      Object.keys(out).forEach(function (k) { if (out[k] != null) prev[k] = out[k]; });
      rec.library[name] = prev;
    });
    /* CS1.2: a Vedic chart is complete when the captured six-section reading is complete,
       not merely because a Sections 3-6 draft exists */
    function captured(cap){ return !!(cap && cap.sections && Array.isArray(cap.order) && cap.order.length &&
        cap.order.every(function (sec) { return Array.isArray(cap.sections[sec.id]) && cap.sections[sec.id].length > 0; })); }
    /* CS1.6: a Compare record is complete only when every part would actually show in the saved
       comparison. The rule lives in ONE place, saved-compare-library.js parts(); if that module is
       not available, nothing is counted (fails closed: Incomplete). */
    if (kind === "compare") {
      var parts = null; try { parts = window.CozSavedCompare && window.CozSavedCompare.parts(rec); } catch (e) { parts = null; }
      rec.readings = parts || { combined: false, ascTropical: false, ascVedic: false, ascCombined: false, vedicChart: false, tropicalChart: false, timing: false };
      rec.complete = Object.keys(rec.readings).every(function (k) { return rec.readings[k]; });
    }
    if (kind === "chart") {
      var flags = [];
      if (rec.systems.vedic) { rec.readings.vedicReading = captured(rec.library.vedic && rec.library.vedic.reading); flags.push(rec.readings.vedicReading); }
      if (rec.systems.tropical) { rec.readings.tropicalReading = captured(rec.library.tropical && rec.library.tropical.reading); flags.push(rec.readings.tropicalReading); }
      if (flags.length) rec.complete = flags.every(Boolean);
    }
    try { writeStore(s); } catch (e) { return { ok: false, reason: "storage_full" }; }
    return { ok: true, record: rec };
  }

  function registerPayload(name, fn){ if (name && typeof fn === "function") PROVIDERS[name] = fn; }
  function get(id){ try { var s = readStore(), rec = null; s.records.forEach(function (r) { if (r.id === id) rec = r; }); return rec; } catch (e) { return null; } }
  /* the record for the run now on this device: the restored one, else the current run's own record */
  function currentRecord(){
    try {
      var s = readStore(), rid = lsGet(RESTORED), bd = lsJSON("emergeBirthData"), want = rid || (bd && bd.runId), rec = null;
      if (!want) return null;
      s.records.forEach(function (r) { if (!rec && r.runId === want && r.kind === "chart") rec = r; });
      return rec;
    } catch (e) { return null; }
  }
  function list(){ return new Promise(function (res, rej) { try { res(readStore().records.slice()); } catch (e) { rej(e); } }); }
  function remove(id){
    return new Promise(function (res, rej) {
      try { var s = readStore(); s.records = s.records.filter(function (r) { return r.id !== id; }); writeStore(s); res(true); } catch (e) { rej(e); }
    });
  }
  /* restores one record and returns the page to open; touches no other record */
  function restore(id, target){
    var s = readStore(), rec = null;
    s.records.forEach(function (r) { if (r.id === id) rec = r; });
    if (!rec) throw new Error("saved record not found");
    var cur = lsJSON("emergeBirthData");
    if (cur && cur.runId && cur.runId !== rec.runId && !s.records.some(function (r) { return r.runId === cur.runId; })) {
      var keep = {}; FIXED.forEach(function (k) { var v = lsGet(k); if (v != null) keep[k] = v; });
      try { localStorage.setItem(BACKUP, JSON.stringify({ at: new Date().toISOString(), runId: cur.runId, keys: keep })); } catch (e) {}
    }
    var snap = rec.snapshot || {};
    FIXED.forEach(function (k) { if (Object.prototype.hasOwnProperty.call(snap, k)) localStorage.setItem(k, snap[k]); else localStorage.removeItem(k); });
    Object.keys(snap).forEach(function (k) { if (FIXED.indexOf(k) < 0) localStorage.setItem(k, snap[k]); });
    localStorage.setItem(RESTORED, rec.runId);
    /* CS1.2: a Vedic chart record opens its Saved Library landing page (card and Vedic pill alike) */
    var library = "vedic-birth-chart.html?saved=1&id=" + encodeURIComponent(rec.id);
    var tlibrary = "tropical-birth-chart.html?saved=1&id=" + encodeURIComponent(rec.id);
    if (target === "tropical") return tlibrary;
    if (target === "vedic") return library;
    if (rec.kind === "compare") return "saved-compare-document.html?view=charts&id=" + encodeURIComponent(rec.id);   /* CS1.6 */
    return rec.systems && rec.systems.vedic ? library : tlibrary;
  }

  /* HARD RULE: a reopened saved chart never calls the model */
  function isRestoredRun(){ var r = lsGet(RESTORED), bd = lsJSON("emergeBirthData"); return !!(r && bd && bd.runId === r); }
  if (window.fetch && !window.__cozSavedGuard) {
    window.__cozSavedGuard = true;
    var nativeFetch = window.fetch;
    window.fetch = function (input, init) {
      try {
        var url = typeof input === "string" ? input : (input && input.url) || "";
        if (/api\.anthropic\.com/.test(url) && isRestoredRun()) {
          console.log("[COZ SAVED] saved chart reopened: model request refused");
          var e = new Error("This reading hadn't finished when this chart was saved."); e.kind = "saved_no_regen";
          return Promise.reject(e);
        }
      } catch (x) {}
      return nativeFetch.apply(this, arguments);
    };
  }

  /* CS1.6: Compare save. The slot is checked first; then Current Timing is calculated for this run
     by saved-compare-library.js (loaded on demand), then the record is saved and its saved comparison
     opens. A failed timing calculation still saves the record (marked incomplete, reason kept). */
  var comparing = false;
  function compareSlotFree(){
    var bd = lsJSON("emergeBirthData"), s; if (!bd || !bd.runId) return true;
    try { s = readStore(); } catch (e) { return true; }
    if (s.records.some(function (r) { return r.kind === "compare" && r.runId === bd.runId; })) return true;
    return s.records.filter(function (r) { return r.kind === "compare"; }).length < s.compareSlots;
  }
  var RUN_CHANGED = "Your chart changed while this comparison was being saved, so nothing was saved. Please tap Save again.";
  var SLOT_FULL = "Your Compare package includes one saved comparison. Remove the one on your Saved Charts page to save this one.";
  /* CS1.8: the on-page message. Saved Charts' own pieces only: its message panel (sc-mid.png strip,
     .state type), .meta-style text, one .pill. Tapping the pill closes it, then runs after(). */
  function note(text, after, from){
    var old = document.getElementById("cozSaveNote"); if (old) old.remove();
    if (!document.getElementById("cozSaveNoteCSS")) {
      var st = document.createElement("style"); st.id = "cozSaveNoteCSS";
      st.textContent =
        "#cozSaveNote{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;background:transparent;" +
          "padding:0 0 env(safe-area-inset-bottom);-webkit-tap-highlight-color:transparent}" +
        "#cozSaveNote .box{width:min(100%,640px);container-type:inline-size;--K:calc(100cqw / 1185);" +
          "background:url('" + (window.COZ_TEST_ASSETS || "") + "sc-mid.png?v=1') center top/100% 1px repeat-y #00050f;color:#EEE7D8;text-align:center;" +
          "padding:calc(40 * var(--K)) calc(120 * var(--K));display:flex;flex-direction:column;align-items:center;gap:calc(30 * var(--K))}" +
        "#cozSaveNote .msg{font-family:'Montserrat','Helvetica Neue',Arial,sans-serif;font-weight:300;font-size:max(15px,calc(36 * var(--K)));line-height:1.5;margin:0}" +
        "#cozSaveNote .pill{font-family:'Montserrat','Helvetica Neue',Arial,sans-serif;font-weight:300;font-size:max(12px,calc(30 * var(--K)));line-height:1;color:#EEE7D8;" +
          "background:none;cursor:pointer;border:1.5px solid #C9A27C;border-radius:999px;height:calc(59 * var(--K));min-height:26px;" +
          "padding:0 calc(36 * var(--K));display:inline-flex;align-items:center;-webkit-tap-highlight-color:transparent}" +
        "#cozSaveNote .pill:focus-visible{outline:1px solid #F2C898;outline-offset:2px}";
      document.head.appendChild(st);
    }
    var n = document.createElement("div"); n.id = "cozSaveNote"; n.setAttribute("role", "alertdialog"); n.setAttribute("aria-modal", "true");
    var box = document.createElement("div"); box.className = "box";
    var m = document.createElement("p"); m.className = "msg"; m.setAttribute("aria-live", "assertive"); m.textContent = text;
    var b = document.createElement("button"); b.type = "button"; b.className = "pill"; b.textContent = "OK";
    m.id = "cozSaveNoteMsg"; n.setAttribute("aria-describedby", "cozSaveNoteMsg"); n.setAttribute("aria-label", "Save");
    var made = [];                                                                /* the page goes inert underneath */
    Array.prototype.forEach.call(document.body.children, function (el) {
      if (el !== n && el.tagName !== "SCRIPT" && el.tagName !== "STYLE" && !el.hasAttribute("inert")) { el.setAttribute("inert", ""); made.push(el); }
    });
    function close(){
      n.remove(); made.forEach(function (el) { el.removeAttribute("inert"); });
      if (after) after();
      else if (from && from.isConnected) { try { from.focus({ preventScroll: true }); } catch (e) {} }
    }
    b.addEventListener("click", function (ev) { ev.preventDefault(); ev.stopPropagation(); close(); });
    n.addEventListener("click", function (ev) { ev.stopPropagation(); });         /* taps on the message never reach the page */
    n.addEventListener("keydown", function (ev) {
      if (ev.key === "Tab") { ev.preventDefault(); try { b.focus({ preventScroll: true }); } catch (e) {} }
      else if (ev.key === "Escape") { ev.preventDefault(); close(); }
    });
    box.appendChild(m); box.appendChild(b); n.appendChild(box); document.body.appendChild(n);
    try { b.focus({ preventScroll: true }); } catch (e) {}
    console.log("[COZ SAVED] note: " + text);
  }
  function toSaved(){ location.href = "saved-charts.html"; }

  /* CS1.9-T (a): the bookmark only opens Saved Charts. It never saves. */
  var SEL = '[data-dash="saved"],[data-foot="saved"],.nav a.saved,a[aria-label="Saved"],button[aria-label="Saved"]';
  document.addEventListener("click", function (ev) {
    var t = ev.target && ev.target.closest && ev.target.closest(SEL);
    var p = pageName();
    if (!t || p === "saved-charts" || p === "index") return;
    ev.preventDefault(); ev.stopImmediatePropagation();
    toSaved();
  }, true);

  /* CS1.9-T (c): Account opens the shared Account page (the Compare pages label the same icon "Profile") */
  var ACCT = '[data-dash="account"],[data-foot="account"],.nav a.acct,a.nav-acct,nav a[aria-label="Account"],nav a[aria-label="Profile"]';
  document.addEventListener("click", function (ev) {
    var t = ev.target && ev.target.closest && ev.target.closest(ACCT);
    var p = pageName();
    if (!t || p === "account" || p === "index") return;
    ev.preventDefault(); ev.stopImmediatePropagation();
    location.href = "account.html";
  }, true);

  /* CS1.9-T (b): Save Chart, its own control. Saves the chart this page is showing, then opens the Saved
     Charts list. Failure messages are CS1.8's, shown on the page. */
  var STORAGE_FULL = "There isn't enough space on this device to save this chart.";
  var STORE_ERROR = "Your saved charts couldn't be read on this device.";
  document.addEventListener("click", function (ev) {
    var t = ev.target && ev.target.closest && ev.target.closest("[data-coz-save]");
    var p = pageName();
    if (!t || p === "saved-charts" || p === "index" || p === "account") return;
    ev.preventDefault(); ev.stopImmediatePropagation();
    if (/\bsaved=1\b/.test(location.search)) { toSaved(); return; }   /* a Saved Library page is already saved */
    if (kindForPage(p) === "compare") { saveCompare(t); return; }
    var r = saveCurrent(kindForPage(p), systemForPage(p));
    if (r.ok) { toSaved(); return; }
    if (r.reason === "slots_full") return note(SLOT_FULL, toSaved);
    if (r.reason === "storage_full") return note(STORAGE_FULL, null, t);
    if (r.reason === "store_error") return note(STORE_ERROR, null, t);
    toSaved();                                                         /* no chart on this device: as before, the list opens */
  }, true);
  function saveCompare(from){
    if (comparing) return; comparing = true;
    var bd0 = lsJSON("emergeBirthData");                                                          /* CS1.7: the run at the tap */
    var start = bd0 && bd0.runId ? { runId: bd0.runId, fingerprint: bd0.fingerprint || null } : null;
    if (!compareSlotFree()) {
      comparing = false;
      note(SLOT_FULL, toSaved); return;                                                         /* CS1.8 */
    }
    var lib = window.CozSavedCompare ? Promise.resolve() : new Promise(function (res, rej) {
      var sc = document.createElement("script"); sc.src = "saved-compare-library.js?v=1";
      sc.onload = function () { res(); }; sc.onerror = function () { rej(new Error("saved-compare-library.js did not load")); };
      document.head.appendChild(sc);
    });
    lib.then(function () { return window.CozSavedCompare.prepareSave(start); })
      .catch(function (e) { console.log("[COZ SAVED] Compare timing capture unavailable: " + (e && e.message)); })
      .then(function () {
        var r = start ? saveCurrent("compare", undefined, start) : saveCurrent("compare");
        comparing = false;
        if (!r.ok && r.reason === "run_changed") {                                                  /* CS1.7: nothing written */
          try { window.CozSavedCompare && window.CozSavedCompare.discard && window.CozSavedCompare.discard(); } catch (e) {}
          console.log("[COZ SAVED] Compare save stopped: the chart run changed during the timing calculation");
          note(RUN_CHANGED, null, from); return;                                                              /* CS1.8: stays on the page */
        }
        if (r.ok) { toSaved(); return; }                                                          /* CS1.9-T (b) */
        if (r.reason === "slots_full") return note(SLOT_FULL, toSaved);                              /* CS1.8 */
        if (r.reason === "storage_full") return note("There isn't enough space on this device to save this chart.", toSaved);
        if (r.reason === "store_error") return note("Your saved charts couldn't be read on this device.", toSaved);
        toSaved();
      });
  }

  /* CS1.5: remember which package dashboard is home for Saved Charts' Home button */
  (function () {
    var p = pageName(), q = location.search, dash = null;
    if (/[?&](pregen=1|from=compare|in=compare)\b/.test(q)) return;
    if (COMPARE_PAGES.indexOf(p) >= 0 || p === "saved-compare-document") dash = "compare";
    else if (TROPICAL_PAGES.indexOf(p) >= 0 || p === "saved-tropical-document") dash = "tropical";
    else if (VEDIC_LIBRARY_PAGES.indexOf(p) >= 0 || p === "saved-vedic-document") dash = "vedic";
    if (!dash) return;
    try { localStorage.setItem("cozHomeDash", JSON.stringify({ dash: dash, page: p, at: new Date().toISOString() })); } catch (e) {}
  })();

  window.CozSaved = { list: list, remove: remove, restore: restore, saveCurrent: saveCurrent, isRestoredRun: isRestoredRun, registerPayload: registerPayload, get: get, currentRecord: currentRecord, _snapshotFor: snapshotFor, STORE: STORE, note: note };
})();
