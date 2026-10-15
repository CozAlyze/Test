/* SAVED VEDIC LIBRARY · SL1.7 r1 (Oct 6 2026, local build for review)
   SL1.7 r1: a text counts as complete only with all three pages present, in order, each with content.
   SL1.7: the full Current Life Cycle reading (Current Season, Key Time Windows, What Comes Next) is saved
   with a Vedic chart. Those three pages compose their text at display time from the run's own
   cozChartJSON (no model, nothing stored), so at the save tap the record is marked pending for that exact
   run ID + fingerprint, the three live pages are rendered in hidden frames (opened read-only with
   ?in=compare&lcCapture=1, so neither this library nor coz-saved.js acts inside them), and their rendered
   text is copied, in order, into the same record (rec.library.vedic.lifeCycle.text), stamped with the
   capture time. The live chart must match the record (run ID AND fingerprint) before and after rendering;
   otherwise nothing is written and the text stays pending. A page that fails closed makes the text
   "unavailable"; three timed-out attempts do too. A complete text is kept exactly on later saves.
   Pending text is completed by any later page of the SAME live run (the save normally lands on the saved
   chart page); a record whose text was never requested is never changed by opening anything. No model,
   no new chart calculation, no change to the three Life Cycle pages.
   SL1.6 (Oct 2 2026)
   SL1.6: a chart page shown inside a saved comparison (?in=compare) is read-only: no capture, no
   fill, no retries, no listeners. load() still reads the selected record. Nothing else changed.
   SL1.5 (Sep 30 2026)
   SL1.5 (Chat's review of SL1.4):
   (a) Provenance must be explicit; unknown fails closed. A reading is stored only with evidence
       of the path that produced it:
       - server: the generation trace names a server job, and the start stamp recorded when that
         job started on this device matches ALL FOUR: job ID, run ID, fingerprint, Sections 1-2 hash;
       - browser: the trace is a browser trace AND a cozGenDraft for this run + fingerprint exists
         whose Sections 1-2 hash matches and whose Sections 3-6 equal the reading's;
       - reviewed: no trace AND the review engine's meta says development-review-draft with a
         matched reviewed-draft label and identity key.
       Anything else (no trace and no reviewed evidence, unknown trace) is not stored and is flagged.
   (b) The server start stamp is bound to its job: {runId, fingerprint, s12, jobId}. The job ID is
       bound once, from this run's job record, when the start response writes it; a follow never
       rebinds; a new start (after a refused start) makes a new stamp.
   (c) Every stored reading is re-verified before it is filled or saved (evidence present, run ID +
       fingerprint equal to the record, Sections 1-2 hash recomputed from the stored text).
   (d) Restored charts: missing pieces are filled from an already verified, matching capture with
       the same preservation and one-record-one-capture rules. A restored chart never captures
       live content, never stamps or binds a job, never regenerates.
   SL1.4 (Chat's review of SL1.3):
   (a) Preserve means present. A saved reading or Lagna that is present in any form is kept
       exactly, even if it doesn't pass the six-section check; it is flagged for inspection
       (diagnostics), never replaced. Only a piece that is absent is filled.
   (b) Pending fills are retried. A fill whose Saved write failed stays pending and is retried
       from the stored capture (never regenerated) on every Vedic page, with back-off, until it
       lands. The reading-page watcher stops only when the capture is complete AND nothing is
       pending.
   (c) Failure message. "Your Vedic reading couldn't be saved on this device." The actual cause
       (QuotaExceededError, SecurityError, read-back mismatch, ...) is kept in diagnostics
       ("cozVedicSavedDiag", last 12) and in CozSavedVedic.status().
   (d) Version compatibility. A reading is stored only when its version is verified: a server
       reading's Sections 1-2 must hash-equal the Sections 1-2 sent when that server job started
       (recorded here at start); a browser-written reading is consistent by construction (its
       Sections 3-6 cache is keyed by the Sections 1-2 hash); a reviewed-draft reading is built
       whole. And one record holds one capture: a missing piece is filled only when every piece
       the record already holds is content-identical to the same capture; otherwise nothing is
       filled and the record is flagged.
   SL1.3: per-run capture store ("cozVedicSavedCapture", run ID + fingerprint, first capture
   wins, live runs only, never a restored one, max 4 runs); capture from any Vedic page; fill in
   place without creating records; strict run ID + fingerprint; writes read back.
   SL1.2 (Sep 23): CAPTURE at save time through CozSaved.registerPayload into rec.library.vedic;
   READ on the Saved Library pages through CozSavedVedic.load(). Life Cycle capture unchanged.
   Requires coz-saved.js loaded first. Never calculates. Never calls the model. */
