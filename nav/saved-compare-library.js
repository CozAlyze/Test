/* SAVED COMPARE LIBRARY · SCL1.2 (Oct 2 2026, local build for review)
   SCL1.2 (Chat): (1) timing is calculated fresh when Save is tapped, with COZ_TIMING.loadFresh()
   (CT3.4), never the result a Current Timing page cached when it opened; a result whose "now" is
   earlier than the tap is refused, and an engine without loadFresh() (an old cached copy) is
   recorded as a timing failure rather than used. (2) prepareSave(start) is bound to the run that
   was current when Save was tapped; discard() drops a prepared result when coz-saved.js stops a
   save because the run changed. Restored comparisons still keep their frozen timing.
   SCL1.1 (Chat): parts(rec) is the ONE completeness rule, used both by coz-saved.js when saving and by
   SCL1.1 (Chat): parts(rec) is the ONE completeness rule, used both by coz-saved.js when saving and by
   load() when showing; a part counts only when the saved document would actually show it.
   The Compare Saved Library's data module. Its own payload name ("compare"); never loads, calls or
   reads the Vedic or Tropical library modules (Sep 23 boundary). coz-saved.js loads it on demand
   when a Compare page is saved; saved-compare-document.html loads it to read a saved comparison.
   No model call anywhere in this file.

   CAPTURE (Jason's ruling T2): Current Timing is calculated at the moment the customer saves the
   Compare chart, with the existing calculation (compare-current-timing.js, the same one the Current
   Timing pages use, run fresh through loadFresh() since SCL1.2), stamped with its "as of" time and stored with the Compare
   record as rec.library.compare.timing. The result must carry this run's run ID AND fingerprint.
   If the calculation fails, the record is still saved and rec.library.compare.timingError says why;
   a re-save that fails never erases timing already saved. A reopened (restored) comparison is never
   recalculated: its saved timing stays exactly as it was.

   READ (load(id)): one Compare record only, from its own snapshot and library. Every piece used must
   carry the record's run ID and fingerprint. A part with no candidate is "missing"; with more than
   one complete candidate it is "unverified" and not shown. Timing that failed at save is "failed". */
