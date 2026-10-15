/* COZALYZE · COMPARE EVIDENCE STRUCTURE · CE1.2 · INTERNAL ONLY (CE1.1: claim meanings for the dev generator; CE1.2: Vedic eligibility gate)
   Structure for the future Combined Reading generator. Nothing in this file writes,
   selects or approves customer language. It holds:
     1. the versioned shared theme taxonomy (internal keys, never shown to a customer)
     2. the evidence-manifest item format
     3. the Vedic mapping: existing Section 1 / Section 2 claim records -> themes
     4. the Tropical STRUCTURAL factor map: calculated factors -> themes, no meanings
     5. buildManifest() + coverage() for testing and expert review
   Open Tropical rulings (orbs, chart-ruler convention, modern vs traditional rulers,
   dignity, mean vs true nodes) are NOT decided here: affected items say so. */
(function(){
  var TAXONOMY_VERSION = "cmp-taxonomy 1.0";
  var SELECTION_VERSION = "cmp-selection 0.2 eligibility-gated";

  /* 1. shared theme taxonomy */
  var THEMES = ["identity_orientation","emotional_mental_patterns","relationships_exchange",
                "work_life_direction","values_foundation","growth_release_balance"];

  /* 2. manifest item format (every field always present; null when not applicable) */
  var ITEM_FIELDS = ["system","themeKey","factorId","claimIds","source","selectionCondition","supports",
                     "evidenceStatus","developmentEligible","productionEligible","engineVersion","selectionVersion","note","claimMeanings","compareEligible","exclusionReason","excludedClaims","prohibitedExtensions"];
  /* supports: "convergence" | "difference" | "both" | "unassessed". Selection never
     decides this; the future generator's traced output does. */
  function item(o){
    var it = {}; ITEM_FIELDS.forEach(function(f){ it[f] = (o[f] === undefined ? null : o[f]); });
    it.supports = it.supports || "unassessed"; it.selectionVersion = SELECTION_VERSION; return it;
  }

  /* 3. Vedic mapping. Section 1 -> identity_orientation. Section 2 -> emotional_mental_patterns.
     Ascendant-lord life-area records add a second theme ONLY where the approved claim's own
     wording names that area (read from the records, Sep 19):
       asc-lord-in-house.2  "what you build, value and provide"        -> values_foundation
       asc-lord-in-house.4  "home, family and your private foundation"  -> values_foundation
       asc-lord-in-house.6  "daily work, health and being useful"       -> work_life_direction
       asc-lord-in-house.10 "your work in the world and what you contribute publicly" -> work_life_direction
     asc-lord-in-house.7 ("close relationships and partnership") is NOT mapped to
     relationships_exchange: his Sep 19 ruling limits life-area records to values or work.
     No claim records exist for Venus / 7th, 10th house, Rahu / Ketu (Sections 3-6), so
     those themes stay unsupported. Live generated Section 3-6 prose is never evidence. */
  var LORD_HOUSE_EXTRA = { 2: "values_foundation", 4: "values_foundation", 6: "work_life_direction", 10: "work_life_direction" };
  var VEDIC_UNSUPPORTED = {
    relationships_exchange: "no approved claim records (Section 3 has none; lord-in-7th is excluded by ruling)",
    work_life_direction: "no approved 10th-house / dharma claim records; only the lord-in-6th or lord-in-10th life-area claim when present",
    growth_release_balance: "no approved Rahu / Ketu claim records (Section 5 has none)"
  };
  var S1_FILES = ["/Demo/application-claims-s1-ascendant-lord-houses-batch2.json","/Demo/application-claims-s1-ascendant-signs-batch2.json",
    "/Demo/application-claims-s1-guiding-planets-batch1.json","/Demo/application-claims-s1-hidden-role-fixture-batch1.json","/Demo/application-claims-s1-v26-compiled-overlay.json"];
  var S2_FILES = ["/Demo/application-claims-chicago.json","/Demo/application-claims-denver.json","/Demo/application-claims-moon-houses-phase3-batch1.json",
    "/Demo/application-claims-moon-signs-phase3-batch2.json","/Demo/application-claims-nakshatras-phase3-batch3a.json","/Demo/application-claims-nakshatras-phase3-batch3b.json",
    "/Demo/application-claims-nakshatras-phase3-batch3c.json","/Demo/application-claims-nakshatras-phase3-batch3d.json","/Demo/application-claims-padas-batch4a.json",
    "/Demo/application-claims-padas-batch4b.json","/Demo/application-claims-padas-batch4c.json","/Demo/application-claims-padas-batch4d.json","/Demo/application-claims.json"];

  function vedicItems(vedicChart, engineVersion, claimData, mode){
    var sel = window.CozDevReview.selectRecords(vedicChart, claimData), out = [];
    function push(entry, section, files, theme, note){
      var r = entry.record;
      out.push(item({ system: "vedic", themeKey: theme,
        factorId: r.coverageItem || ("selector:" + JSON.stringify(r.selector || null)),
        claimIds: (r.applicationClaims || []).map(function(c){ return c.claimId; }).filter(Boolean),
        claimMeanings: (r.applicationClaims || []).map(function(c){ return { claimId: c.claimId, meaning: c.allowedMeaning }; }).filter(function(c){ return c.meaning; }),
        source: { file: files[entry.fileIndex], recordId: r.recordId || r.modelId || null, sourceIds: r.sourceIds || [], evidenceRecordIds: r.evidenceRecordIds || [] },
        selectionCondition: section + " key match (dev-review-engine selectRecords)",
        evidenceStatus: r.status || null,
        developmentEligible: r.developmentEligible === true, productionEligible: r.productionEligible === true,
        engineVersion: engineVersion, note: note || null }));
    }
    sel.section1.forEach(function(e){
      push(e, "Section 1", S1_FILES, "identity_orientation");
      var m = /^asc-lord-in-house\.(\d+)$/.exec(e.record.coverageItem || "");
      if (m && LORD_HOUSE_EXTRA[+m[1]]) push(e, "Section 1", S1_FILES, LORD_HOUSE_EXTRA[+m[1]], "life-area claim names this theme in its own wording");
    });
    sel.section2.forEach(function(e){ push(e, "Section 2", S2_FILES, "emotional_mental_patterns"); });
    applyEligibility(out, sel, mode || "development");
    return out;
  }

  /* 3b. Vedic eligibility gate (CE1.2, his Sep 19 ruling). The Vedic dev-review engine
     itself does not filter by eligibility, so Compare does it here:
       record: developmentEligible true (Demo) / productionEligible true (production);
               status present and not BLOCKED / GAP / PROHIBITED / REJECTED;
               sourced = sourceIds, evidenceRecordIds or evidenceModelIds non-empty, or the
               claim is a dependent methodology claim whose claimConditions name parents.
       claim:  has allowedMeaning; not CALCULATED_STRUCTURE_CUSTOMER_CONTEXT (technical
               context, not interpretation); its claimConditions (requires / requiresAny)
               are satisfied by other eligible claims in the same selection.
     Excluded claims stay in the manifest with a reason, never in the prompt. */
  function recordGate(r, mode){
    if (mode === "production" ? r.productionEligible !== true : r.developmentEligible !== true) return mode === "production" ? "record not productionEligible" : "record not developmentEligible";
    if (!r.status) return "record has no status";
    if (/BLOCKED|GAP|PROHIBIT|REJECT/i.test(r.status)) return "record status " + r.status;
    var sourced = (r.sourceIds && r.sourceIds.length) || (r.evidenceRecordIds && r.evidenceRecordIds.length) || (r.evidenceModelIds && r.evidenceModelIds.length) || (r.claimConditions && r.claimConditions.length);
    if (!sourced) return "unsourced record";
    return null;
  }
  function applyEligibility(items, sel, mode){
    var recs = {};
    sel.section1.concat(sel.section2).forEach(function(e){ recs[e.record.recordId || e.record.modelId || e.record.coverageItem] = e.record; });
    var cond = {}, candidate = {};
    items.forEach(function(it){
      var r = recs[it.source.recordId] || recs[it.factorId]; if (!r) { it.compareEligible = false; it.exclusionReason = "record not found"; return; }
      it.prohibitedExtensions = r.prohibitedExtensions || [];
      it.exclusionReason = recordGate(r, mode);
      (r.claimConditions || []).forEach(function(c){ cond[c.claimId] = c; });
      if (!it.exclusionReason) (r.applicationClaims || []).forEach(function(c){
        if (c.allowedMeaning && c.classification !== "CALCULATED_STRUCTURE_CUSTOMER_CONTEXT") candidate[c.claimId] = true;
      });
    });
    var changed = true;                       // drop claims whose conditions fail, until stable
    while (changed){
      changed = false;
      Object.keys(candidate).forEach(function(id){
        var c = cond[id]; if (!c) return;
        var ok = (!c.requires || c.requires.every(function(x){ return candidate[x]; })) &&
                 (!c.requiresAny || c.requiresAny.some(function(x){ return candidate[x]; }));
        if (!ok){ delete candidate[id]; changed = true; }
      });
    }
    items.forEach(function(it){
      var r = recs[it.source.recordId] || recs[it.factorId]; if (!r) return;
      it.excludedClaims = [];
      it.claimMeanings = (r.applicationClaims || []).filter(function(c){
        if (candidate[c.claimId]) return true;
        it.excludedClaims.push({ claimId: c.claimId, reason: it.exclusionReason || (!c.allowedMeaning ? "no allowedMeaning" :
          c.classification === "CALCULATED_STRUCTURE_CUSTOMER_CONTEXT" ? "technical context, not interpretation" : "claimConditions not satisfied") });
        return false;
      }).map(function(c){ return { claimId: c.claimId, meaning: c.allowedMeaning, classification: c.classification || null }; });
      it.claimIds = it.claimMeanings.map(function(c){ return c.claimId; });
      it.compareEligible = !it.exclusionReason && it.claimMeanings.length > 0;
      if (!it.compareEligible && !it.exclusionReason) it.exclusionReason = "no eligible claims left";
    });
  }

  /* 4. Tropical STRUCTURAL map: where calculated factors belong. No meanings, no claims.
     Every item: claimIds [], developmentEligible false, productionEligible false. */
  var TRAD = ["Mars","Venus","Mercury","Moon","Sun","Mercury","Venus","Mars","Jupiter","Saturn","Saturn","Jupiter"];
  var MODERN = { 7: "Pluto", 10: "Uranus", 11: "Neptune" };           // Scorpio, Aquarius, Pisces
  var SIGNS = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
  function signIdx(name){ return SIGNS.indexOf(String(name)); }
  function rulerCandidates(signName){
    var i = signIdx(signName); if (i < 0) return null;
    return { traditional: TRAD[i], modern: MODERN[i] || TRAD[i] };
  }
  function tropicalItems(t, engineVersion){
    var out = [], NO = "STRUCTURAL_ONLY_NO_APPROVED_MEANING";
    var body = {}; (t.bodies || []).forEach(function(b){ body[b.id] = b; });
    var cusp = {}; (t.houseCusps || []).forEach(function(c){ cusp[c.house] = c; });
    function add(theme, factorId, cond, extra){
      out.push(item(Object.assign({ system: "tropical", themeKey: theme, factorId: factorId, claimIds: [],
        source: { record: "cozTropicalChartJSON (calculation only)" }, selectionCondition: cond,
        evidenceStatus: NO, developmentEligible: false, productionEligible: false, engineVersion: engineVersion,
        note: "no approved Tropical meaning record exists" }, extra || {})));
    }
    function bodyFactor(id){ var b = body[id]; return b ? ("trop." + id + ":" + b.position.sign + ":house " + b.house) : ("trop." + id + ":missing"); }
    function rulerOf(label, signName, theme, cond){
      var rc = rulerCandidates(signName);
      add(theme, "trop." + label + "-ruler:" + (rc ? "traditional " + rc.traditional + " / modern " + rc.modern : "unknown"),
        cond, { evidenceStatus: "BLOCKED_PENDING_RULING", note: "chart-ruler convention and modern vs traditional rulers are pending his ruling; both candidates recorded, neither chosen" });
    }
    var A = t.angles || {};
    add("identity_orientation", bodyFactor("sun"), "Sun (structural map)");
    add("identity_orientation", "trop.ascendant:" + (A.ascendant && A.ascendant.sign), "Ascendant (structural map)");
    rulerOf("chart", A.ascendant && A.ascendant.sign, "identity_orientation", "ruler of the Ascendant sign");
    add("emotional_mental_patterns", bodyFactor("moon"), "Moon (structural map)");
    add("emotional_mental_patterns", bodyFactor("mercury"), "Mercury (structural map)");
    add("relationships_exchange", bodyFactor("venus"), "Venus (structural map)");
    add("relationships_exchange", "trop.descendant:" + (A.descendant && A.descendant.sign), "Descendant (structural map)");
    rulerOf("7th", cusp[7] ? cusp[7].position.sign : (A.descendant && A.descendant.sign), "relationships_exchange", "ruler of the 7th cusp sign");
    add("work_life_direction", "trop.midheaven:" + (A.midheaven && A.midheaven.sign), "MC (structural map)");
    rulerOf("10th", cusp[10] ? cusp[10].position.sign : (A.midheaven && A.midheaven.sign), "work_life_direction", "ruler of the 10th cusp sign");
    add("work_life_direction", bodyFactor("saturn"), "Saturn (structural map)");
    add("values_foundation", "trop.2nd-cusp:" + (cusp[2] ? cusp[2].position.sign : "unavailable (whole-sign fallback)"), "2nd house cusp (structural map)");
    rulerOf("2nd", cusp[2] && cusp[2].position.sign, "values_foundation", "ruler of the 2nd cusp sign");
    (t.bodies || []).filter(function(b){ return b.house === 2 && !/node/i.test(b.id); }).forEach(function(b){
      add("values_foundation", bodyFactor(b.id), "body in the 2nd house (structural map)");
    });
    add("values_foundation", "trop.foundation-factors:undefined", "foundation factors beyond the 2nd house are to be defined by the approved Tropical specification",
      { evidenceStatus: "BLOCKED_PENDING_SPEC", note: "not defined yet; IC / 4th house deliberately not assumed" });
    add("growth_release_balance", bodyFactor("northNode") + "|" + bodyFactor("southNode"), "nodes",
      { evidenceStatus: "BLOCKED_PENDING_RULING", note: "engine computes MEAN nodes; node type and node interpretation policy are pending his ruling" });
    return out;
  }

  /* 5. manifest + coverage */
  var claimPromise = null;
  function loadClaims(){
    if (!claimPromise){
      var get = function(f){ return fetch(f).then(function(r){ if (!r.ok) throw new Error(f + " " + r.status); return r.json(); }); };
      claimPromise = Promise.all([Promise.all(S1_FILES.map(get)), Promise.all(S2_FILES.map(get))])
        .then(function(r){ return { section1Files: r[0], section2Files: r[1] }; });
    }
    return claimPromise;
  }
  function buildManifest(pairCtx){
    return loadClaims().then(function(claimData){
      var items = tropicalItems(pairCtx.charts.tropical, pairCtx.pair.engineVersions.tropical)
        .concat(vedicItems(pairCtx.charts.vedic, pairCtx.pair.engineVersions.vedic, claimData, "development"));
      return { taxonomyVersion: TAXONOMY_VERSION, selectionVersion: SELECTION_VERSION,
               runId: pairCtx.pair.runId, fingerprint: pairCtx.pair.fingerprint,
               engineVersions: pairCtx.pair.engineVersions, builtAt: new Date().toISOString(),
               items: items, coverage: coverage(items) };
    });
  }
  function coverage(items){
    var rows = {};
    THEMES.forEach(function(k){
      var T = items.filter(function(i){ return i.system === "tropical" && i.themeKey === k; });
      var V = items.filter(function(i){ return i.system === "vedic" && i.themeKey === k && i.compareEligible; });
      var tClaims = T.some(function(i){ return i.claimIds.length; }), vClaims = V.some(function(i){ return i.claimIds.length; });
      var dev = T.some(function(i){ return i.developmentEligible; }) && V.some(function(i){ return i.developmentEligible; });
      var prod = T.some(function(i){ return i.productionEligible; }) && V.some(function(i){ return i.productionEligible; });
      var missing = [];
      if (!tClaims) missing.push("Tropical approved meanings");
      if (!V.length) missing.push("Vedic claim records: " + (VEDIC_UNSUPPORTED[k] || "none matched"));
      else if (!V.some(function(i){ return i.developmentEligible; })) missing.push("Vedic records not development-eligible");
      if (!prod) missing.push("production eligibility on both sides");
      rows[k] = { tropicalFactors: T.length > 0, tropicalApprovedClaims: tClaims, vedicFactors: V.length > 0,
                  vedicApprovedClaims: vClaims, developmentEligible: dev, productionEligible: prod, missing: missing };
    });
    return rows;
  }

  window.COZ_COMPARE_EVIDENCE = { TAXONOMY_VERSION: TAXONOMY_VERSION, SELECTION_VERSION: SELECTION_VERSION, THEMES: THEMES,
    ITEM_FIELDS: ITEM_FIELDS, LORD_HOUSE_EXTRA: LORD_HOUSE_EXTRA, VEDIC_UNSUPPORTED: VEDIC_UNSUPPORTED,
    buildManifest: buildManifest, coverage: coverage };
})();
