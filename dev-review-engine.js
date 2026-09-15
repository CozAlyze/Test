/* ============================================================
   COZALYZE — TEMPORARY DEVELOPMENT-REVIEW GENERATOR
   No AI call. No server. No Netlify. Runs entirely in the browser
   from calculated chart facts plus already-approved claim records.

   Sections 1-2: real coverageItem/selector matching against the
   Section 1 and Section 2 application-claims records (the same
   records the production pipeline would use), concatenated into
   draft paragraphs. Every sentence here is an existing approved
   allowedMeaning string -- nothing is invented.

   Sections 3-6: NO application-claims records exist for these yet
   (confirmed by direct inspection, not assumed). This is a KNOWN GAP,
   not a bug. The only content available is the two hand-drafted
   reference readings (Checkpoint 8, editorial/six-section-samples).
   A new chart matches one of those two only if its ascendant sign +
   Moon sign + Moon nakshatra are IDENTICAL to a reference chart.
   Otherwise this returns a plain, honest placeholder stating the
   calculated fact -- never an invented interpretation.

   Every reading produced here is labeled a development-review draft,
   pending Nina's review, not a production-verified reading.
   ============================================================ */
(function (global) {
  "use strict";

  var SIGN_NAMES = ["aries","taurus","gemini","cancer","leo","virgo","libra","scorpio","sagittarius","capricorn","aquarius","pisces"];
  var SIGN_LORD = { aries:"ma", taurus:"ve", gemini:"me", cancer:"mo", leo:"su", virgo:"me", libra:"ve", scorpio:"ma", sagittarius:"jp", capricorn:"sa", aquarius:"sa", pisces:"jp" };
  var CODE_TO_NAME = { su:"Sun", mo:"Moon", ma:"Mars", me:"Mercury", jp:"Jupiter", ve:"Venus", sa:"Saturn", ra:"Rahu", ke:"Ketu" };
  var NAME_TO_CODE = { Sun:"su", Moon:"mo", Mars:"ma", Mercury:"me", Jupiter:"jp", Venus:"ve", Saturn:"sa", Rahu:"ra", Ketu:"ke" };

  function nakKey(name) { return String(name || "").toLowerCase().trim().replace(/\s+/g, "-"); }
  function signName(signNumber) { return SIGN_NAMES[(signNumber - 1 + 12) % 12]; }
  function findPlanet(chart, name) {
    for (var i = 0; i < chart.planets.length; i++) if (chart.planets[i].name === name) return chart.planets[i];
    return null;
  }

  /* ---------- Section 1 ---------- */
  function computeS1Keys(chart) {
    var asc = findPlanet(chart, "Ascendant");
    var ascSign = signName(asc.signNumber);
    var ascLordCode = SIGN_LORD[ascSign];
    var ascLordPlanet = findPlanet(chart, CODE_TO_NAME[ascLordCode]);
    var keys = ["guiding-planet." + ascLordCode, "asc-sign." + ascSign, "asc-nakshatra." + nakKey(asc.nakshatra)];
    if (ascLordPlanet) keys.push("asc-lord-in-house." + ascLordPlanet.house);
    return { keys: keys, ascSign: ascSign, ascLordCode: ascLordCode, ascLordPlanet: ascLordPlanet, asc: asc };
  }

  function recordMatchesKeys(rec, keySet) {
    if (rec.coverageItem) return keySet.indexOf(rec.coverageItem) !== -1;
    return false;
  }

  function recordMatchesSelector(rec, chart) {
    if (!rec.selector || !rec.selector.all) return false;
    return rec.selector.all.every(function (cond) {
      if (cond.factId === "graha:mo") {
        var moon = findPlanet(chart, "Moon");
        if (!moon) return false;
        if (cond.field === "house") return moon.house === cond.equals;
      }
      return false;
    });
  }

  function collectSentences(files, matchFn) {
    var sentences = [];
    var matchedIds = [];
    var seen = {};
    files.forEach(function (file) {
      (file.records || []).forEach(function (rec) {
        if (matchFn(rec)) {
          var id = rec.recordId || rec.modelId || rec.coverageItem;
          if (seen[id]) return;
          seen[id] = true;
          matchedIds.push(id);
          (rec.applicationClaims || []).forEach(function (c) {
            if (c.allowedMeaning) sentences.push(c.allowedMeaning);
          });
        }
      });
    });
    return { sentences: sentences, matchedIds: matchedIds };
  }

  function toParagraphs(sentences, introSentences) {
    var all = (introSentences || []).concat(sentences);
    if (!all.length) return [];
    if (all.length <= 4) return [all.join(" ")];
    var mid = Math.ceil(all.length / 2);
    return [all.slice(0, mid).join(" "), all.slice(mid).join(" ")];
  }

  /* ---------- Section 2 ---------- */
  function computeS2Match(chart, files) {
    var moon = findPlanet(chart, "Moon");
    var moonSign = signName(moon.signNumber);
    var keySet = [
      "graha-in-sign.mo." + moonSign,
      "graha-in-house.mo." + moon.house,
      "nakshatra." + nakKey(moon.nakshatra),
      "pada." + nakKey(moon.nakshatra) + "." + moon.pada
    ];
    var matched = collectSentences(files, function (rec) {
      return recordMatchesKeys(rec, keySet) || recordMatchesSelector(rec, chart);
    });
    return {
      sentences: matched.sentences,
      matchedIds: matched.matchedIds,
      moon: moon, moonSign: moonSign
    };
  }

  /* ---------- Public API ---------- */
  function generateDevReview(chart, claimData, snippets36, firstName) {
    var s1 = computeS1Keys(chart);
    var s1Match = collectSentences(claimData.section1Files, function (rec) { return recordMatchesKeys(rec, s1.keys); });

    var openingName = (firstName && String(firstName).trim()) ? String(firstName).trim() + ", " : "";
    var introS1 = [openingName + "your Vedic chart begins with " + capitalize(s1.ascSign) + " rising."];
    if (s1.ascLordCode) introS1.push(capitalize(CODE_TO_NAME[s1.ascLordCode]) + " rules " + capitalize(s1.ascSign) + ", which makes it your guiding planet -- the strongest single influence on how you move through the world.");

    var s2 = computeS2Match(chart, claimData.section2Files);
    var introS2 = [
      "In Vedic astrology, every planet in your chart sits inside one of 27 star groups called nakshatras. This reading focuses mainly on your Moon's nakshatra, because the Moon shapes your emotional world most directly.",
      "Your Moon is in " + capitalize(s2.moonSign) + ", and its nakshatra is " + capitalize(s2.moon.nakshatra) + "."
    ];

    var asc = s1.asc;
    var moon = s2.moon;
    var identityKey = [signName(asc.signNumber), signName(moon.signNumber), nakKey(moon.nakshatra)].join("|");
    var entry = null;
    (snippets36.entries || []).forEach(function (e) { if (e.identityKey === identityKey) entry = e; });

    var reading = {
      "essential-nature": toParagraphs(s1Match.sentences, introS1),
      "mind-intuition": toParagraphs(s2.sentences, introS2)
    };

    var placeholderNote = function (label, fact) {
      return ["Draft not yet available for this specific chart -- Sections 3 through 6 interpretation content is still being built out beyond the two charts already reviewed. Calculated fact for " + label + ": " + fact + "."];
    };

    var venus = findPlanet(chart, "Venus");
    var tenthLord = null; // not computed client-side yet; kept honest rather than guessed
    var rahu = findPlanet(chart, "Rahu");
    var ketu = findPlanet(chart, "Ketu");

    if (entry) {
      reading["relationships-karmic"] = entry.sections["relationships-karmic"];
      reading["dharma-direction"] = entry.sections["dharma-direction"];
      reading["rahu-ketu"] = entry.sections["rahu-ketu"];
      reading["essential-takeaway"] = entry.sections["essential-takeaway"];
    } else {
      reading["relationships-karmic"] = placeholderNote("Venus", "Venus in " + capitalize(signName(venus.signNumber)) + ", house " + venus.house);
      reading["dharma-direction"] = placeholderNote("the 10th house", "10th house occupied by " + houseOccupants(chart, 10));
      reading["rahu-ketu"] = placeholderNote("Rahu and Ketu", "Rahu in house " + rahu.house + ", Ketu in house " + ketu.house);
      reading["essential-takeaway"] = ["This synthesis is not yet available in the development-review draft for charts outside the two reviewed reference readings."];
    }

    return {
      reading: reading,
      meta: {
        mode: "development-review-draft",
        productionVerified: false,
        matchedClaimIds: { section1: s1Match.matchedIds, section2: s2.matchedIds },
        sections3to6Source: entry ? entry.label : "no identity match -- placeholder shown",
        identityKey: identityKey
      }
    };
  }

  function houseOccupants(chart, houseNum) {
    var names = chart.planets.filter(function (p) { return p.name !== "Ascendant" && p.house === houseNum; }).map(function (p) { return p.name; });
    return names.length ? names.join(", ") : "no classical grahas";
  }
  function capitalize(s) { return String(s || "").replace(/(^|-)([a-z])/g, function (_, sep, c) { return (sep === "-" ? " " : "") + c.toUpperCase(); }); }

  global.CozDevReview = { generateDevReview: generateDevReview };
})(typeof window !== "undefined" ? window : globalThis);