(function () {
  if (window.CozSavedCompare || !window.CozSaved) return;
  var VERSION = "SCL1.2";

  function lsGet(k){ try { return localStorage.getItem(k); } catch (e) { return null; } }
  function parse(v){ try { return typeof v === "string" ? JSON.parse(v) : (v || null); } catch (e) { return null; } }
  function sameRun(a, rec){ return !!(a && rec && a.runId && a.fingerprint && a.runId === rec.runId && a.fingerprint === rec.fingerprint); }
  function texts(list){ return Array.isArray(list) && list.length > 0 && list.every(function (t) { return typeof t === "string" && t.trim(); }); }

  /* ---------------- capture at save (T2) ---------------- */
  var DEPS = [
    ["Astronomy",    "https://cdn.jsdelivr.net/npm/astronomy-engine@2.1.19/astronomy.browser.min.js"],
    ["COZ_GRAHA",    "coz-graha.js"],
    ["CozDevReview", "dev-review-engine.js?v=8"],
    ["COZ_ASC",      "ascendant-library.js?v=5"],
    ["COZ_TIMING",   "compare-current-timing.js?v=6"]
  ];
  var TIMEOUT_MS = 25000;
  function loadScript(src){
    return new Promise(function (res, rej) {
      var s = document.createElement("script"); s.src = src; s.async = false;
      s.onload = function () { res(); }; s.onerror = function () { rej(new Error("could not load " + src)); };
      document.head.appendChild(s);
    });
  }
  function ensureDeps(){
    return DEPS.reduce(function (p, d) { return p.then(function () { return window[d[0]] ? null : loadScript(d[1]); }); }, Promise.resolve());
  }
  function day(iso){ var d = new Date(iso); return isNaN(d) ? "" : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }); }
  function cap(s){ return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function stamp(t){ return new Date(t).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }); }
  /* the Methodology facts, built exactly as compare-current-timing-reading.html builds them, frozen */
  function methodology(d){
    var v = d.vedic, t = d.tropical, lc = v.lifeCycle || {}, P = d.policy, calc = v.calculation || {}, st = t.settings || {}, cl = t.client || {};
    var year = lc.yearLengthDays ? (lc.mode === "synodic_354_fixed" ? "Synodic year, " : lc.mode + ", ") + String(lc.yearLengthDays) + " days" : null;
    var shown = d.fast.concat(d.slow ? [d.slow] : []);
    var active = shown.length ? shown.map(function (h) {
      var w = h.window;
      return h.planet + " " + h.aspect + " natal " + h.target + ", orb " + h.orb.toFixed(2) + "\u00B0, " + cap(h.status) +
        "\nIn orb " + (w.openStart ? "before " : "") + stamp(w.entry) + " to " + (w.openEnd ? "after " : "") + stamp(w.exit) +
        (w.passes.length ? "\nExact " + w.passes.map(stamp).join("; ") : (w.closest ? "\nNot exact in this window; closest " + stamp(w.closest.t) + ", " + w.closest.f.toFixed(2) + "\u00B0 from exact" : ""));
    }).join("\n") : "None within the current orbs";
    function rows(list){ return list.filter(function (r) { return r[1]; }); }
    return [
      { heading: "Vedic Life Cycle", rows: rows([
        ["Dasha system", lc.system === "vimshottari" ? "Vimshottari Dasha" : lc.system],
        ["Zodiac", "Sidereal"],
        ["Ayanamsha", calc.ayanamsha],
        ["Houses", calc.houses],
        ["Nodes", calc.nodes],
        ["Year length", year],
        ["Current Mahadasha", d.md.lord + ", " + day(d.md.startTimestamp) + " to " + day(d.md.endTimestamp)],
        ["Current Antardasha", d.ad.lord + ", " + day(d.ad.startTimestamp) + " to " + day(d.ad.endTimestamp)],
        ["Graha drishti", "Whole sign. Every graha aspects the 7th house from itself; Mars also the 4th and 8th, Jupiter the 5th and 9th, Saturn the 3rd and 10th. Rahu and Ketu are not assigned aspects."]
      ]) },
      { heading: "Tropical Transits", rows: rows([
        ["Zodiac", st.zodiac || "Tropical"],
        ["Calculated", stamp(d.now)],
        ["Natal chart", [cl.birthDate, cl.birthTime, cl.locationLabel].filter(Boolean).join(", ")],
        ["Natal houses", st.resolvedHouseSystem],
        ["Aspects and orbs", P.aspects.map(function (a) { return cap(a.type) + " " + a.angle + "\u00B0, orb " + a.orb + "\u00B0"; }).join("\n")],
        ["Angles and nodes", Object.keys(P.pointOrbCap).map(function (k) { return k + " " + P.pointOrbCap[k] + "\u00B0"; }).join(", ") + " maximum orb"],
        ["Transiting planets", P.fastPlanets.concat(P.slowPlanets).join(", ") + (P.moonIncluded ? ", Moon" : "; the Moon is not included")],
        ["Shown", P.announcementWindowDays ? "Contacts within orb, and up to " + P.announcementWindowDays + " days ahead" : "Only contacts already within orb"],
        ["Active transits", active],
        ["Exact", "An exact pass is the moment the aspect angle is actually reached. The status reads Exact while the orb is within " + P.exactThresholdDegrees + "\u00B0."],
        ["Nodes", (st.nodeType || P.nodeType) + " node"]
      ]) }
    ];
  }
  function snapshotTiming(d, run){
    var shown = d.fast.concat(d.slow ? [d.slow] : []);
    return {
      version: VERSION, runId: run.runId, fingerprint: run.fingerprint,
      asOf: d.now.toISOString(), capturedAt: new Date().toISOString(),
      engine: d.engine, policyVersion: d.policy && d.policy.version,
      tag: (d.text.tag || []).slice(),
      sections: (d.text.sections || []).map(function (s) { return { id: s.id, title: s.title, subtitle: s.subtitle, paras: (s.paras || []).slice() }; }),
      mahadasha: { lord: d.md.lord, start: d.md.startTimestamp, end: d.md.endTimestamp },
      antardasha: { lord: d.ad.lord, start: d.ad.startTimestamp, end: d.ad.endTimestamp },
      contacts: shown.map(function (h) { return { planet: h.planet, aspect: h.aspect, target: h.target, orb: h.orb, status: h.status }; }),
      methodology: methodology(d)
    };
  }

  var pending = null;   /* the result of the last prepareSave(), consumed by the "compare" payload */
  function prepareSave(start){
    var bd = start || parse(lsGet("emergeBirthData"));
    if (!bd || !bd.runId || !bd.fingerprint) { pending = null; return Promise.resolve({ ok: false, reason: "no chart run" }); }
    var run = { runId: bd.runId, fingerprint: bd.fingerprint };
    if (window.CozSaved.isRestoredRun()) { pending = { runId: run.runId, skip: true }; return Promise.resolve(pending); }
    var timer, tapped = Date.now();
    var work = ensureDeps().then(function () {
      if (typeof window.COZ_TIMING.loadFresh !== "function") throw new Error("compare-current-timing.js has no fresh calculation (an older cached copy is running)");
      return window.COZ_TIMING.loadFresh();
    }).then(function (d) {
      if (!d || !d.ok) throw new Error((d && d.reason) || "Current Timing could not be calculated");
      if (!(d.now instanceof Date) || d.now.getTime() < tapped) throw new Error("the timing calculation is older than the save");
      if (!sameRun(d.run, run)) throw new Error("the timing calculation belongs to a different chart run");
      return { runId: run.runId, ok: true, timing: snapshotTiming(d, run) };
    });
    var limit = new Promise(function (res) { timer = setTimeout(function () { res({ runId: run.runId, ok: false, reason: "Current Timing took longer than " + (TIMEOUT_MS / 1000) + " s" }); }, TIMEOUT_MS); });
    return Promise.race([work.catch(function (e) { return { runId: run.runId, ok: false, reason: (e && e.message) || "Current Timing could not be calculated" }; }), limit])
      .then(function (r) { clearTimeout(timer); pending = r; return r; });
  }
  window.CozSaved.registerPayload("compare", function (rec) {
    if (!rec || rec.kind !== "compare") return null;
    var p = pending; if (!p || p.runId !== rec.runId) return null;
    pending = null;
    if (p.skip) return null;                                                  /* restored: keep what was saved */
    if (p.ok) return { timing: p.timing, timingError: false };
    var prev = rec.library && rec.library.compare;
    if (prev && prev.timing) return null;                                     /* never erase saved timing */
    return { timingError: p.reason || "Current Timing could not be calculated" };
  });

  /* ---------------- read one saved comparison ---------------- */
  function keyRun(key, prefix){ var parts = key.slice(prefix.length).split("|"); return { runId: parts[0], fingerprint: parts[1], parts: parts }; }
  function pick(cands){ return cands.length === 1 ? { state: "ok", data: cands[0].data, key: cands[0].key, parts: cands[0].parts } : { state: cands.length ? "unverified" : "missing" }; }
  /* every part of one Compare record, judged strictly against that record's run ID + fingerprint */
  function assess(rec){
    var snap = rec.snapshot || {}, keys = Object.keys(snap);

    var vc = parse(snap.cozChartJSON), tc = parse(snap.cozTropicalChartJSON);
    var charts = {
      vedic:    { state: vc ? (sameRun(vc.run, rec) ? "ok" : "unverified") : "missing" },
      tropical: { state: tc ? (sameRun(tc.run, rec) ? "ok" : "unverified") : "missing" }
    };

    var C = "cozCombinedReadingDEV:";
    var combined = pick(keys.filter(function (k) { return k.indexOf(C) === 0; }).map(function (k) {
      var kr = keyRun(k, C), o = parse(snap[k]);
      var ok = sameRun(kr, rec) && o && ["sharedThemes", "differentEmphases", "integratedView"].every(function (s) { return o[s] && texts(o[s].paragraphs); });
      return ok ? { key: k, parts: kr.parts, data: { sharedThemes: o.sharedThemes.paragraphs.slice(), differentEmphases: o.differentEmphases.paragraphs.slice(), integratedView: o.integratedView.paragraphs.slice() } } : null;
    }).filter(Boolean));

    var A = "cozAscReading:", ascendants = {};
    ["tropical", "vedic", "combined"].forEach(function (sys) {
      var r = pick(keys.filter(function (k) { return k.indexOf(A) === 0; }).map(function (k) {
        var kr = keyRun(k, A), o = parse(snap[k]);
        var ok = sameRun(kr, rec) && kr.parts[2] === sys && o && texts(o.paragraphs);
        return ok ? { key: k, parts: kr.parts, data: { preview: typeof o.preview === "string" ? o.preview : "", paragraphs: o.paragraphs.slice() } } : null;
      }).filter(Boolean));
      if (r.state === "ok") r.sign = r.parts[3] || "";
      ascendants[sys] = r;
    });
    var pair = parse(snap.cozAscendantPair);
    if (!sameRun(pair, rec)) pair = null;

    var lib = (rec.library && rec.library.compare) || {}, timing;
    if (lib.timing && sameRun(lib.timing, rec)) timing = { state: "ok", data: lib.timing };
    else if (lib.timing) timing = { state: "unverified" };
    else if (lib.timingError) timing = { state: "failed", reason: String(lib.timingError) };
    else timing = { state: "missing" };

    return { charts: charts, combined: combined, ascendants: ascendants, pair: pair, timing: timing, vc: vc, tc: tc };
  }
  /* SCL1.1: the completeness flags coz-saved.js stores on a Compare record (true only for "ok") */
  function parts(rec){
    if (!rec || rec.kind !== "compare") return null;
    var a = assess(rec);
    return { combined: a.combined.state === "ok",
             ascTropical: a.ascendants.tropical.state === "ok", ascVedic: a.ascendants.vedic.state === "ok", ascCombined: a.ascendants.combined.state === "ok",
             vedicChart: a.charts.vedic.state === "ok", tropicalChart: a.charts.tropical.state === "ok",
             timing: a.timing.state === "ok" };
  }
  function load(id){
    if (!id) { try { id = new URLSearchParams(location.search).get("id"); } catch (e) {} }
    if (!id) return null;
    var rec = window.CozSaved.get(id);
    if (!rec || rec.kind !== "compare" || !rec.snapshot) return null;
    var a = assess(rec), snap = rec.snapshot, vc = a.vc, tc = a.tc;
    var charts = a.charts, combined = a.combined, ascendants = a.ascendants, pair = a.pair, timing = a.timing;
    var bd = parse(snap.emergeBirthData) || {}, cl = (tc && tc.client) || {};
    return {
      rec: rec, id: rec.id, name: rec.name || bd.name || cl.displayName || "",
      birth: { date: cl.birthDate || bd.birthDate || "", time: cl.birthTime || "", location: cl.locationLabel || "" },
      documentId: (tc && tc.documentId) || (vc && vc.documentId) || "",
      charts: charts, combined: combined, ascendants: ascendants, pair: pair, timing: timing
    };
  }

  function discard(){ pending = null; }
  window.CozSavedCompare = { VERSION: VERSION, prepareSave: prepareSave, discard: discard, load: load, parts: parts };
})();
