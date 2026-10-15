/* COZALYZE · COMBINED READING GENERATOR · CG0.8 (v11 · CR3.5) · DEVELOPMENT ONLY · NOT APPROVED LANGUAGE
   CR3.5 (Oct 3): a repair line now names the exact words that broke a wording rule (for example
   "meant to") and says they are refused in any sense. Before, the line only gave the rule's general
   meaning ("Do not claim destiny..."), so a sentence using "meant to" for purpose was kept as it
   was and step 1 failed twice. Nothing else changes: prompts, validator, budget, retries,
   timeouts, checkpoint, cache keys.
   CR3.4 (Sep 25): step 2 sees each Section I and II paragraph labelled with the accepted step 1
   entry ids that cover it, and a buildsOn repair restates the exact valid entry list. Nothing
   else changes: validator, budget, retries, timeouts, checkpoint and step 1 are as before.
   INPUT: the validated chart-run pair + the Compare evidence manifest (compare-evidence.js).
     Vedic   = only claims that pass the CE1.2 eligibility gate (developmentEligible records,
               no BLOCKED/GAP/PROHIBITED status, sourced, claimConditions satisfied).
     Western = STRUCTURAL factors only. There are no approved Western meanings yet, so every
               Western-derived statement is an unreviewed model interpretation.
   ONE call returns all three sections + an internal evidence trace. Previews stay fixed in
   the page. One retry, reason logged. Cache namespace is DEV only and keyed by run,
   fingerprint, both engine versions, prompt, selection and taxonomy versions and the
   Western claim-system version ("none"), so it can never be reused as a production result
   and is invalidated when any of those change. */