(function () {
  if (window.CozSavedVedic || !window.CozSaved) return;
  var SIGNS = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
  var SECTIONS = [
    { id: "essential-nature",     number: 1, title: "Your Essential Nature & Guiding Planet" },
    { id: "mind-intuition",       number: 2, title: "Your Mind, Intuition & Spiritual Patterning" },
    { id: "relationships-karmic", number: 3, title: "Relationships, Desire & Karmic Exchange" },
    { id: "dharma-direction",     number: 4, title: "Dharma, Work & Life Direction" },
    { id: "rahu-ketu",            number: 5, title: "Rahu & Ketu \u2014 Growth, Release & Balance" },
    { id: "essential-takeaway",   number: 6, title: "Your Essential Takeaway" }
  ];
  var CAP_KEY = "cozVedicSavedCapture", DIAG_KEY = "cozVedicSavedDiag", JOB_KEY = "cozVedicServerJob", MAX_RUNS = 4;
  var PAGE = (location.pathname.split("/").pop() || "").replace(/\.html$/, "");
  var READ_ONLY = /[?&](in=compare|lcCapture=1)\b/.test(location.search);       /* SL1.7: lcCapture frames are read-only too */
  var LC_PAGES = [                                                               /* SL1.7: in the order the live pages read */
    { id: "current-season",   title: "Your Current Season", panel: "csPanel",  empty: ".cs-empty"  },
    { id: "key-time-windows", title: "Key Time Windows",    panel: "ktwPanel", empty: ".ktw-empty" },
    { id: "what-comes-next",  title: "What Comes Next",     panel: "wcnPanel", empty: ".wcn-empty" }
  ];
  var LC_TIMEOUT_MS = 15000, LC_MAX_ATTEMPTS = 3;
  var MEM = { s12Start: {}, diag: [], told: false, flagged: {}, unverified: {} };

  function parse(s){ try { return JSON.parse(s || "null"); } catch (e) { return null; } }
  function lsGet(k){ try { return localStorage.getItem(k); } catch (e) { return null; } }
  function clone(o){ return JSON.parse(JSON.stringify(o)); }
  function present(v){ return v !== undefined && v !== null; }
  function storeKey(){ return window.CozSaved.STORE || "cozSavedCharts"; }
  function restoredNow(){ try { return !!(window.CozSaved.isRestoredRun && window.CozSaved.isRestoredRun()); } catch (e) { return false; } }
  function hash(s){ var h = 0; for (var i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) | 0; } return (h >>> 0).toString(36); }
  function s12Of(r){ return r ? hash(JSON.stringify([r["essential-nature"] || [], r["mind-intuition"] || []])) : null; }

  function strictMatch(run, rec){
    return !!(run && rec && run.runId && run.fingerprint && rec.runId && rec.fingerprint &&
              run.runId === rec.runId && run.fingerprint === rec.fingerprint);
  }
  function runMatches(run, rec){                                           /* SL1.2, Life Cycle only */
    if (!run || !rec || !rec.runId || run.runId !== rec.runId) return false;
    if (run.fingerprint && rec.fingerprint && run.fingerprint !== rec.fingerprint) return false;
    return true;
  }
  function recordChart(rec, strict){
    var c = parse(rec && rec.snapshot && rec.snapshot.cozChartJSON);
    if (!c || !Array.isArray(c.planets)) return null;
    return (strict ? strictMatch(c.run, rec) : runMatches(c.run, rec)) ? c : null;
  }
  function ascSign(chart){
    if (!chart) return null;
    var a = Array.isArray(chart.planets) ? chart.planets.filter(function (p) { return p && p.name === "Ascendant"; })[0] : null;
    var n = a ? a.signNumber : chart.ascendantSignNumber;
    return (n >= 1 && n <= 12) ? SIGNS[n - 1] : null;
  }
  function sectionList(){
    var live = null;
    try { live = (typeof vedicReadingSections !== "undefined" && Array.isArray(vedicReadingSections)) ? vedicReadingSections : null; } catch (e) {}
    return (live || SECTIONS).map(function (s) { return { id: s.id, number: s.number, title: s.title }; });
  }
  function readingOk(cap){ return !!(cap && cap.sections && Array.isArray(cap.order) && cap.order.length &&
      cap.order.every(function (sec) { return sec && Array.isArray(cap.sections[sec.id]) && cap.sections[sec.id].length > 0; })); }
  function lagnaOk(cap){ return !!(cap && cap.sign); }
  /* content identity, ignoring capture metadata (time, run stamp, version) */
  function readingText(c){ try { return JSON.stringify(c.order.map(function (s) { return [s.id, c.sections[s.id]]; })); } catch (e) { return "?" + JSON.stringify(c); } }
  function lagnaText(c){ return JSON.stringify([c.sign, c.title || null, c.ruler || null, c.shared || [], c.essence || [], c.dharma || []]); }

  /* ---- diagnostics: the real cause is kept; the person sees one plain sentence ---- */
  function diag(what, detail){
    var d = { at: new Date().toISOString(), page: PAGE, what: what, detail: detail || null };
    MEM.diag.unshift(d); MEM.diag = MEM.diag.slice(0, 12);
    try { var a = parse(lsGet(DIAG_KEY)); a = Array.isArray(a) ? a : []; a.unshift(d); localStorage.setItem(DIAG_KEY, JSON.stringify(a.slice(0, 12))); } catch (e) {}
    try { console.log("[SAVED VEDIC] " + what + (detail ? " · " + JSON.stringify(detail) : "")); } catch (e) {}
  }
  function cause(err){ return err ? ((err.name && err.name !== "Error" ? err.name + ": " : "") + (err.message || String(err))) : "unknown"; }
  function fail(what, err){
    diag("write failed: " + what, { cause: cause(err) });
    if (MEM.told || window.COZ_PREGEN) return;                              /* hidden pre-write copy only logs */
    MEM.told = true;
    try { alert("Your Vedic reading couldn't be saved on this device."); } catch (e) {}
  }
  function flagOnce(key, what, detail){ if (MEM.flagged[key]) return; MEM.flagged[key] = true; diag(what, detail); }
  function writeVerified(key, obj){
    var s = JSON.stringify(obj);
    localStorage.setItem(key, s);
    if (localStorage.getItem(key) !== s) { var e = new Error("read-back mismatch"); e.name = "ReadBackMismatch"; throw e; }
  }

  /* ---- live run ---- */
  function liveRun(){
    var bd = parse(lsGet("emergeBirthData")), chart = parse(lsGet("cozChartJSON"));
    if (!bd || !bd.runId || !bd.fingerprint || !chart || !Array.isArray(chart.planets)) return null;
    var run = { runId: bd.runId, fingerprint: bd.fingerprint };
    return strictMatch(chart.run, run) ? { run: run, chart: chart } : null;
  }

  /* ---- capture store ---- */
  function readCache(){
    var c = parse(lsGet(CAP_KEY));
    if (!c || typeof c !== "object" || !c.runs || typeof c.runs !== "object") c = { version: 1, runs: {} };
    return c;
  }
  function entryFor(rec){
    var e = rec && readCache().runs[rec.runId];
    return e && strictMatch(e.run, rec) ? e : null;
  }
  function writeCache(cache, keepId){
    var ids = Object.keys(cache.runs).sort(function (a, b) { return String(cache.runs[b].storedAt).localeCompare(String(cache.runs[a].storedAt)); });
    ids.slice(MAX_RUNS).forEach(function (id) { if (id !== keepId) delete cache.runs[id]; });
    try { writeVerified(CAP_KEY, cache); return true; }
    catch (err1) {
      Object.keys(cache.runs).forEach(function (id) { if (id !== keepId) delete cache.runs[id]; });
      try { writeVerified(CAP_KEY, cache); return true; } catch (err2) { fail("capture store for " + keepId, err2); return false; }
    }
  }

  /* (d) the Sections 1-2 a server job was started with, recorded as the job starts on this page */
  function noteServerStart(p){
    if (!p || !p.run || !p.run.runId || !p.run.fingerprint || restoredNow()) return;
    var run = { runId: p.run.runId, fingerprint: p.run.fingerprint }, s12 = s12Of(p);
    var job = parse(lsGet(JOB_KEY));
    var following = !!(job && job.jobId && job.runId === run.runId && job.fingerprint === run.fingerprint);
    var cache = readCache(), e = cache.runs[run.runId];
    if (e && !strictMatch(e.run, run)) e = null;
    e = e || { run: run, reading: null, lagna: null };
    if (following) { if (e.serverStart) MEM.s12Start[run.runId] = e.serverStart; return; }   /* a follow never resets the start */
    e.serverStart = { runId: run.runId, fingerprint: run.fingerprint, s12: s12, jobId: null, at: new Date().toISOString() };
    MEM.s12Start[run.runId] = e.serverStart;
    e.storedAt = e.storedAt || e.serverStart.at;
    cache.runs[run.runId] = e;
    writeCache(cache, run.runId);
  }
  /* (b) bind the job ID once, from this run's own job record, after the start response wrote it */
  function bindServerJob(){
    if (restoredNow()) return;
    var L = liveRun(); if (!L) return;
    var cache = readCache(), e = cache.runs[L.run.runId];
    if (!e || !strictMatch(e.run, L.run) || !e.serverStart || e.serverStart.jobId) return;
    var st = e.serverStart;
    if (st.runId !== L.run.runId || st.fingerprint !== L.run.fingerprint) return;
    var job = parse(lsGet(JOB_KEY));
    if (!job || !job.jobId || job.runId !== st.runId || job.fingerprint !== st.fingerprint) return;
    st.jobId = job.jobId; st.boundAt = new Date().toISOString();
    MEM.s12Start[L.run.runId] = st;
    writeCache(cache, L.run.runId);
  }
  if (PAGE === "vedic-reading") {
    (function () {
      var held;
      try {
        Object.defineProperty(window, "COZ_VEDIC_PARTIAL", { configurable: true, enumerable: true,
          get: function () { return held; },
          set: function (v) { held = v; try { noteServerStart(v); } catch (e) {} } });
      } catch (e) {}
    })();
  }
  var S36 = ["relationships-karmic", "dharma-direction", "rahu-ketu", "essential-takeaway"];
  function browserDraft(r, run, s12){
    var i, k, d;
    try {
      for (i = 0; i < localStorage.length; i++) {
        k = localStorage.key(i);
        if (!k || k.indexOf("cozGenDraft:") !== 0) continue;
        d = parse(lsGet(k));
        if (!d || !d.inputs || !d.sections || d.inputs.runId !== run.runId || d.inputs.fingerprint !== run.fingerprint || d.inputs.s12Hash !== s12) continue;
        if (S36.every(function (id) { return JSON.stringify(d.sections[id] || null) === JSON.stringify(r[id] || null); })) return k;
      }
    } catch (x) {}
    return null;
  }
  function readingVersion(r, run, e){
    var s12 = s12Of(r), t = window.COZ_VEDIC_GEN_TRACE || null, m = window.COZ_VEDIC_REVIEW_META || null;
    var base = { s12: s12, runId: run.runId, fingerprint: run.fingerprint };
    function no(path, why){ return Object.assign({ verified: false, path: path, why: why }, base); }
    if (t && t.server) {
      var st = (e && e.serverStart) || MEM.s12Start[run.runId] || null;
      if (!st) return no("server", "server job start not recorded on this device");
      if (!st.jobId) return no("server", "server job start not bound to a job");
      if (!t.jobId || t.jobId !== st.jobId) return no("server", "result job " + (t.jobId || "none") + " is not the started job " + st.jobId);
      if (st.runId !== run.runId || st.fingerprint !== run.fingerprint) return no("server", "start stamp belongs to another run or birth");
      if (st.s12 !== s12) return no("server", "Sections 1-2 differ from those the job was started with");
      return Object.assign({ verified: true, path: "server", job: st.jobId, gen: t.server }, base);
    }
    if (t) {
      if (r._generated36 !== true) return no("browser", "browser trace without generated Sections 3-6");
      var dk = browserDraft(r, run, s12);
      if (!dk) return no("browser", "no matching Sections 3-6 draft for this run and Sections 1-2");
      return Object.assign({ verified: true, path: "browser", draft: dk }, base);
    }
    if (m && m.mode === "development-review-draft" && typeof m.sections3to6Source === "string" && m.identityKey &&
        !/no identity match/i.test(m.sections3to6Source)) {
      return Object.assign({ verified: true, path: "reviewed", label: m.sections3to6Source, identityKey: m.identityKey,
                             draftUnverified: !!m.sections3to6Unverified }, base);
    }
    return no("unknown", "no generation trace and no reviewed-draft evidence");
  }
  /* (c) re-verify a stored capture before it goes into a record */
  function versionOk(cap, rec){
    var v = cap && cap.version;
    if (!v || v.verified !== true || v.runId !== rec.runId || v.fingerprint !== rec.fingerprint) return false;
    if (!readingOk(cap)) return false;
    var r = {}; r["essential-nature"] = cap.sections["essential-nature"]; r["mind-intuition"] = cap.sections["mind-intuition"];
    if (s12Of(r) !== v.s12) return false;
    if (v.path === "server") return !!v.job;
    if (v.path === "browser") return !!v.draft;
    if (v.path === "reviewed") return !!(v.label && v.identityKey);
    return false;
  }
  function buildReading(r, run, e){
    if (!r || typeof r !== "object" || !strictMatch(r.run, run)) return null;
    var order = sectionList(), sections = {}, complete = true;
    order.forEach(function (s) {
      var paras = Array.isArray(r[s.id]) ? r[s.id].filter(function (p) { return typeof p === "string" && p.trim(); }) : [];
      if (!paras.length) complete = false;
      sections[s.id] = paras;
    });
    if (!complete) return null;
    var v = readingVersion(r, run, e);
    if (!v.verified) { MEM.unverified[run.runId] = true; flagOnce("ver:" + run.runId + ":" + v.s12, "reading not captured: version unverified", { run: run.runId, why: v.why }); return null; }
    return { order: order, sections: sections, run: { runId: run.runId, fingerprint: run.fingerprint }, version: v, capturedAt: new Date().toISOString() };
  }
  function buildLagna(chart, run){
    var bank = window.COZ_LAGNA_BANK, sign = ascSign(chart);
    if (!bank || !bank.signs || !sign) return null;
    var S = bank.signs[sign.toLowerCase()];
    if (!S) return null;
    var out = {
      sign: sign, ruler: S.ruler || null, title: S.title || (sign + " Rising").toUpperCase(),
      shared: (bank.shared || []).slice(), essence: (S.essence || []).slice(), dharma: (S.dharma || []).slice(),
      run: { runId: run.runId, fingerprint: run.fingerprint }, capturedAt: new Date().toISOString()
    };
    out.version = { text: hash(lagnaText(out)) };
    return out;
  }
  function storeLive(){
    if (restoredNow()) return false;
    bindServerJob();
    var L = liveRun(); if (!L) return false;
    var cache = readCache(), e = cache.runs[L.run.runId];
    if (e && !strictMatch(e.run, L.run)) e = null;
    e = e || { run: L.run, reading: null, lagna: null };
    var changed = false;
    if (!present(e.reading)) { var r = buildReading(window.COZ_VEDIC_READING, L.run, e); if (r) { e.reading = r; changed = true; } }
    if (!present(e.lagna))   { var g = buildLagna(L.chart, L.run);                     if (g) { e.lagna = g;   changed = true; } }
    if (!changed) return false;                                            /* first capture wins */
    e.storedAt = new Date().toISOString();
    cache.runs[L.run.runId] = e;
    return writeCache(cache, L.run.runId);
  }

  /* ---- (d) one record, one capture: may piece `name` from entry e go into this record? ---- */
  function compatible(rec, lib, e, name){
    var other = name === "reading" ? "lagna" : "reading";
    if (!present(lib[other])) return true;
    if (!present(e[other])) return false;                                  /* can't verify against nothing */
    return other === "reading" ? (readingOk(lib.reading) && readingText(lib.reading) === readingText(e.reading))
                               : (lagnaOk(lib.lagna) && lagnaText(lib.lagna) === lagnaText(e.lagna));
  }
  /* what this record may receive from its capture, and why not when it may not */
  function planFor(rec){
    var out = { reading: null, lagna: null };
    if (!rec || rec.kind !== "chart" || !rec.systems || rec.systems.vedic !== true) return out;
    var e = entryFor(rec); if (!e) return out;
    var lib = (rec.library && rec.library.vedic) || {};
    if (present(lib.reading) && !readingOk(lib.reading)) flagOnce("keep-r:" + rec.id, "kept an existing saved reading that fails the six-section check (inspect)", { record: rec.id });
    if (present(lib.lagna) && !lagnaOk(lib.lagna))       flagOnce("keep-l:" + rec.id, "kept an existing saved Lagna without a sign (inspect)", { record: rec.id });
    if (!present(lib.reading) && readingOk(e.reading) && strictMatch(e.reading.run, rec) && versionOk(e.reading, rec)) {
      if (compatible(rec, lib, e, "reading")) out.reading = e.reading;
      else flagOnce("mix-r:" + rec.id, "reading not filled: record holds content from a different capture (inspect)", { record: rec.id });
    }
    if (!present(lib.lagna) && lagnaOk(e.lagna) && strictMatch(e.lagna.run, rec)) {
      var sign = ascSign(recordChart(rec, true));
      if (sign && sign === e.lagna.sign) {
        if (compatible(rec, lib, e, "lagna")) out.lagna = e.lagna;
        else flagOnce("mix-l:" + rec.id, "Lagna not filled: record holds content from a different capture (inspect)", { record: rec.id });
      }
    }
    return out;
  }
  function pending(){
    var store = parse(lsGet(storeKey())), n = 0;
    if (!store || !Array.isArray(store.records)) return 0;
    store.records.forEach(function (rec) { var p = planFor(rec); if (p.reading || p.lagna) n++; });
    return n;
  }

  /* ---- fill in place ---- */
  function fillAll(){
    if (!Object.keys(readCache().runs).length) return { filled: 0, pending: 0 };
    var raw = lsGet(storeKey()), store = parse(raw);
    if (!store || !Array.isArray(store.records)) return { filled: 0, pending: 0 };
    var filled = [];
    store.records.forEach(function (rec) {
      var p = planFor(rec); if (!p.reading && !p.lagna) return;
      rec.library = rec.library || {};
      var lib = rec.library.vedic || {};
      if (p.reading) lib.reading = clone(p.reading);
      if (p.lagna) lib.lagna = clone(p.lagna);
      rec.library.vedic = lib;
      rec.readings = rec.readings || {};
      rec.readings.vedicReading = readingOk(lib.reading);
      var flags = [];                                                     /* the Saved definition (coz-saved.js CS1.4) */
      if (rec.systems.vedic) flags.push(!!rec.readings.vedicReading);
      if (rec.systems.tropical) flags.push(!!rec.readings.tropicalReading);
      if (flags.length) rec.complete = flags.every(Boolean);
      rec.updatedAt = new Date().toISOString();
      filled.push(rec.id);
    });
    if (!filled.length) return { filled: 0, pending: 0 };
    try { writeVerified(storeKey(), store); }
    catch (err) { fail("fill of saved record " + filled.join(","), err); return { filled: 0, pending: filled.length }; }
    diag("saved record completed in place", { records: filled });
    try { window.dispatchEvent(new CustomEvent("COZ_SAVED_VEDIC_FILLED", { detail: { ids: filled } })); } catch (e) {}
    return { filled: filled.length, pending: 0 };
  }

  /* ---- capture at save time, from any Vedic page; a present piece is never replaced ---- */
  function payload(rec){
    var lib = (rec.library && rec.library.vedic) || {};
    var out = { reading: null, lagna: null, lifeCycle: lifeCycleOut(rec, lib) };
    if (present(lib.reading) && present(lib.lagna)) { planFor(rec); return out; }   /* both kept; flags if odd */
    storeLive();
    var e = entryFor(rec);
    if (!e && !restoredNow() && strictMatch((liveRun() || {}).run, rec)) {           /* store unwritable: build directly */
      var L = liveRun();
      e = { run: L.run, reading: buildReading(window.COZ_VEDIC_READING, L.run, null), lagna: buildLagna(L.chart, L.run) };
    }
    if (!e) return out;
    if (!present(lib.reading) && readingOk(e.reading) && strictMatch(e.reading.run, rec) && versionOk(e.reading, rec) &&
        compatible(rec, lib, e, "reading")) out.reading = clone(e.reading);
    var sign = ascSign(recordChart(rec, true));
    if (!present(lib.lagna) && lagnaOk(e.lagna) && strictMatch(e.lagna.run, rec) && sign === e.lagna.sign &&
        compatible(rec, out.reading ? { reading: out.reading } : lib, e, "lagna")) out.lagna = clone(e.lagna);
    return out;
  }
  function captureLifeCycle(rec){                                           /* unchanged from SL1.2 */
    var chart = recordChart(rec, false);
    var lc = chart && chart.lifeCycle;
    if (!lc || !lc.mahadasha) return null;
    return { data: JSON.parse(JSON.stringify(lc)), capturedAt: new Date().toISOString() };
  }
  /* ---- SL1.7: the full Life Cycle reading ---- */
  function textComplete(t, rec){
    return !!(t && t.status === "complete" && rec && t.runId === rec.runId && t.fingerprint === rec.fingerprint &&
              Array.isArray(t.pages) && t.pages.length === LC_PAGES.length &&
              LC_PAGES.every(function (pg, i) { var x = t.pages[i]; return x && x.id === pg.id && Array.isArray(x.blocks) && x.blocks.length > 0; }));   /* r1: all three, in order */
  }
  function lifeCycleOut(rec, lib){
    var lc = captureLifeCycle(rec);
    if (!lc) return null;
    var prev = lib.lifeCycle && lib.lifeCycle.text;
    if (!(rec.kind === "chart" && rec.systems && rec.systems.vedic)) { if (prev) lc.text = prev; return lc; }   /* Vedic chart records only */
    if (textComplete(prev, rec)) { lc.text = prev; return lc; }                 /* a complete text is kept exactly */
    var L = liveRun();
    if (!READ_ONLY && L && strictMatch(L.run, rec)) {
      lc.text = { status: "pending", runId: rec.runId, fingerprint: rec.fingerprint, requestedAt: new Date().toISOString(),
                  attempts: (prev && prev.status === "pending" && prev.runId === rec.runId && prev.fingerprint === rec.fingerprint && prev.attempts) || 0 };
      setTimeout(captureText, 0);                                               /* after the save has been written */
    } else lc.text = prev || null;
    return lc;
  }
  function pendingRecords(L){
    var s = parse(lsGet(storeKey())), out = [];
    (s && Array.isArray(s.records) ? s.records : []).forEach(function (r) {
      var t = r && r.kind === "chart" && r.library && r.library.vedic && r.library.vedic.lifeCycle && r.library.vedic.lifeCycle.text;
      if (t && t.status === "pending" && t.runId === r.runId && t.fingerprint === r.fingerprint && strictMatch(L.run, r)) out.push(r.id);
    });
    return out;
  }
  function blocksOf(panel){
    var out = [];
    Array.prototype.forEach.call(panel.querySelectorAll("p, h1, h2, h3"), function (n) {
      if (n.closest(".cs-explore, .ktw-explore, .wcn-explore, nav, [aria-hidden='true']")) return;
      var c = n.cloneNode(true);
      Array.prototype.forEach.call(c.querySelectorAll("br"), function (b) { b.parentNode.replaceChild(document.createTextNode(" "), b); });
      var t = (c.textContent || "").replace(/\s+/g, " ").trim();
      if (t) out.push({ k: String(n.className || n.tagName.toLowerCase()).split(" ")[0], t: t });
    });
    return out;
  }
  function renderPage(pg){
    return new Promise(function (resolve) {
      var f = document.createElement("iframe"), t0 = Date.now(), timer = null, done = false;
      f.setAttribute("aria-hidden", "true"); f.tabIndex = -1;
      f.style.cssText = "position:fixed;left:-10000px;top:0;width:390px;height:844px;border:0;opacity:0;pointer-events:none";
      function finish(r){ if (done) return; done = true; clearInterval(timer); try { f.remove(); } catch (e) {} resolve(r); }
      timer = setInterval(function () {
        var d = null; try { d = f.contentDocument; } catch (e) {}
        var panel = d && d.getElementById(pg.panel);
        if (panel && panel.querySelector(pg.empty)) return finish({ failed: true });
        if (panel && panel.querySelector("h1") && panel.querySelector("p")) return finish({ blocks: blocksOf(panel) });
        if (Date.now() - t0 > LC_TIMEOUT_MS) finish({ timeout: true });
      }, 200);
      f.src = pg.id + ".html?in=compare&lcCapture=1&t=" + Date.now();
      document.body.appendChild(f);
    });
  }
  var lcBusy = false;
  function captureText(){
    if (lcBusy || READ_ONLY || !document.body) return;
    var L = liveRun(); if (!L) return;
    var ids = pendingRecords(L); if (!ids.length) return;
    lcBusy = true;
    var results = [];
    LC_PAGES.reduce(function (p, pg) { return p.then(function () { return renderPage(pg).then(function (r) { results.push(r); }); }); }, Promise.resolve())
      .then(function () {
        var L2 = liveRun();
        if (!L2 || !strictMatch(L2.run, L.run)) { diag("life cycle text not written: the live chart changed while rendering", { records: ids }); return; }
        var s = parse(lsGet(storeKey())); if (!s || !Array.isArray(s.records)) return;
        var now = new Date().toISOString(), wrote = [];
        s.records.forEach(function (r) {
          if (ids.indexOf(r.id) < 0) return;
          var lc = r.library && r.library.vedic && r.library.vedic.lifeCycle, t = lc && lc.text;
          if (!t || t.status !== "pending" || t.runId !== r.runId || t.fingerprint !== r.fingerprint || !strictMatch(L2.run, r)) return;
          if (results.some(function (x) { return x.failed; }))
            lc.text = { status: "unavailable", reason: "a Life Cycle page could not compose this chart", runId: r.runId, fingerprint: r.fingerprint, requestedAt: t.requestedAt, at: now };
          else if (results.some(function (x) { return x.timeout || !x.blocks || !x.blocks.length; })) {
            t.attempts = (t.attempts || 0) + 1;
            if (t.attempts >= LC_MAX_ATTEMPTS) lc.text = { status: "unavailable", reason: "the Life Cycle pages did not finish loading", runId: r.runId, fingerprint: r.fingerprint, requestedAt: t.requestedAt, at: now };
          }
          else lc.text = { status: "complete", runId: r.runId, fingerprint: r.fingerprint, requestedAt: t.requestedAt, capturedAt: now,
                           pages: LC_PAGES.map(function (pg, i) { return { id: pg.id, title: pg.title, blocks: results[i].blocks }; }) };
          r.updatedAt = now; wrote.push(r.id);
        });
        if (!wrote.length) return;
        try { writeVerified(storeKey(), s); } catch (err) { fail("life cycle text for saved record " + wrote.join(","), err); return; }
        diag("life cycle text saved", { records: wrote });
        try { window.dispatchEvent(new CustomEvent("COZ_SAVED_VEDIC_LC_FILLED", { detail: { ids: wrote } })); } catch (e) {}
      })
      .catch(function (e) { diag("life cycle text capture error", { error: String(e && e.message) }); })
      .then(function () { lcBusy = false; });
  }
  window.CozSaved.registerPayload("vedic", payload);

  /* ---- triggers ---- */
  var watch = null, retry = null, retryMs = 1500;
  function scheduleRetry(){
    if (retry) return;
    retry = setTimeout(function () {
      retry = null;
      var r = fillAll();
      if (r.pending || pending()) { retryMs = Math.min(retryMs * 2, 30000); scheduleRetry(); } else retryMs = 1500;
    }, retryMs);
  }
  function pass(){
    try { storeLive(); var r = fillAll(); if (r.pending) scheduleRetry(); } catch (e) {}
    try { captureText(); } catch (e) {}                                        /* SL1.7: completes a pending Life Cycle text for the live run only */
  }
  function watchLive(){
    try { storeLive(); var r = fillAll(); if (r.pending) scheduleRetry(); } catch (e) {}
    var L = liveRun(), e = L ? readCache().runs[L.run.runId] : null;
    var settled = e && strictMatch(e.run, L.run) && (present(e.reading) || MEM.unverified[L.run.runId]) && present(e.lagna);
    var done = restoredNow() || !L || (settled && !pending() && !retry);
    if (done && watch) { clearInterval(watch); watch = null; }
  }
  if (!READ_ONLY) {                                                         /* SL1.6/SL1.7: read-only inside a saved comparison or a capture frame */
  pass();                                                                   /* before a Saved page renders */
  if (PAGE === "vedic-reading" && !restoredNow()) watch = setInterval(watchLive, 1000);
  ["COZ_VEDIC_READING_COMPLETE", "COZ_VEDIC_SERVER_UPDATE", "pageshow"].forEach(function (ev) { window.addEventListener(ev, pass); });
  window.addEventListener("storage", function (ev) { if (ev && (ev.key === CAP_KEY || ev.key === storeKey() || ev.key === null)) pass(); });
  if (document.readyState === "complete") setTimeout(pass, 0); else window.addEventListener("load", function () { setTimeout(pass, 0); });
  }

  /* ---- read (unchanged) ---- */
  function load(){
    var id = null; try { id = new URLSearchParams(location.search).get("id"); } catch (e) {}
    var rec = null;
    if (id) { rec = window.CozSaved.get(id); if (!rec) return null; }
    else rec = window.CozSaved.currentRecord();
    if (!rec || !rec.snapshot) return null;
    var chart = parse(rec.snapshot.cozChartJSON);
    var lib = (rec.library && rec.library.vedic) || {};
    return {
      rec: rec, id: rec.id, chart: chart, library: lib,
      has: { reading: !!(lib.reading && lib.reading.sections), lagna: !!(lib.lagna && lib.lagna.sign), lifeCycle: !!(lib.lifeCycle && lib.lifeCycle.data),
             lifeCycleText: textComplete(lib.lifeCycle && lib.lifeCycle.text, rec) },
      name: rec.name || (chart && chart.person && chart.person.name) || "",
      birth: (chart && chart.birth) || {}
    };
  }
  function href(page, id){ return page + "?saved=1&id=" + encodeURIComponent(id || ""); }
  function status(){
    var L = liveRun(), e = L ? readCache().runs[L.run.runId] : null, rec = null;
    try { rec = window.CozSaved.currentRecord(); } catch (x) {}
    var lib = (rec && rec.library && rec.library.vedic) || {};
    var last = (parse(lsGet(DIAG_KEY)) || MEM.diag)[0];
    return "SL1.5 | run " + (L ? L.run.runId : "none") +
      " | stored reading " + (e && present(e.reading) ? "yes" : "no") + ", lagna " + (e && present(e.lagna) ? "yes" : "no") +
      " | record " + (rec ? rec.id + " reading " + (present(lib.reading) ? "yes" : "no") + ", lagna " + (present(lib.lagna) ? "yes" : "no") : "none") +
      " | pending " + pending() + " | last " + (last ? last.what + (last.detail ? " " + JSON.stringify(last.detail) : "") : "none");
  }
  function lcLive(rec){ var L = liveRun(); return !!(L && rec && strictMatch(L.run, rec)); }      /* SL1.7: is this record's run the live chart? */
  window.CozSavedVedic = { load: load, href: href, SECTIONS: SECTIONS, fill: fillAll, pending: pending, status: status,
                           LC_PAGES: LC_PAGES, lcLive: lcLive, captureLifeCycleText: captureText,
                           diagnostics: function () { return (parse(lsGet(DIAG_KEY)) || MEM.diag).slice(); }, _store: storeLive };
})();
