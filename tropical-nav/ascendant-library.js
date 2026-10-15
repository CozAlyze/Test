/* COZALYZE · ASCENDANT LIBRARY · L2.4 · (Sep 22: cross-page in-flight marker + network retry, so a reading started early by index.html is waited for, never duplicated) · chart-run pairing (+ engine versions) + Ascendant-only generation
   L2.2: third reading "combined" (How They Work Together), built from both evidence sets;
   missing charts are exported in parallel; every API call has a 90 second timeout.
   DEMO / DEVELOPMENT ONLY. Shared by your-ascendants.html and ascendant-reading.html.

   PAIRING. Scene 1 stamps every chart run with runId + a normalized birth fingerprint
   (emergeBirthData). Both engines copy that stamp into what they save
   (cozTropicalChartJSON.run, cozChartJSON.run). A pair is accepted ONLY when both
   saved charts carry the current runId and fingerprint. A missing side is calculated
   silently by loading that engine in a hidden frame (?cozExport=1) on the same birth
   record. No fallback to any older chart, key or sign, ever.

   READINGS. Nothing is hard-coded. Vedic = the existing Section 1 evidence selection
   (dev-review-engine.js selectAscendantEvidence: Ascendant sign, guiding planet,
   its house, Lagna nakshatra claims) composed by the same generator and guardrails as
   the Vedic reading. Tropical = FIRST tropical generator wiring, from the Tropical spec
   and the tropical engine's own chart data; development-only, not yet reviewed.
   Browser call with the Demo test key (cozTestApiKey), never a production pattern.
   Generated once per chart run and system, cached. */