(function(){
  /* CR3.1 (his ruling): each step has its own version.
     STEP1_VERSION keys the saved step 1. It is the exact string the whole reading used
     before, because the step 1 prompt has not changed, so a step 1 already saved on a
     phone stays valid. STEP2_VERSION is part of the FINAL reading's key only: changing the
     step 2 rules retires every finished reading written under the old rules, and nothing
     else. Bump STEP1_VERSION only when the step 1 prompt or its output shape changes. */
  var STEP1_VERSION = "cmp-step1 cr3.3-one-theme";   /* CR3.3: step 1 reminder also fixes the one-theme-key rule */
  var STEP2_VERSION = "cmp-step2 cr3.4-labelled-entries";   /* CR3.4: new step 2 prompt; step 1 checkpoint unaffected */
  var PROMPT_VERSION = STEP1_VERSION + " + " + STEP2_VERSION;
  var WESTERN_CLAIM_SYSTEM = "none";                     // bump when the Tropical claim system exists
  /* agreed Combined Reading size (Sep 22): about 150 / 200 / 120 words, ~470 total */
  var RANGES = { sharedThemes: [120, 190, 2, 3], differentEmphases: [160, 250, 2, 4], integratedView: [95, 155, 1, 2] };
  var DEFAULT_MODEL = "claude-sonnet-4-6";
  var PLANETS = ["Sun","Moon","Mercury","Venus","Mars","Jupiter","Saturn","Uranus","Neptune","Pluto","Rahu","Ketu"];
  var NAKSHATRAS = ["Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra","Punarvasu","Pushya","Ashlesha","Magha",
    "Purva Phalguni","Uttara Phalguni","Hasta","Chitra","Swati","Vishakha","Anuradha","Jyeshtha","Mula","Purva Ashadha",
    "Uttara Ashadha","Shravana","Dhanishta","Shatabhisha","Purva Bhadrapada","Uttara Bhadrapada","Revati"];
  var SIGNS = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];

  var SYSTEM = [
    "You write the three-part Combined Reading for CozAlyze. It compares ONE person's Western chart (tropical zodiac) with their Vedic chart (sidereal zodiac). It is not another Western or Vedic reading and never pastes the two together.",
    "",
    "FRAMEWORK. CozAlyze organizes the comparison this way: the Western chart tends to describe visible expression and the outward way of engaging with life; the Vedic chart tends to describe the deeper inner blueprint and orientation. Present this as the product's organizing lens, not a fact, and do not force every sentence into it: either chart may describe a pattern that is lived both inwardly and outwardly. Neither system corrects, disproves, outranks or verifies the other. Never say one chart is right, real, superficial, truer or more spiritual, never describe two conflicting identities, and never treat a sign change as one system invalidating the other.",
    "",
    "EVIDENCE. Use only the evidence supplied. Vedic evidence is a set of eligible claim statements: rephrase and connect them, never add a meaning they do not support, and never extend a claim into anything listed under its prohibited extensions. Western evidence is placements with no approved meanings: interpret them conservatively, never more strongly than the Vedic claims you pair them with.",
    "",
    "SHARED THEMES THRESHOLD. A shared theme needs ALL of: at least one Vedic claim, at least one clearly relevant Western factor, and a real reason the two point to the same functional pattern. If either side is weak, omit that theme entirely. Never write that one side offers only a light or faint signal: a weak convergence is left out, not hedged. Do not pad to reach a topic count. Two or three paragraphs may explore the strongest convergences in more depth.",
    "DIFFERENCES THRESHOLD. Every difference needs at least one Western factor, at least one Vedic claim, and a genuine difference in function or emphasis. A sign change alone is never a difference. A theme supported on only one side gets no comparison at all.",
    "",
    "SECTIONS.",
    "sharedThemes: convergence. Open directly with this person's first convergence; at most one short framing clause, and never explain the product or the zodiacs. Wording like 'Both perspectives may draw attention to', 'A similar pattern appears through different parts of the two charts', 'The two systems seem to converge around', 'This theme may be experienced both outwardly and internally'. Never 'confirmed twice' or anything implying repetition makes it certain. Two or three paragraphs, 120 to 190 words in total.",
    "differentEmphases: distinction. Two to four real differences, balanced between the systems, explained as different layers, contexts or expressions. Wording like 'Your Western chart places greater emphasis on', 'Your Vedic chart brings more attention to', 'These are not necessarily opposing descriptions', 'One perspective describes how the pattern may be expressed; the other describes what may be driving it.' Two to four paragraphs, 160 to 250 words in total.",
    "integratedView: synthesis ONLY of propositions already established in sharedThemes or differentEmphases. No new factor, claim, theme, prediction or outcome. Do not infer results (for example that decisions work out, hold up, succeed or pay off), and do not make identity-essence judgments such as where the person feels most like themselves or who they really are. Explain how the two emphases may interact, where they reinforce each other, where conscious balance may help, how a difference may become complementary, and the clearest takeaway. Wording like 'Taken together', 'The fuller picture suggests', 'You may recognize both patterns operating in different circumstances', 'Neither perspective needs to cancel the other'. The last paragraph is a concise, specific synthesis, not a motivational ending. One or two paragraphs, 95 to 155 words in total.",
    "Each section does a different job; do not repeat the same conclusion across the three.",
    "",
    "CUSTOMER LANGUAGE. Say 'your Western chart' or 'your Western chart using the tropical zodiac', and 'your Vedic chart' or 'your Vedic chart using the sidereal zodiac'; never 'Tropical astrology'. The ONLY chart terms allowed in the prose are the two rising signs by name. Do not name any planet or graha, including the Sun, the Moon and the guiding planet: describe what the factor does in plain words instead. Never name a nakshatra, a pada, a house or house number, another zodiac sign, an aspect, a rulership, a claim ID or a factor label.",
    "",
    "VOICE. Sound like a person speaking, not a lecture. Establish the frame once and then write with natural confidence; do not hedge every sentence, but keep possibility language present: 'may', 'can', 'often', 'appears to emphasize', 'suggests', 'may be experienced as'. Roughly 7th to 8th grade reading level, mostly short sentences, concrete human situations, no academic psychology, no filler. No 6+ word phrase may repeat across the three sections.",
    "REGISTER. No absolute personality declarations, predictions, timing, guaranteed outcomes, medical or mental-health claims, moral judgments, fear-based language, deities, mythology, historical explanations, or generic spiritual filler. Never 'your true self', 'your false self', 'your destiny is', 'you are meant to', 'this will happen', 'you will'. Do not use em dashes; use commas.",
    "",
    "OUTPUT. Return ONLY a JSON object, no prose before or after, no code fences:",
    "{\"sharedThemes\": {\"paragraphs\": [...], \"wordCount\": n, \"evidence\": [{\"id\": \"S1\", \"theme\": themeKey, \"paragraphs\": [paragraph numbers], \"use\": \"shared\", \"tropicalFactors\": [exact factor ids], \"vedicClaimIds\": [exact claim ids], \"why\": \"one line on why they point to the same pattern\"}]},",
    " \"differentEmphases\": {same shape, ids D1.., use \"different\", why = the genuine difference},",
    " \"integratedView\": {same shape, ids I1.., use \"integrated\", plus \"buildsOn\": [ids of the S and D entries it synthesizes]}}",
    "Use only the exact factor ids and claim ids supplied. Every major claim appears in its section's evidence list. The evidence lists are internal and never shown to the customer."
  ].join("\n");

  /* CR3.2: the note OUR prompt appends to a ruler factor. A returned factor ending in exactly
     this text has it stripped and is rewritten to the canonical id before any check. */
  var RULER_NOTE = " (ruler convention undecided, use lightly)";
  var THEME_LABEL = { identity_orientation: "identity and orientation", emotional_mental_patterns: "emotional and mental patterns",
    relationships_exchange: "relationships and exchange", work_life_direction: "work and life direction",
    values_foundation: "values and foundation", growth_release_balance: "growth, release and balance" };

  function supplied(man){
    var t = {}, v = {}, vStatus = {}, themes = {};
    man.items.forEach(function(i){
      if (i.system === "tropical" && (i.evidenceStatus === "STRUCTURAL_ONLY_NO_APPROVED_MEANING" || /ruler/.test(i.factorId) && i.evidenceStatus === "BLOCKED_PENDING_RULING")) { t[i.factorId] = i.themeKey; }
      if (i.system === "vedic" && i.compareEligible) (i.claimMeanings || []).forEach(function(c){ v[c.claimId] = i.themeKey; vStatus[c.claimId] = { recordStatus: i.evidenceStatus, classification: c.classification, record: i.source.recordId }; });
    });
    Object.keys(THEME_LABEL).forEach(function(k){
      themes[k] = Object.keys(t).some(function(f){ return t[f] === k; }) && Object.keys(v).some(function(c){ return v[c] === k; });
    });
    return { tropical: t, vedic: v, vedicStatus: vStatus, comparable: themes };
  }

  function userMessage(man, pair, sup){
    var L = ["Rising signs: Western " + cap(pair.tropical.sign) + ", Vedic " + cap(pair.vedic.sign) + ".", ""];
    Object.keys(THEME_LABEL).forEach(function(k){
      var T = man.items.filter(function(i){ return i.system === "tropical" && i.themeKey === k && sup.tropical[i.factorId] === k; });
      var V = man.items.filter(function(i){ return i.system === "vedic" && i.themeKey === k && i.compareEligible; });
      L.push("THEME " + k + " (" + THEME_LABEL[k] + ")" + (sup.comparable[k] ? "" : "  [NOT COMPARABLE: evidence on one side only, write nothing comparative about it]"));
      L.push("  Western factors: " + (T.length ? T.map(function(i){ return i.factorId + (/ruler/.test(i.factorId) ? RULER_NOTE : ""); }).join("; ") : "none"));
      if (V.length){
        L.push("  Vedic claims:");
        var seen = {};
        V.forEach(function(i){
          (i.claimMeanings || []).forEach(function(c){ if (seen[c.claimId]) return; seen[c.claimId] = 1; L.push("   - [" + c.claimId + "] " + c.meaning); });
          if (i.prohibitedExtensions && i.prohibitedExtensions.length) L.push("     prohibited extensions: " + i.prohibitedExtensions.join("; "));
        });
      } else L.push("  Vedic claims: none eligible");
      L.push("");
    });
    L.push("Write the Combined Reading now. JSON only.");
    return L.join("\n");
  }
  function cap(s){ return String(s).charAt(0).toUpperCase() + String(s).slice(1); }
  function words(ps){ return ps.join(" ").trim().split(/\s+/).filter(Boolean).length; }
  function tidy(t){ return String(t).replace(/\s*\u2014\s*/g, ", ").replace(/\s*\u2013\s*/g, ", ").replace(/,\s*,/g, ",").replace(/\s{2,}/g, " ").trim(); }
  function esc(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  function validate(out, sup, pair){
    var hard = [], soft = [];
    if (!out) return { hard: ["unparseable response"], soft: [] };
    var allowedSigns = [cap(pair.tropical.sign), cap(pair.vedic.sign)];
    var otherSigns = SIGNS.filter(function(s){ return allowedSigns.indexOf(s) < 0; });
    var banned = [
      [new RegExp("\\b(" + PLANETS.join("|") + ")\\b"), "planet name"],
      [new RegExp("\\b(" + NAKSHATRAS.map(esc).join("|") + ")\\b", "i"), "nakshatra name"],
      [new RegExp("\\b(" + otherSigns.join("|") + ")\\b"), "sign other than the two rising signs"],
      [/\b(nakshatras?|padas?|dashas?|ayanamsh?a|graha|lagna)\b/i, "technical term"],
      [/\b\d{1,2}(st|nd|rd|th) house\b|\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth) house\b|\bhouse of\b/i, "house reference"],
      [/\b(APP|IR|APPREC)-[A-Z0-9-]+|\btrop\.[a-z]/, "internal ID"],
      [/\b(true self|false self|destiny is|meant to|will happen|you will|confirmed twice|tropical astrology)\b/i, "banned phrase"],
      [/\b(light signal|faint signal|weak signal|only a hint)\b/i, "weak convergence hedge"],
      [/\bdifferent zodiacs\b/i, "product explanation"],
      [/\b(holds? up|pays? off|succeeds?|turns? out well|works? out (well|fine|for you)|most like yourself|who you really are|the real you)\b/i, "outcome or identity-essence inference"],
      [/\u00B0/, "degree sign"]
    ];
    var ids = { S: {}, D: {} }, details = [];
    Object.keys(RANGES).forEach(function(k){
      var r = RANGES[k], sct = out[k];
      if (!sct || !Array.isArray(sct.paragraphs)) { hard.push(k + ": missing"); return; }
      sct.paragraphs = sct.paragraphs.map(tidy).filter(Boolean);
      var w = words(sct.paragraphs); sct.wordCountMeasured = w;
      /* v5.1 (Sep 22): length is never fatal. A section outside its range is asked for again
         on the first pass and accepted on the second, because a reading a little long is
         better than no reading. Only a runaway section (more than double) is rejected. */
      /* CR3.1 (his ruling): word count is ALWAYS soft, however far out. Length alone never
         spends a request. Paragraph count and structure stay hard. */
      if (w < r[0] || w > r[1]) soft.push(k + ": " + w + " words (" + r[0] + "-" + r[1] + ")");
      if (sct.paragraphs.length < r[2] || sct.paragraphs.length > r[3]) hard.push(k + ": " + sct.paragraphs.length + " paragraphs");
      var text = sct.paragraphs.join(" ");
      var sentences = text.match(/[^.!?]+[.!?]*/g) || [text];
      banned.forEach(function(b){ var m = text.match(b[0]); if (m) {
        hard.push(k + ": " + b[1] + " \"" + m[0] + "\"");
        /* CR3.1: every sentence that breaks this rule, not only the first */
        sentences.forEach(function(x){ var mm = x.match(b[0]); if (mm) details.push({ section: k, rule: b[1], match: mm[0], sentence: x.trim() }); });
      } });
      if (!Array.isArray(sct.evidence) || !sct.evidence.length) { hard.push(k + ": no evidence trace"); return; }
      sct.evidence.forEach(function(e){
        /* CR3.2: exact, not a prefix match. Only our own appended note is removed, the result
           must still be an exact supplied id, and the canonical id replaces the annotated one
           so the saved step 1 and step 2 only ever carry real ids. */
        e.tropicalFactors = (e.tropicalFactors || []).map(function(f){
          return (typeof f === "string" && f.length > RULER_NOTE.length && f.slice(-RULER_NOTE.length) === RULER_NOTE) ? f.slice(0, -RULER_NOTE.length) : f;
        });
        var tf = e.tropicalFactors, vc = e.vedicClaimIds || [];
        tf.forEach(function(f){ if (!sup.tropical[f]) hard.push(k + " " + e.id + ": unknown Western factor " + f); });
        vc.forEach(function(c){ if (!sup.vedic[c]) hard.push(k + " " + e.id + ": Vedic claim not eligible or not supplied " + c); });
        if (k !== "integratedView"){
          if (!tf.length || !vc.length) hard.push(k + " " + e.id + ": needs evidence on BOTH sides");
          if (e.theme && !sup.comparable[e.theme]) hard.push(k + " " + e.id + ": theme " + e.theme + " is not comparable");
          ids[k === "sharedThemes" ? "S" : "D"][e.id] = e;
        }
      });
    });
    if (out.integratedView && Array.isArray(out.integratedView.evidence)){
      var prior = { f: {}, c: {}, t: {} };
      ["sharedThemes","differentEmphases"].forEach(function(k){ ((out[k] || {}).evidence || []).forEach(function(e){
        (e.tropicalFactors || []).forEach(function(f){ prior.f[f] = 1; }); (e.vedicClaimIds || []).forEach(function(c){ prior.c[c] = 1; }); prior.t[e.theme] = 1; }); });
      out.integratedView.evidence.forEach(function(e){
        (e.tropicalFactors || []).forEach(function(f){ if (!prior.f[f]) hard.push("integratedView " + e.id + ": new Western factor " + f); });
        (e.vedicClaimIds || []).forEach(function(c){ if (!prior.c[c]) hard.push("integratedView " + e.id + ": new Vedic claim " + c); });
        if (e.theme && !prior.t[e.theme]) hard.push("integratedView " + e.id + ": new theme " + e.theme);
        (e.buildsOn || []).forEach(function(b){ if (!ids.S[b] && !ids.D[b]) hard.push("integratedView " + e.id + ": buildsOn unknown entry " + b); });
      });
    }
    return { hard: hard, soft: soft, details: details };
  }
  /* CR3.1: the plain rule behind each wording check, handed to the writer on a retry */
  var RULE_TEXT = {
    "planet name": "Do not name planets.",
    "nakshatra name": "Do not name nakshatras.",
    "sign other than the two rising signs": "Name no zodiac sign except the two rising signs.",
    "technical term": "Use no technical astrology terms.",
    "house reference": "Do not mention houses.",
    "internal ID": "Never put evidence IDs in the prose.",
    "banned phrase": "Do not claim destiny, certainty, a true or false self, or what will happen.",
    "weak convergence hedge": "Do not call a match weak, faint or only a hint.",
    "product explanation": "Do not explain the product or the two zodiacs.",
    "outcome or identity-essence inference": "Do not say or imply that anything works out, holds up, succeeds, turns out well or pays off, and do not describe who the person really is or is most like.",
    "degree sign": "No degree signs."
  };
  function plainRule(h){
    if (/ is not comparable$/.test(h)) return " Rule: each evidence item's theme is exactly ONE theme key from the list, never two keys joined together, and only a theme marked comparable.";
    if (/unknown Western factor/.test(h)) return " Rule: copy Western factor ids exactly as listed.";
    if (/Vedic claim not eligible or not supplied/.test(h)) return " Rule: cite Vedic claim ids exactly as listed, and only the ones listed.";
    if (/paragraph/.test(h)) return " Rule: keep the paragraph count for that section.";
    return "";
  }
  function repairList(v, validEntries){
    var lines = (v.details || []).map(function(d, i){ return (i + 1) + ". Sentence: \"" + d.sentence + "\"  Rule broken: " + d.rule + ". " + (RULE_TEXT[d.rule] || "") +
      (d.match ? " The exact words \"" + d.match + "\" are refused in any sense, including purpose; rewrite the sentence without them." : ""); });   /* CR3.5 */
    var other = v.hard.filter(function(h){ return !(v.details || []).some(function(d){ return h.indexOf(d.rule) >= 0 && h.indexOf(d.section) === 0; }); });
    other.forEach(function(h){
      /* CR3.4: an unknown buildsOn entry is answered with the complete valid list for THIS accepted step 1 */
      var extra = (validEntries && / buildsOn unknown entry /.test(h))
        ? " Rule: every buildsOn value must be copied exactly from this list, the entries that exist in Sections I and II: " + (validEntries.join(", ") || "(none)") + ". No other entry exists."
        : plainRule(h);
      lines.push((lines.length + 1) + ". " + h + "." + extra);
    });
    return lines.join("\n");
  }
  var STEP1_REMINDER = "\n\nRULE REMINDER FOR sharedThemes AND differentEmphases. " + RULE_TEXT["outcome or identity-essence inference"] +
    " Words and phrases that are refused: works out, holds up, pays off, succeeds, turns out well, the real you, who you really are, meant to, will happen, you will. Describe how each emphasis operates, never a result." +
    " Every evidence item names exactly ONE theme key, copied from the THEME lines above; never join two keys with a plus sign or a slash.";
  var STEP2_REMINDER = "\n\nRULE REMINDER FOR integratedView. " + RULE_TEXT["outcome or identity-essence inference"] +
    " Words and phrases that are refused: works out, holds up, pays off, succeeds, turns out well, the real you, who you really are, meant to, will happen, you will. Describe how the two emphases can operate together, never a result.";

  function cacheKey(pair, man){
    return "cozCombinedReadingDEV:" + [pair.runId, pair.fingerprint, pair.engineVersions.tropical, pair.engineVersions.vedic,
      STEP1_VERSION, STEP2_VERSION, man.selectionVersion, man.taxonomyVersion, "westernClaims=" + WESTERN_CLAIM_SYSTEM].join("|");
  }
  function step1KeyFor(pair, man){
    return "cozCombinedStep1DEV:" + [pair.runId, pair.fingerprint, pair.engineVersions.tropical, pair.engineVersions.vedic,
      STEP1_VERSION, man.selectionVersion, man.taxonomyVersion, "westernClaims=" + WESTERN_CLAIM_SYSTEM].join("|");
  }
  function logCall(e){ try { var L = JSON.parse(localStorage.getItem("cozCombinedGenLog") || "[]"); L.push(e); localStorage.setItem("cozCombinedGenLog", JSON.stringify(L.slice(-40))); } catch(x){} }

  /* v5 (Sep 22): TWO STEPS. Step 1 writes sharedThemes and differentEmphases. Step 2 writes
     integratedView and is handed the exact evidence ids step 1 used, because the writer kept
     citing fresh Vedic claims there and failing the "no new evidence" rule on every pass. */
  function idsUsed(out){
    var f = {}, c = {}, t = {}, ids = [];
    ["sharedThemes", "differentEmphases"].forEach(function(k){
      ((out && out[k] && out[k].evidence) || []).forEach(function(e){
        if (e.id) ids.push(e.id);
        (e.tropicalFactors || []).forEach(function(x){ f[x] = 1; });
        (e.vedicClaimIds || []).forEach(function(x){ c[x] = 1; });
        if (e.theme) t[e.theme] = 1;
      });
    });
    return { factors: Object.keys(f), claims: Object.keys(c), themes: Object.keys(t), entryIds: ids };
  }
  /* CR3.4: every id below is read from the accepted step 1 object; nothing is hard-coded */
  function labelledParagraphs(sct){
    var ps = (sct && sct.paragraphs) || [], ev = (sct && sct.evidence) || [];
    return ps.map(function(p, i){
      var n = i + 1, by = ev.filter(function(e){ return e && e.id && (e.paragraphs || []).map(Number).indexOf(n) >= 0; }).map(function(e){ return e.id; });
      return "[Paragraph " + n + " \u00b7 entries: " + (by.join(", ") || "none") + "] " + p;
    }).join("\n\n");
  }
  function entryList(part1){
    var L = [];
    ["sharedThemes", "differentEmphases"].forEach(function(k){
      ((part1 && part1[k] && part1[k].evidence) || []).forEach(function(e){
        if (!e || !e.id) return;
        L.push("  " + e.id + " (" + (k === "sharedThemes" ? "Section I" : "Section II") + ", theme " + (e.theme || "?") + ", paragraphs " + ((e.paragraphs || []).join(", ") || "none") + ")");
      });
    });
    return L.join("\n") || "  (none)";
  }
  function stage2Message(user, part1, man, pair, sup){
    var u = idsUsed(part1);
    /* v5: step 2 is built from the two written sections plus ONLY the evidence they used.
       Evidence that Integrated View may not cite never appears in this prompt at all. */
    var allowed = ["Rising signs: Western " + cap(pair.tropical.sign) + ", Vedic " + cap(pair.vedic.sign) + ".", ""];
    u.themes.forEach(function(t){
      allowed.push("THEME " + t + (THEME_LABEL[t] ? " (" + THEME_LABEL[t] + ")" : ""));
      var fs = u.factors.filter(function(f){ return (man.items || []).some(function(i){ return i.system === "tropical" && i.factorId === f && i.themeKey === t; }); });
      allowed.push("  Western factors used: " + (fs.join(", ") || "(none)"));
      var lines = [], seen = {};
      (man.items || []).forEach(function(i){
        if (i.system !== "vedic" || i.themeKey !== t) return;
        var supplied = false;
        (i.claimMeanings || []).forEach(function(c){
          if (seen[c.claimId] || u.claims.indexOf(c.claimId) < 0) return;
          seen[c.claimId] = 1; supplied = true; lines.push("   - [" + c.claimId + "] " + c.meaning);
        });
        /* the safety boundaries travel with the allowed claims; records that supplied no
           allowed claim contribute nothing, so no fresh evidence is exposed */
        if (supplied && i.prohibitedExtensions && i.prohibitedExtensions.length)
          lines.push("     prohibited extensions: " + i.prohibitedExtensions.join("; "));
      });
      allowed.push(lines.length ? "  Vedic claims used:" : "  Vedic claims used: (none)");
      lines.forEach(function(l){ allowed.push(l); });
      allowed.push("");
    });
    return [
      allowed.join("\n"),
      "",
      "STEP 2 of 2. Sections I and II are already written and are shown below. Write ONLY integratedView now.",
      "",
      "SECTION I (sharedThemes), as written, each paragraph labelled with the evidence entries that support it:",
      labelledParagraphs(part1.sharedThemes),
      "",
      "SECTION II (differentEmphases), as written, each paragraph labelled with the evidence entries that support it:",
      labelledParagraphs(part1.differentEmphases),
      "",
      "EVIDENCE ENTRIES FROM SECTIONS I AND II (these are the only entries that exist):",
      entryList(part1),
      "",
      "HARD LIMIT. integratedView may use ONLY these ids, and no others:",
      "  Western factors allowed: " + (u.factors.join(", ") || "(none)"),
      "  Vedic claims allowed: " + (u.claims.join(", ") || "(none)"),
      "  themes allowed: " + (u.themes.join(", ") || "(none)"),
      "  buildsOn must reference these entries: " + (u.entryIds.join(", ") || "(none)"),
      "Any other factor id, claim id or theme is a failure. Introduce no new evidence, no new theme and no new conclusion; synthesize what Sections I and II already establish.",
      "",
      "Return ONLY this JSON, no prose, no code fences:",
      "{\"integratedView\": {\"paragraphs\": [...], \"wordCount\": n, \"evidence\": [{\"id\": \"I1\", \"theme\": themeKey, \"paragraphs\": [numbers], \"use\": \"integrated\", \"tropicalFactors\": [...], \"vedicClaimIds\": [...], \"buildsOn\": [...], \"why\": \"...\"}]}}"
    ].join("\n");
  }
  /* v6 · CR3.0 (Sep 22): JOB CONTROL.
     - Every real POST is counted the moment it is sent. One Combined job may send at most
       MAX_REQUESTS (4). Transport retries (429, 529, 5xx, dropped connection) spend from the
       same four; there is no second allowance underneath.
     - Any other 4xx (400 credit, 401, 403, 413, bad request) stops at once. The same prompt
       is never resent after one of those.
     - Step 1 (Shared Themes + Different Emphases) is saved the moment it passes validation
       and is never paid for again for this chart run; step 2 resumes from it.
     - The in-flight marker carries the owner's unique id and a heartbeat every 5 s. A marker
       whose heartbeat is older than 20 s belongs to a page that is gone and is ignored.
       The owner clears it on success and on terminal failure.
     - Validation retry rule (CR3.1, his ruling): word count outside range is a soft note,
       never a paid retry. One retry per step, hard failures only, spent from the same four.
       A step 2 retry REPAIRS its own Integrated View: it receives the exact sentences and
       the exact rules they broke. The step 2 prompt repeats the no-outcome rule at its end.
       Versions are split by step (STEP1_VERSION / STEP2_VERSION, see the top of this file). */
  var MAX_REQUESTS = 4, BEAT_MS = 5000, DEAD_MS = 20000, CALL_MS = 150000;
  var INFLIGHT = "cozCombinedGenInFlight", PHASE = "cozCombinedGenPhase";
  function readMarker(){ try { return JSON.parse(localStorage.getItem(INFLIGHT) || "null"); } catch(e){ return null; } }
  function peek(pair, man){
    try { var c = JSON.parse(localStorage.getItem(cacheKey(pair, man)) || "null"); if (c && c.sharedThemes){ c.fromCache = true; return c; } } catch(e){}
    return null;
  }
  function liveMarker(key){ var m = readMarker(); return m && m.key === key && (Date.now() - (m.beat || 0)) < DEAD_MS ? m : null; }
  function inFlight(pair, man){ return !!liveMarker(cacheKey(pair, man)); }
  function markerOwner(pair, man){ var m = liveMarker(cacheKey(pair, man)); return m ? m.owner : null; }
  function readStep1(k1){ try { var c = JSON.parse(localStorage.getItem(k1) || "null"); return c && c.out && c.out.sharedThemes ? c : null; } catch(e){ return null; } }
  function peekStep1(pair, man){ return readStep1(step1KeyFor(pair, man)); }
  function readPhase(pair, man){ try { var p = JSON.parse(localStorage.getItem(PHASE) || "null"); return p && p.key === cacheKey(pair, man) ? p : null; } catch(e){ return null; } }
  /* waits while ANOTHER live owner is writing this reading; resolves the record, or null
     the moment that owner's heartbeat stops */
  function waitForLive(pair, man){
    return new Promise(function(resolve){
      (function poll(){
        var hit = peek(pair, man); if (hit) return resolve(hit);
        if (!inFlight(pair, man)) return resolve(null);
        setTimeout(poll, 1500);
      })();
    });
  }
  function terminal(kind, status, message){ var e = new Error(message); e.terminal = true; e.kind = kind; e.status = status || 0; return e; }
  function wait(ms){ return new Promise(function(res){ setTimeout(res, ms); }); }
  function retryAfterMs(r, n){
    var h = r.headers && r.headers.get && r.headers.get("retry-after");
    var s = h ? parseFloat(h) : NaN;
    return isFinite(s) ? Math.min(s * 1000, 30000) : Math.min(4000 * n, 20000);
  }

  var inPage = null, inPageKey = null;
  function getCombined(pairCtx, man, opts){
    opts = opts || {};
    var key = cacheKey(pairCtx.pair, man), k1 = step1KeyFor(pairCtx.pair, man);
    var hit = peek(pairCtx.pair, man); if (hit) return Promise.resolve(hit);
    if (inPage && inPageKey === key) return inPage;      /* same chart run only */
    inPage = null; inPageKey = null;
    var owner = opts.owner || ("page-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8));
    var other = liveMarker(key);
    if (other && other.owner !== owner) return Promise.reject(terminal("busy", 0, "DEV: another page is already writing this reading"));
    var apiKey = null, model = DEFAULT_MODEL;
    try { apiKey = localStorage.getItem("cozTestApiKey"); model = localStorage.getItem("cozTestModel") || model; } catch(e){}
    if (!apiKey) return Promise.reject(terminal("no_key", 0, "DEV: no test API key on this device. Open test-index.html and enter the Demo test key."));
    var sup = supplied(man);
    if (!Object.keys(sup.comparable).some(function(k){ return sup.comparable[k]; })) return Promise.reject(terminal("no_evidence", 0, "DEV: no theme has eligible evidence on both sides for this chart"));
    var user = userMessage(man, pairCtx.pair, sup);
    var STEP1 = user + "\n\nSTEP 1 of 2. Write ONLY sharedThemes and differentEmphases now, in the shape given above. Leave integratedView out entirely; it is written in a second step." + STEP1_REMINDER;

    var job = { sent: 0, stage: 1, validationAttempt: 1, transportAttempt: 0, startedAt: Date.now(), step1Saved: false, retryReason: null };
    function status(state, extra){
      var o = { key: key, owner: owner, state: state, stage: job.stage, validationAttempt: job.validationAttempt,
                transportAttempt: job.transportAttempt, totalRequests: job.sent, maxRequests: MAX_REQUESTS,
                step1Saved: job.step1Saved, retryReason: job.retryReason || null, startedAt: job.startedAt, at: Date.now() };
      if (extra) for (var k in extra) o[k] = extra[k];
      try { localStorage.setItem(PHASE, JSON.stringify(o)); } catch(e){}
      if (opts.onStatus) try { opts.onStatus(o); } catch(e){}
    }
    function beat(){ try { localStorage.setItem(INFLIGHT, JSON.stringify({ key: key, owner: owner, beat: Date.now() })); } catch(e){} }
    function clearMarker(){ var m = readMarker(); if (m && m.key === key && m.owner === owner) try { localStorage.removeItem(INFLIGHT); } catch(e){} }

    /* one POST, counted when sent; transport retries spend from the same budget */
    function post(msg){
      job.transportAttempt = 0;
      function attempt(){
        if (job.sent >= MAX_REQUESTS) return Promise.reject(terminal("budget", 0, "DEV: stopped after " + job.sent + " of " + MAX_REQUESTS + " requests"));
        job.sent++; job.transportAttempt++;
        logCall({ key: key, owner: owner, request: job.sent, stage: job.stage, validationAttempt: job.validationAttempt, transportAttempt: job.transportAttempt,
                  retryReason: job.validationAttempt === 2 ? job.retryReason : null, at: new Date().toISOString() });
        status("running");
        var ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
        var tm = ctl ? setTimeout(function(){ ctl.abort(); }, CALL_MS) : null;
        return fetch("https://api.anthropic.com/v1/messages", {
          method: "POST", signal: ctl ? ctl.signal : undefined,
          headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true", "content-type": "application/json" },
          body: JSON.stringify({ model: model, max_tokens: 7000, system: SYSTEM, messages: [{ role: "user", content: msg }] })
        }).then(function(r){
          return r.text().then(function(t){
            clearTimeout(tm);
            if (r.ok) return JSON.parse(t);
            var retryable = r.status === 429 || r.status >= 500;          /* 429, 500, 529 and other 5xx */
            if (retryable && job.sent < MAX_REQUESTS) return wait(retryAfterMs(r, job.transportAttempt)).then(attempt);
            throw terminal(retryable ? "http_budget" : "http", r.status, "DEV: API " + r.status + ": " + t.slice(0, 200));
          });
        }, function(e){
          clearTimeout(tm);
          if (e && e.name === "AbortError") throw terminal("timeout", 0, "DEV: no answer within 150 seconds (request " + job.sent + " of " + MAX_REQUESTS + ")");
          var net = e && (e.name === "TypeError" || /load failed|network/i.test(e.message || ""));
          if (net && job.sent < MAX_REQUESTS) return wait(2500).then(attempt);
          throw terminal(net ? "network" : "error", 0, net ? "The connection dropped while your reading was being prepared." : ((e && e.message) || "DEV: request failed"));
        });
      }
      return attempt();
    }
    /* one written step; at most one validation retry per step */
    function write(stage, msg, base, n){
      job.stage = stage; job.validationAttempt = n;
      return post(msg).then(function(data){
        var text = (data.content || []).filter(function(b){ return b.type === "text"; }).map(function(b){ return b.text; }).join("\n");
        var clean = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
        var out = null; try { out = JSON.parse(clean.slice(clean.indexOf("{"), clean.lastIndexOf("}") + 1)); } catch(e){}
        if (stage === 1 && out) out = { sharedThemes: out.sharedThemes, differentEmphases: out.differentEmphases };
        if (stage === 2 && out) out = { sharedThemes: base.sharedThemes, differentEmphases: base.differentEmphases, integratedView: out.integratedView };
        var v = validate(out, sup, pairCtx.pair);
        if (stage === 1) v.hard = v.hard.filter(function(p){ return p.indexOf("integratedView") !== 0; });
        /* CR3.1 (his ruling): a section outside its word range is a soft note, recorded and
           accepted. Only a HARD failure earns the one retry per step. */
        if (v.hard.length && n === 1) {
          job.retryReason = "step " + stage + ": " + v.hard.join("; ");
          var fix;
          if (stage === 2)
            /* repair, not regenerate: the writer gets its own Integrated View back with the
               exact sentences and the exact rules they broke */
            fix = msg + "\n\nREPAIR. Your previous integratedView broke these rules:\n" + repairList(v, idsUsed(base).entryIds) +
                  "\n\nFix EVERY item listed in this one reply. For a sentence item, rewrite only that sentence so it keeps its meaning without breaking the rule. For any other item, change only what that item needs. Keep everything else exactly as written. The whole Integrated View is checked again against every rule after this. Return the JSON with integratedView only.\n\nYOUR PREVIOUS integratedView:\n" + JSON.stringify(out.integratedView);
          else
            /* CR3.3: step 1 is repaired the same way, from its own draft */
            fix = msg + "\n\nREPAIR. Your previous sharedThemes and differentEmphases broke these rules:\n" + repairList(v) +
                  "\n\nFix EVERY item listed in this one reply. For a sentence item, rewrite only that sentence so it keeps its meaning without breaking the rule. For an evidence item, correct only that evidence entry. Keep everything else exactly as written. Both sections are checked again against every rule after this. Return the JSON with sharedThemes and differentEmphases only.\n\nYOUR PREVIOUS DRAFT:\n" + JSON.stringify(out);
          return write(stage, fix, base, 2).then(function(r2){ r2.firstAttemptProblems = v.hard; return r2; });
        }
        if (v.hard.length) {
          try { localStorage.setItem("cozCombinedGenLastFail", JSON.stringify({ at: new Date().toISOString(), stage: stage, hard: v.hard, soft: v.soft })); } catch (e) {}
          var err = terminal("validation", 0, "DEV: step " + stage + " failed these checks twice: " + v.hard.slice(0, 4).join("; "));
          err.validation = v; throw err;
        }
        return { out: out, attempts: n, validation: v, raw: text, firstAttemptProblems: [], softNotes: v.soft };
      });
    }

    beat(); var hb = setInterval(beat, BEAT_MS);
    var cp = readStep1(k1);
    if (cp) job.step1Saved = true;
    status(cp ? "part1_complete" : "running");
    var s1 = cp ? Promise.resolve({ out: cp.out, attempts: cp.attempts, raw: cp.raw, firstAttemptProblems: cp.firstAttemptProblems || [], fromCheckpoint: true })
                : write(1, STEP1, null, 1).then(function(r1){
                    try { localStorage.setItem(k1, JSON.stringify({ out: r1.out, attempts: r1.attempts, raw: r1.raw, firstAttemptProblems: r1.firstAttemptProblems, step1Version: STEP1_VERSION, at: new Date().toISOString(), owner: owner })); } catch(e){}
                    job.step1Saved = true; status("part1_complete");
                    return r1;
                  });
    inPage = s1.then(function(r1){
      return write(2, stage2Message(user, r1.out, man, pairCtx.pair, sup) + STEP2_REMINDER, r1.out, 1).then(function(r2){
        return { out: r2.out, attempts: r1.attempts + r2.attempts, validation: r2.validation, raw: r1.raw + "\n---\n" + r2.raw,
                 firstAttemptProblems: (r1.firstAttemptProblems || []).concat(r2.firstAttemptProblems || []), step1FromCheckpoint: !!r1.fromCheckpoint };
      });
    }).then(function(r){
      var used = {};
      ["sharedThemes","differentEmphases","integratedView"].forEach(function(k){ (r.out[k].evidence || []).forEach(function(e){ (e.vedicClaimIds || []).forEach(function(c){ used[c] = sup.vedicStatus[c]; }); }); });
      var rec = {
        sharedThemes: r.out.sharedThemes, differentEmphases: r.out.differentEmphases, integratedView: r.out.integratedView,
        runId: pairCtx.pair.runId, fingerprint: pairCtx.pair.fingerprint, engineVersions: pairCtx.pair.engineVersions,
        promptVersion: PROMPT_VERSION, step1Version: STEP1_VERSION, selectionVersion: man.selectionVersion, taxonomyVersion: man.taxonomyVersion, westernClaimSystem: WESTERN_CLAIM_SYSTEM,
        developmentOnly: true, productionEligible: false, approved: false,
        tropicalEvidenceStatus: "unreviewed_model_interpretation",
        vedicEvidenceStatus: used,
        generatedAt: new Date().toISOString(), attempts: r.attempts, requestsSent: job.sent, step1FromCheckpoint: r.step1FromCheckpoint, step2Version: STEP2_VERSION,
        firstAttemptProblems: r.firstAttemptProblems || [],
        trace: { model: model, validation: r.validation, comparableThemes: sup.comparable, systemPrompt: SYSTEM, userMessage: user, rawResponse: r.raw }
      };
      /* CR3.1: the step 1 checkpoint is KEPT after success, so a later STEP2_VERSION change
         reuses it. It stops matching on its own when the run, fingerprint, engines,
         selection, taxonomy or STEP1_VERSION change. */
      try { localStorage.setItem(key, JSON.stringify(rec)); } catch(e){}
      return rec;
    });
    inPageKey = key;
    inPage.then(function(){ clearInterval(hb); clearMarker(); status("complete"); inPage = null; inPageKey = null; },
                function(e){ clearInterval(hb); clearMarker();
                             status("failed", { error: { kind: (e && e.kind) || "error", status: (e && e.status) || 0, message: (e && e.message) || "DEV: failed" } });
                             inPage = null; inPageKey = null; });
    return inPage;
  }

  window.COZ_COMBINED_GEN = { PROMPT_VERSION: PROMPT_VERSION, STEP1_VERSION: STEP1_VERSION, STEP2_VERSION: STEP2_VERSION, step1KeyFor: step1KeyFor, MAX_REQUESTS: MAX_REQUESTS, getCombined: getCombined, peek: peek, peekStep1: peekStep1,
    inFlight: inFlight, markerOwner: markerOwner, waitForLive: waitForLive, readPhase: readPhase, keyFor: cacheKey,
    _system: SYSTEM, _validate: validate, _supplied: supplied, _userMessage: userMessage, _stage2: stage2Message, _repairList: repairList };

})();
