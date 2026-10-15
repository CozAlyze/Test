/* COMPARE SAVED LINKS · CSL1.1 (Oct 1 2026, local build for review)
   CSL1.1 (Chat): "complete" requires exactly the six expected section IDs of that system, each once,
   each with nonblank text. A truncated order, a duplicated entry, or an unexpected ID is never complete.
   CSL1.0:
   Stage 2B, linking/display only (Chat ruling, Oct 1). Compare pages only.
   Finds the customer's SAVED Tropical and Vedic six-section readings for the chart now on this device
   and reports one state per system. Matching uses BOTH run ID and birth fingerprint; another run's
   reading is never substituted. Saved charts for other runs are ignored entirely (no warning).
   Read only: never writes storage, never calls a model, never starts a job, never changes the
   Combined generator or its evidence. The text is shown by the existing Saved document pages
   (saved-tropical-document.html / saved-vedic-document.html ?view=reading&id=...), exactly as saved.

   States (per system):
     complete      a saved record for this run + fingerprint holds the finished six-section reading
     missing       no saved reading of that system exists for this chart
     unfinished    the chart was saved for that system but its reading isn't complete yet
     unverified    a saved record for this run exists but its identity can't be confirmed
                   (fingerprint missing or different, its own chart belongs to another run,
                   the reading carries another run's stamp, or more than one record claims the run)
   Requires coz-saved.js (CozSaved.STORE) loaded first; works without it using the same key. */
(function () {
  if (window.CozCompareSaved) return;
  var SYS = {
    tropical: { label: "Tropical", chartKey: "cozTropicalChartJSON", doc: "saved-tropical-document.html",
                ids: ["at-your-core", "love-desire-creativity", "work-money-expression", "wisdom-purpose-legacy", "challenges-resilience", "essential-takeaway"] },
    vedic:    { label: "Vedic",    chartKey: "cozChartJSON",         doc: "saved-vedic-document.html",
                ids: ["essential-nature", "mind-intuition", "relationships-karmic", "dharma-direction", "rahu-ketu", "essential-takeaway"] }
  };
  /* Chat's proposed customer wording (Oct 1); final placement and wording are Jason's call */
  var COPY = {
    complete:   function (L) { return "View your saved " + L + " reading"; },
    missing:    function (L) { return "No saved " + L + " reading is available for this chart."; },
    unfinished: function (L) { return "Your saved " + L + " reading is not yet complete."; },
    unverified: function ()  { return "We couldn\u2019t verify that this saved reading belongs to this chart."; }
  };
  function parse(s){ try { return JSON.parse(s || "null"); } catch (e) { return null; } }
  function lsGet(k){ try { return localStorage.getItem(k); } catch (e) { return null; } }
  function storeKey(){ return (window.CozSaved && window.CozSaved.STORE) || "cozSavedCharts"; }
  function sameRun(a, b){ return !!(a && b && a.runId && a.fingerprint && b.runId && b.fingerprint && a.runId === b.runId && a.fingerprint === b.fingerprint); }
  /* CSL1.1: exactly the six expected IDs of this system, each once, each with nonblank text */
  function complete(cap, sys){
    var want = SYS[sys].ids;
    if (!cap || typeof cap !== "object" || !cap.sections || typeof cap.sections !== "object" || !Array.isArray(cap.order)) return false;
    if (cap.order.length !== want.length) return false;
    var seen = {};
    for (var i = 0; i < cap.order.length; i++) {
      var e = cap.order[i], id = e && typeof e.id === "string" ? e.id : null;
      if (!id || want.indexOf(id) < 0 || seen[id]) return false;                 /* unexpected or duplicate */
      seen[id] = true;
    }
    return want.every(function (id) {
      var paras = cap.sections[id];
      return seen[id] && Array.isArray(paras) && paras.some(function (p) { return typeof p === "string" && p.trim(); });
    });
  }
  /* the chart now on this device: both halves required */
  function currentRun(){
    var bd = parse(lsGet("emergeBirthData"));
    return bd && bd.runId && bd.fingerprint ? { runId: bd.runId, fingerprint: bd.fingerprint } : null;
  }
  function result(sys, state, why, rec){
    var L = SYS[sys].label, out = { system: sys, state: state, message: COPY[state](L), reason: why || null, recordId: null, href: null };
    if (state === "complete") { out.recordId = rec.id; out.href = SYS[sys].doc + "?view=reading&id=" + encodeURIComponent(rec.id); }
    return out;
  }
  function check(sys, run, records){
    if (!run) return result(sys, "unverified", "the chart on this device has no run ID and fingerprint");
    /* only this run's chart records; every other saved chart is ignored */
    var mine = records.filter(function (r) { return r && r.kind === "chart" && r.runId === run.runId; });
    var withSys = mine.filter(function (r) { return r.systems && r.systems[sys] === true; });
    if (!withSys.length) return result(sys, "missing", "no saved " + sys + " chart for this run");
    if (withSys.length > 1) return result(sys, "unverified", "more than one saved record claims this run");
    var rec = withSys[0];
    if (!rec.fingerprint || rec.fingerprint !== run.fingerprint) return result(sys, "unverified", "saved record fingerprint " + (rec.fingerprint ? "differs" : "missing"));
    var chart = parse(rec.snapshot && rec.snapshot[SYS[sys].chartKey]);
    if (!chart || !sameRun(chart.run, run)) return result(sys, "unverified", "the record's own " + sys + " chart is missing or belongs to another run");
    var cap = rec.library && rec.library[sys] && rec.library[sys].reading;
    if (cap === undefined || cap === null) return result(sys, "unfinished", "saved before the reading finished");
    if (cap.run && !sameRun(cap.run, run)) return result(sys, "unverified", "the saved reading carries another run's stamp");
    if (!complete(cap, sys)) return result(sys, "unfinished", "saved reading is incomplete or not in the expected six-section form");
    return result(sys, "complete", null, rec);
  }
  function status(){
    var store = parse(lsGet(storeKey())), records = store && Array.isArray(store.records) ? store.records : [];
    var run = currentRun();
    return { run: run, tropical: check("tropical", run, records), vedic: check("vedic", run, records), checkedAt: new Date().toISOString() };
  }
  window.CozCompareSaved = { status: status, COPY: COPY, VERSION: "CSL1.1" };
})();