(function(){
  var SIGNS = ["aries","taurus","gemini","cancer","leo","virgo","libra","scorpio","sagittarius","capricorn","aquarius","pisces"];
  var GLYPH = {aries:"\u2648",taurus:"\u2649",gemini:"\u264A",cancer:"\u264B",leo:"\u264C",virgo:"\u264D",
    libra:"\u264E",scorpio:"\u264F",sagittarius:"\u2650",capricorn:"\u2651",aquarius:"\u2652",pisces:"\u2653"};
  var ENGINE_VERSION = "asc-gen-1.0";
  var COMBINED_VERSION = "asc-comb-1.0";
  var CALL_TIMEOUT_MS = 90000;
  var PAIR_FAIL = "We couldn\u2019t load both Ascendants for this chart. Please return and run your chart again.";
  var DEFAULT_MODEL = "claude-sonnet-4-6";

  function cap(s){ return s ? s.charAt(0).toUpperCase() + s.slice(1) : ""; }
  function lsJSON(k){ try { var r = localStorage.getItem(k); return r ? JSON.parse(r) : null; } catch(e){ return null; } }
  function signOf(x){
    if (x == null) return null;
    if (typeof x === "number" || /^\d+$/.test(String(x))){ var n = parseInt(x,10); return (n>=1&&n<=12) ? SIGNS[n-1] : null; }
    var s = String(x).trim().toLowerCase(); return SIGNS.indexOf(s) >= 0 ? s : null;
  }

  function cozBirthFingerprint(bd){
    /* COZ-FP-1: normalized birth data only (never the name), identical copy in
       index.html and ascendant-library.js */
    bd = bd || {}; var L = bd.location || {};
    var str = [String(bd.birthDate||''), String(bd.birthTime||'').toUpperCase().replace(/\s+/g,' ').trim(),
               Number(L.latitude).toFixed(4), Number(L.longitude).toFixed(4), String(bd.utc||'')].join('|');
    var h1 = 0x811c9dc5, h2 = 0x9747b28c;
    for (var i = 0; i < str.length; i++){
      var c = str.charCodeAt(i);
      h1 ^= c; h1 = Math.imul(h1, 16777619);
      h2 ^= c; h2 = Math.imul(h2, 0x5bd1e995); h2 ^= h2 >>> 13;
    }
    return 'fp1-' + ('0000000' + (h1>>>0).toString(16)).slice(-8) + ('0000000' + (h2>>>0).toString(16)).slice(-8);
  }

  /* ---------------- current chart run ---------------- */
  function currentRun(){
    var bd = lsJSON("emergeBirthData");
    if (!bd || !bd.runId || !bd.fingerprint) return null;
    if (cozBirthFingerprint(bd) !== bd.fingerprint) return null;          // record edited after the run
    return { runId: bd.runId, fingerprint: bd.fingerprint, birth: bd };
  }
  function runMatches(chart, run){
    /* L2.1: a saved chart without an engine version predates the version rule and is recalculated */
    return !!(chart && chart.run && run && chart.run.runId === run.runId && chart.run.fingerprint === run.fingerprint && chart.run.engineVersion);
  }
  function tropicalChart(run){ var c = lsJSON("cozTropicalChartJSON"); return runMatches(c, run) ? c : null; }
  function vedicChart(run){ var c = lsJSON("cozChartJSON"); return runMatches(c, run) ? c : null; }

  function silentExport(file, getter, run){
    return new Promise(function(resolve){
      var f = document.createElement("iframe");
      f.setAttribute("aria-hidden", "true"); f.tabIndex = -1;
      f.style.cssText = "position:fixed;left:-20px;top:0;width:1px;height:1px;opacity:0;border:0;pointer-events:none";
      var done = false, t0 = Date.now();
      function finish(v){ if (done) return; done = true; clearInterval(iv); try { f.remove(); } catch(e){} resolve(v); }
      var iv = setInterval(function(){
        var c = getter(run);
        if (c) finish(c); else if (Date.now() - t0 > 25000) finish(null);
      }, 250);
      f.src = file + "?cozExport=1&t=" + Date.now();
      document.body.appendChild(f);
    });
  }

  var pairPromise = null;
  function ensurePair(){
    if (pairPromise) return pairPromise;
    pairPromise = (function(){
      var run = currentRun();
      if (!run) return Promise.resolve({ ok:false, reason:"no stamped chart run for the current birth record" });
      var need = [];
      if (!tropicalChart(run)) need.push(["tropical-reveal.html", tropicalChart]);
      if (!vedicChart(run))    need.push(["sidereal-reveal.html", vedicChart]);
      /* L2.2: both missing engines load at the same time instead of one after the other */
      return Promise.all(need.map(function(n){ return silentExport(n[0], n[1], run); }))
      .then(function(){
        var t = tropicalChart(run), v = vedicChart(run);
        if (!t || !v) return { ok:false, reason:"one system did not produce a chart for this run" };
        var tAsc = t.angles && t.angles.ascendant, vAsc = null;
        (v.planets || []).forEach(function(p){ if (p.name === "Ascendant") vAsc = p; });
        var ts = signOf(tAsc && tAsc.sign), vs = signOf(v.ascendantSignNumber);
        if (!ts || !vs || !vAsc || signOf(vAsc.signNumber) !== vs) return { ok:false, reason:"Ascendant missing from a saved chart" };
        var pair = {
          runId: run.runId, fingerprint: run.fingerprint,
          engineVersions: { tropical: t.run.engineVersion, vedic: v.run.engineVersion },
          tropical: { sign: ts, degree: tAsc.degree, minute: tAsc.minute },
          vedic: { sign: vs, degree: vAsc.degrees, minute: vAsc.minutes, nakshatra: vAsc.nakshatra || null },
          builtAt: new Date().toISOString()
        };
        try { localStorage.setItem("cozAscendantPair", JSON.stringify(pair)); } catch(e){}
        return { ok:true, pair: pair, run: run, charts: { tropical: t, vedic: v } };
      });
    })();
    return pairPromise;
  }

  /* ---------------- evidence ---------------- */
  var BODY_NAME = { sun:"Sun", moon:"Moon", mercury:"Mercury", venus:"Venus", mars:"Mars", jupiter:"Jupiter",
    saturn:"Saturn", uranus:"Uranus", neptune:"Neptune", pluto:"Pluto", northNode:"North Node", southNode:"South Node" };
  /* modern rulers, traditional co-rulers for Scorpio, Aquarius, Pisces (Combined spec) */
  var TROP_RULER = { aries:["Mars"], taurus:["Venus"], gemini:["Mercury"], cancer:["Moon"], leo:["Sun"], virgo:["Mercury"],
    libra:["Venus"], scorpio:["Pluto","Mars"], sagittarius:["Jupiter"], capricorn:["Saturn"], aquarius:["Uranus","Saturn"], pisces:["Neptune","Jupiter"] };
  function bodyName(id){ return BODY_NAME[id] || BODY_NAME[String(id).charAt(0).toLowerCase() + String(id).slice(1)] || String(id); }
  function sameBody(a, b){ var n = function(x){ return String(x).toLowerCase().replace(/[^a-z]/g,"").replace(/^nnode$/,"northnode").replace(/^snode$/,"southnode"); }; return n(a) === n(b); }

  function tropicalEvidence(t){
    var asc = t.angles.ascendant, sign = signOf(asc.sign);
    var bodies = (t.bodies || []).map(function(b){ return { name: bodyName(b.id), sign: b.position && b.position.sign, degree: b.position && b.position.degree, house: b.house, motion: b.motion }; });
    var rulers = TROP_RULER[sign].map(function(r, i){
      var b = null; bodies.forEach(function(x){ if (x.name === r) b = x; });
      var asp = (t.aspects || []).filter(function(a){ return sameBody(a.bodyA, r) || sameBody(a.bodyB, r); })
        .map(function(a){ return (sameBody(a.bodyA, r) ? bodyName(a.bodyB) : bodyName(a.bodyA)) + " " + a.type + " (orb " + a.orbDisplay + ")"; });
      return { role: i === 0 ? "chart ruler" : "traditional co-ruler", planet: r, sign: b && b.sign, degree: b && b.degree, house: b && b.house, motion: b && b.motion, aspects: asp };
    });
    return {
      system: "tropical",
      houseSystem: (t.settings && t.settings.resolvedHouseSystem) || "unknown",
      ascendant: { sign: cap(sign), degree: asc.degree, minute: asc.minute },
      rulers: rulers,
      firstHouse: bodies.filter(function(b){ return b.house === 1; }).map(function(b){ return b.name + " in " + b.sign; }),
      balance: t.balance ? { element: t.balance.element && t.balance.element.result, elementCounts: t.balance.element && t.balance.element.counts,
                             modality: t.balance.modality && t.balance.modality.result, modalityCounts: t.balance.modality && t.balance.modality.counts } : null
    };
  }

  var S1_FILES = ["application-claims-s1-ascendant-lord-houses-batch2.json","application-claims-s1-ascendant-signs-batch2.json",
    "application-claims-s1-guiding-planets-batch1.json","application-claims-s1-hidden-role-fixture-batch1.json","application-claims-s1-v26-compiled-overlay.json"];
  var s1Promise = null;
  function loadS1(){
    if (!s1Promise) s1Promise = Promise.all(S1_FILES.map(function(f){
      return fetch(f).then(function(r){ if (!r.ok) throw new Error("claim file " + f + " " + r.status); return r.json(); });
    }));
    return s1Promise;
  }
  function vedicEvidence(v){
    if (!window.CozDevReview || !window.CozDevReview.selectAscendantEvidence) return Promise.reject(new Error("dev-review-engine.js (selectAscendantEvidence) not loaded"));
    return loadS1().then(function(files){ return window.CozDevReview.selectAscendantEvidence(v, files); });
  }

  /* ---------------- prompts ---------------- */
  var VOICE = "VOICE. Sound like a person speaking, not a lecture. Establish the frame once with a phrase like 'your chart suggests' and then write with natural confidence; do not hedge every sentence. Roughly 7th to 8th grade reading level: familiar words, mostly short sentences (average well under 20 words), concrete human situations. No academic psychology, no vague filler ('a quieter thread underneath'), no sentence written only to fill space.";
  var PLAIN_VEDIC = "PLAIN LANGUAGE. Planets appear only as influences ('Venus's influence', 'Saturn's influence'). The Sun and the Moon always take the article: write 'the Sun's influence' and 'the Moon's influence', never 'Sun's influence' or 'Moon's influence'. Never house numbers, rulerships, aspects, 'sits in', sign relationships, or any technical mechanics. Do not name any nakshatra. Never use the word 'pada'. The reader never learns where a statement comes from.";
  var GROUNDING = "GROUNDING. Every claim must trace to the chart placements given. Every important conclusion needs two distinct chart factors behind it; single-factor conclusions take lighter language. Include contradicting or softening factors so the chart is not flattened. No biography, profession, or life events are known to you; never invent them. Never guarantee events; specificity comes from the nature of a pattern, where it operates, what strengthens or complicates it. No 6+ word phrase may repeat anywhere in the reading.";
  var COMMON_TAIL = [
    "REGISTER. Possibility-based language: 'may', 'can', 'often', 'may come across as', 'may be experienced as'. Never 'you are always', 'you will', 'this guarantees', or 'people definitely see you as'. No predictions, medical claims, mythology, deities, historical explanations, or moral judgments. Do not use em dashes; use commas.",
    "",
    "SHAPE. One continuous reading of exactly five connected paragraphs, 275 to 375 words in total. No headings, no lists, no subsection labels. The last paragraph is a concise overall synthesis that adds no new factor.",
    "",
    "OUTPUT. Return ONLY a JSON object, no prose before or after, no code fences: {\"preview\": \"one sentence of at most 22 words that opens the reading's central idea, for a small preview card\", \"paragraphs\": [five paragraph strings]}."
  ];
  var SYS_VEDIC = [
    "You write the Vedic (Sidereal) Ascendant reading for CozAlyze's Compare experience. It is a focused Ascendant reading, one page, not the full six-section reading and not a full-chart reading.",
    "",
    "SOURCE. Build the reading from the approved evidence statements supplied with the chart. They come from the same Section 1 claim records the Vedic reading uses (Ascendant sign, guiding planet, the guiding planet's life area, and the Ascendant's nakshatra). Rephrase and connect them into flowing prose; never introduce a meaning the evidence does not support. The phrase 'guiding planet' and the rising sign name are allowed.",
    "",
    "EMPHASIS. The person's deeper embodied orientation: how they instinctively meet their environment, their receptive and perceptual style, natural temperament and behavioural orientation, how their presence may be experienced by others, strengths expressed through the Ascendant, discernment and possible growth edges, and a concise synthesis. This is the inner orientation, not a description of outward image.",
    "",
    VOICE, "", PLAIN_VEDIC, "", GROUNDING, ""
  ].concat(COMMON_TAIL).join("\n");
  var SYS_TROPICAL = [
    "You write the Western (Tropical) Ascendant reading for CozAlyze's Compare experience. It is a focused Ascendant reading, one page, not a full-chart reading.",
    "",
    "SYSTEM. Western Tropical astrology only, using the houses and aspects exactly as supplied. Never use or allude to sidereal zodiac, ayanamsha, Vedic astrology, Lagna, Lagna-lord rules, nakshatras, padas, dashas, Rahu, Ketu, drishti, yogas, karakas, divisional charts, or any Vedic interpretive language.",
    "",
    "PRIORITY. The Ascendant sign and degree and the chart ruler (its sign, house and aspects) are the primary basis of the reading. Planets in the first house may colour it. Element and modality balance is secondary context only: it may add light nuance but must never overpower the Ascendant or turn this into a general chart reading.",
    "",
    "EMPHASIS. Outward presentation, first impression, instinctive approach to new situations, social presence, how the person initiates and responds, visible strengths, possible imbalances and growth edges, and a concise synthesis.",
    "",
    VOICE, "",
    "PLAIN LANGUAGE. Planets appear only as influences ('Mars's influence', 'Venus's influence'). The Sun and the Moon always take the article: 'the Sun's influence', 'the Moon's influence'. Never house numbers, degrees, rulerships, the phrase 'chart ruler', aspect names, 'sits in', or any technical mechanics. The rising sign name ('Aries rising') is allowed. The reader never learns where a statement comes from.",
    "",
    GROUNDING, ""
  ].concat(COMMON_TAIL).join("\n");

  var SYS_COMBINED = [
    "You write 'How They Work Together', the combined Ascendant reading on CozAlyze's Your Ascendants page. It connects the person's Western (Tropical) Ascendant and Vedic (Sidereal) Ascendant into one short reading. It is not a full-chart reading.",
    "",
    "FRAME. The Western rising sign describes outward style: first impression, how the person steps into new situations, how others first experience them. The Vedic rising sign is the foundation of the chart: inner orientation, basic temperament, and the direction life keeps returning to. State this frame once, in plain words, in the first paragraph. Never defend the idea that the two systems can coexist more than once in the whole reading.",
    "",
    "STRUCTURE. Exactly five paragraphs, each doing one new job. 1: what each rising sign describes, stated once. 2: if the signs match, what that match means (little gap between how people read the person and who they are inside); if they differ, what each sign adds, outside and inside, never framed as a conflict. If the signs differ you may say once, plainly, that the two systems measure the zodiac differently; never explain the mechanics. 3: how the pairing shows up in daily life, drawn from the Vedic guiding planet's life area and the Western chart ruler's placement. 4: the main challenge the evidence supports. 5: a practical direction that pulls the reading together and adds no new factor.",
    "",
    "NO REPETITION. Every paragraph must add a point no earlier paragraph made. Do not restate earlier paragraphs in the last one; arrive at one sharper conclusion instead. No 6+ word phrase may repeat anywhere.",
    "",
    "BRIDGES. Connect a Western point and a Vedic point only when evidence on both sides supports that link. If it does not, let the two points stand side by side without inventing a relationship between them. Offer practical guidance only when the evidence supports it.",
    "",
    "SCOPE. Write only about areas the evidence covers. Do not mention relationships, career, money, or any life area the supplied evidence does not address, and never promise topics you will not cover.",
    "",
    "CONCRETE LABELS. When a point comes from a life area, name that area in plain words ('the part of your chart tied to home and family'), never vague labels like 'factors in the area of personal values', 'emotional and mental indicators', or 'different parts of the charts'.",
    "",
    "BANNED PHRASES. Never write: 'one perspective', 'the other perspective', 'both may be true', 'this is not a contradiction', 'the two systems seem to converge', 'the pattern described there', 'tapestry', 'delve'.",
    "",
    VOICE, "",
    "PLAIN LANGUAGE. Planets appear only as influences ('Venus's influence'). The Sun and the Moon always take the article: 'the Sun's influence', 'the Moon's influence'. Never house numbers, degrees, rulerships, the phrase 'chart ruler', aspect names, 'sits in', or any technical mechanics. Never ayanamsha, Lagna, nakshatras, padas, dashas, or other Vedic technical terms; 'Vedic' and 'Western' are allowed. The rising sign names are allowed. The reader never learns where a statement comes from.",
    "",
    GROUNDING, "",
    "REGISTER. Set the possibility frame once ('your charts suggest'), then write with direct confidence. Use 'may' at most once per paragraph, only where there is real uncertainty. Never 'you are always', 'you will', 'this guarantees'. No predictions, medical claims, mythology, deities, or moral judgments. Do not use em dashes; use commas.",
    "",
    "SHAPE. Five connected paragraphs, 250 to 340 words in total. No headings, no lists, no labels.",
    "",
    "OUTPUT. Return ONLY a JSON object, no prose before or after, no code fences: {\"preview\": \"one sentence of at most 22 words\", \"paragraphs\": [five paragraph strings]}."
  ].join("\n");

  function userMsgCombined(ev){
    var t = userMsgTropical(ev.tropical).split("\n"), v = userMsgVedic(ev.vedic).split("\n");
    t = t.slice(0, t.length - 2); v = v.slice(0, v.length - 2);
    return ["Western rising: " + ev.tropical.ascendant.sign + ". Vedic rising: " + cap(ev.vedic.ascSign) + ". Same sign in both systems: " + (ev.same ? "yes" : "no") + ".",
      "", "WESTERN EVIDENCE", t.join("\n"), "", "VEDIC EVIDENCE", v.join("\n"), "",
      "Write the How They Work Together reading now. JSON only."].join("\n");
  }

  function userMsgTropical(ev){
    var L = ["Western (Tropical) chart, " + ev.houseSystem + " houses, tropical zodiac:",
      "Ascendant: " + ev.ascendant.sign + " " + ev.ascendant.degree + "\u00B0" + ("0" + ev.ascendant.minute).slice(-2) + "\u2032"];
    ev.rulers.forEach(function(r){
      L.push(cap(r.role) + ": " + r.planet + (r.sign ? " in " + r.sign + ", house " + r.house + (r.motion === "retrograde" ? ", retrograde" : "") : ""));
      L.push("  aspects to " + r.planet + ": " + (r.aspects.length ? r.aspects.join("; ") : "none within the engine's orbs"));
    });
    L.push("Planets in the first house: " + (ev.firstHouse.length ? ev.firstHouse.join("; ") : "none"));
    if (ev.balance) L.push("Secondary context, element emphasis: " + ev.balance.element + " " + JSON.stringify(ev.balance.elementCounts) + "; modality emphasis: " + ev.balance.modality + " " + JSON.stringify(ev.balance.modalityCounts));
    L.push("", "Write the Western Ascendant reading now. JSON only.");
    return L.join("\n");
  }
  function userMsgVedic(ev){
    return ["Vedic (Sidereal) chart, Lahiri ayanamsha, whole sign houses:",
      "Rising sign: " + cap(ev.ascSign),
      "Guiding planet: " + ev.guidingPlanet + " in " + cap(ev.guidingPlanetSign) + ", house " + ev.guidingPlanetHouse,
      "Ascendant nakshatra (context only, never name it): " + ev.ascNakshatra,
      "",
      "Approved evidence statements (Section 1 claim records " + ev.matchedClaimIds.join(", ") + "):",
      ev.claimSentences.map(function(s){ return "- " + s; }).join("\n"),
      "",
      "Write the Vedic Ascendant reading now. JSON only."].join("\n");
  }

  /* ---------------- validation ---------------- */
  var FORBID = {
    tropical: /\b(sidereal|ayanamsh?a|vedic|lagna|nakshatras?|padas?|dashas?|rahu|ketu|drishti|yogas?|karakas?|jyotish)\b/i,
    vedic: /\b(tropical|western zodiac|padas?|nakshatras?)\b/i,
    combined: /\b(ayanamsh?a|lagna|nakshatras?|padas?|dashas?|drishti|jyotish|tapestry|delve)\b/i
  };
  var RANGE = { tropical: [275, 375], vedic: [275, 375], combined: [250, 340] };
  var BANNED_COMBINED = /\b(one perspective|the other perspective|both may be true|this is not a contradiction|the two systems seem to converge|the pattern described there)\b/i;
  var FORBID_BOTH = /\b(you will|you are always|guarantee[sd]?|destined|chart ruler)\b|\b\d{1,2}(st|nd|rd|th) house\b|\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth) house\b|\u00B0/i;
  function words(ps){ return ps.join(" ").trim().split(/\s+/).filter(Boolean).length; }
  function tidy(t){ return String(t).replace(/\s*\u2014\s*/g, ", ").replace(/\s*\u2013\s*/g, ", ").replace(/,\s*,/g, ",").replace(/\s{2,}/g, " ").trim(); }
  function check(sys, out, ev){
    var problems = [];
    if (!out || !Array.isArray(out.paragraphs)) return ["no paragraphs array"];
    if (out.paragraphs.length !== 5) problems.push("paragraph count " + out.paragraphs.length + " (need 5)");
    var w = words(out.paragraphs), rg = RANGE[sys];
    if (w < rg[0] || w > rg[1]) problems.push("length " + w + " words (need " + rg[0] + "-" + rg[1] + ")");
    var all = out.paragraphs.join(" ") + " " + (out.preview || "");
    var m = all.match(FORBID[sys]) || all.match(FORBID_BOTH);
    if (m) problems.push("forbidden term: " + m[0]);
    var nak = sys === "vedic" ? ev && ev.ascNakshatra : sys === "combined" ? ev && ev.vedic && ev.vedic.ascNakshatra : null;
    if (nak && new RegExp("\\b" + nak + "\\b", "i").test(all)) problems.push("names the nakshatra");
    if (sys === "combined"){
      var b = all.match(BANNED_COMBINED); if (b) problems.push("banned phrase: " + b[0]);
      out.paragraphs.forEach(function(p, i){ var n = (p.match(/\bmay\b/gi) || []).length; if (n > 1) problems.push("paragraph " + (i + 1) + " uses 'may' " + n + " times (max 1)"); });
    }
    if (/^#|\n#/.test(all)) problems.push("heading");
    return problems;
  }

  /* ---------------- generation + cache ---------------- */
  function signFor(sys, ctx){
    return sys === "tropical" ? ctx.pair.tropical.sign : sys === "vedic" ? ctx.pair.vedic.sign : ctx.pair.tropical.sign + "+" + ctx.pair.vedic.sign;
  }
  function cacheKey(sys, ctx){
    var ev = ctx.pair.engineVersions, eng = sys === "tropical" ? ev.tropical : sys === "vedic" ? ev.vedic : ev.tropical + "+" + ev.vedic;
    return "cozAscReading:" + [ctx.pair.runId, ctx.pair.fingerprint, sys, signFor(sys, ctx), eng, sys === "combined" ? COMBINED_VERSION : ENGINE_VERSION].join("|");
  }
  function getCached(sys, ctx){ var c = lsJSON(cacheKey(sys, ctx)); return c && Array.isArray(c.paragraphs) ? c : null; }
  function logCall(entry){
    try { var L = lsJSON("cozAscGenLog") || []; L.push(entry); localStorage.setItem("cozAscGenLog", JSON.stringify(L.slice(-40))); } catch(e){}
  }

  /* L2.3: a generation running in another page (index.html starts all three when the
     Compare dashboard opens) leaves a marker; this page waits for its cached result
     instead of paying for a second call. Stale markers expire. */
  var INFLIGHT_MS = CALL_TIMEOUT_MS * 2 + 15000;
  function flightKey(key){ return "cozAscInFlight:" + key; }
  function markFlight(key, on){ try { if (on) localStorage.setItem(flightKey(key), String(Date.now())); else localStorage.removeItem(flightKey(key)); } catch(e){} }
  function flightActive(key){ try { var t = +localStorage.getItem(flightKey(key)); return !!t && (Date.now() - t) < INFLIGHT_MS; } catch(e){ return false; } }
  function waitForOther(sys, ctx, key){
    return new Promise(function(resolve){
      (function poll(){
        var hit = getCached(sys, ctx); if (hit){ hit.fromCache = true; return resolve(hit); }
        if (!flightActive(key)) return resolve(null);
        setTimeout(poll, 1200);
      })();
    });
  }
  /* L2.4: a 429 (too many requests) or 529 (overloaded) is waited out and retried,
     honouring retry-after; dropped connections are retried too */
  function retryAfterMs(r, attempt){
    var h = r.headers && r.headers.get && r.headers.get("retry-after");
    var s = h ? parseFloat(h) : NaN;
    return isFinite(s) ? Math.min(s * 1000, 30000) : Math.min(4000 * attempt, 20000);
  }
  function fetchRetry(url, opts, tries, attempt){
    attempt = attempt || 1;
    return fetch(url, opts).then(function(r){
      if ((r.status === 429 || r.status === 529) && tries > 0)
        return new Promise(function(res){ setTimeout(res, retryAfterMs(r, attempt)); }).then(function(){ return fetchRetry(url, opts, tries - 1, attempt + 1); });
      return r;
    }).catch(function(e){
      var net = e && e.name !== "AbortError" && (e.name === "TypeError" || /load failed|network/i.test(e.message || ""));
      if (tries > 0 && net) return new Promise(function(r){ setTimeout(r, 2500); }).then(function(){ return fetchRetry(url, opts, tries - 1, attempt + 1); });
      throw e;
    });
  }
  var inPage = {};
  function getReading(sys, ctx){
    var key = cacheKey(sys, ctx);
    var hit = getCached(sys, ctx);
    if (hit){ hit.fromCache = true; return Promise.resolve(hit); }
    if (inPage[key]) return inPage[key];
    if (flightActive(key)) {
      inPage[key] = waitForOther(sys, ctx, key).then(function(r){ delete inPage[key]; return r || getReading(sys, ctx); });
      return inPage[key];
    }
    var apiKey = null, model = DEFAULT_MODEL;
    try { apiKey = localStorage.getItem("cozTestApiKey"); model = localStorage.getItem("cozTestModel") || model; } catch(e){}
    if (!apiKey) return Promise.reject(new Error("DEV: no test API key on this device. Open test-index.html and enter the Demo test key."));

    markFlight(key, true);
    var evP = sys === "tropical" ? Promise.resolve(tropicalEvidence(ctx.charts.tropical))
      : sys === "vedic" ? vedicEvidence(ctx.charts.vedic)
      : vedicEvidence(ctx.charts.vedic).then(function(v){
          return { tropical: tropicalEvidence(ctx.charts.tropical), vedic: v, same: ctx.pair.tropical.sign === ctx.pair.vedic.sign };
        });
    inPage[key] = evP
    .then(function(ev){
      var vev = sys === "combined" ? ev.vedic : ev;
      if (sys !== "tropical" && (!vev.claimSentences || !vev.claimSentences.length)) throw new Error("DEV: no Section 1 evidence matched this chart");
      var system = sys === "tropical" ? SYS_TROPICAL : sys === "vedic" ? SYS_VEDIC : SYS_COMBINED;
      var user = sys === "tropical" ? userMsgTropical(ev) : sys === "vedic" ? userMsgVedic(ev) : userMsgCombined(ev);
      function call(msg, attempt){
        logCall({ key: key, system: sys, attempt: attempt, at: new Date().toISOString() });
        var ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
        var tm = ctl ? setTimeout(function(){ ctl.abort(); }, CALL_TIMEOUT_MS) : null;
        return fetchRetry("https://api.anthropic.com/v1/messages", {
          method: "POST", signal: ctl ? ctl.signal : undefined,
          headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01",
                     "anthropic-dangerous-direct-browser-access": "true", "content-type": "application/json" },
          body: JSON.stringify({ model: model, max_tokens: 1800, system: system, messages: [{ role: "user", content: msg }] })
        }, 3).then(function(r){ return r.text().then(function(t){ clearTimeout(tm); if (!r.ok) throw new Error("DEV: API " + r.status + ": " + t.slice(0, 200)); return JSON.parse(t); }); },
          function(err){ clearTimeout(tm); if (err && err.name === "AbortError") throw new Error("DEV: " + sys + " reading timed out after " + (CALL_TIMEOUT_MS / 1000) + " seconds (attempt " + attempt + ")"); throw err; })
        .then(function(data){
          var text = (data.content || []).filter(function(b){ return b.type === "text"; }).map(function(b){ return b.text; }).join("\n");
          var clean = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
          var s = clean.indexOf("{"), e = clean.lastIndexOf("}");
          var out = null; try { out = JSON.parse(clean.slice(s, e + 1)); } catch(err){}
          if (out && Array.isArray(out.paragraphs)) out.paragraphs = out.paragraphs.map(tidy).filter(Boolean);
          if (out && out.preview) out.preview = tidy(out.preview);
          var problems = check(sys, out, ev);
          if (problems.length && attempt === 1)
            return call(user + "\n\nYour previous attempt had these problems: " + problems.join("; ") + ". Fix them and return the full JSON again.", 2)
              .then(function(r2){ r2.usageTotal = [data.usage].concat(r2.usageTotal || []); return r2; });
          if (!out || !Array.isArray(out.paragraphs) || problems.some(function(p){ return /forbidden|nakshatra|no paragraphs|heading|banned/.test(p); }))
            throw new Error("DEV: generated " + sys + " reading failed validation: " + problems.join("; "));
          if (!out.preview) out.preview = out.paragraphs[0].split(/(?<=[.!?])\s/)[0];
          return { paragraphs: out.paragraphs, preview: out.preview, attempts: attempt, usageTotal: [data.usage],
                   trace: { engineVersion: sys === "combined" ? COMBINED_VERSION : ENGINE_VERSION, model: model, system: sys, validation: problems, words: words(out.paragraphs),
                            evidence: ev, systemPrompt: system, userMessage: user, rawResponse: text } };
        });
      }
      return call(user, 1);
    })
    .then(function(r){
      var rec = { paragraphs: r.paragraphs, preview: r.preview, runId: ctx.pair.runId, fingerprint: ctx.pair.fingerprint,
                  system: sys, sign: signFor(sys, ctx),
                  engineVersion: sys === "combined" ? COMBINED_VERSION : ENGINE_VERSION, generatedAt: new Date().toISOString(), developmentOnly: true,
                  provenance: sys === "vedic" ? "Section 1 claim records + Vedic generator guardrails"
                    : sys === "combined" ? "Section 1 claim records + tropical engine chart data, combined synthesis (first wiring, unreviewed)"
                    : "Tropical spec + tropical engine chart data (first wiring, unreviewed)",
                  attempts: r.attempts, trace: r.trace };
      try { localStorage.setItem(key, JSON.stringify(rec)); } catch(e){}
      markFlight(key, false);
      window.COZ_ASC_TRACE = window.COZ_ASC_TRACE || {}; window.COZ_ASC_TRACE[sys] = rec.trace;
      return rec;
    });
    inPage[key].catch(function(){ delete inPage[key]; markFlight(key, false); });
    return inPage[key];
  }

  window.COZ_ASC = { SIGNS: SIGNS, GLYPH: GLYPH, cap: cap, PAIR_FAIL: PAIR_FAIL, ENGINE_VERSION: ENGINE_VERSION,
    fingerprint: cozBirthFingerprint, currentRun: currentRun, ensurePair: ensurePair, getReading: getReading, getCached: getCached,
    _prompts: { SYS_VEDIC: SYS_VEDIC, SYS_TROPICAL: SYS_TROPICAL, SYS_COMBINED: SYS_COMBINED } };
})();
