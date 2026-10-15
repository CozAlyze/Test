/* ============================================================
   COZALYZE · COZ_GRAHA · shared graha glyph + life-cycle data module
   Used by current-life-cycle.html and current-season.html.

   Why this file exists: the repository carries no graha symbol assets of
   any kind. vedic-birth-chart.html renders bodies as two-letter
   abbreviations (Ke, Ve) and no SVG, PNG or glyph font for the nine
   grahas appears anywhere. Rather than add nine image files, every lord
   is drawn here once as inline SVG geometry using currentColor, so the
   copper tone comes from CSS and one component serves all nine.

   Nothing in this file is chart-specific. It reads whatever chart is in
   localStorage and exposes it; it never assumes a lord or a date.
   ============================================================ */
(function (global) {
  'use strict';

  var LORDS = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];

  /* Standard astronomical symbols. These replace the hand-drawn paths used in
     the first build, where the Jupiter form was wrong. Unicode carries the
     correct, conventional shape for every graha, and Rahu and Ketu use the
     ascending and descending node signs. If the master's own graha artwork is
     preferred, swap GLYPH for image paths; nothing else needs to change. */
  var GLYPH = {
    Sun:     '\u2609',
    Moon:    '\u263D',
    Mars:    '\u2642',
    Mercury: '\u263F',
    Jupiter: '\u2643',
    Venus:   '\u2640',
    Saturn:  '\u2644',
    Rahu:    '\u260A',
    Ketu:    '\u260B'
  };

  /* Approved plain-language themes. Handoff table, verbatim, no additions. */
  var THEMES = {
    Ketu:    'detachment, closures, simplification, inward or spiritual focus',
    Venus:   'relationships, creativity, pleasure, values, harmony',
    Sun:     'visibility, authority, identity, self-definition',
    Moon:    'home, family, care, emotional security, belonging',
    Mars:    'action, assertion, courage, conflict, decisive effort',
    Rahu:    'new, foreign, unconventional, ambitious, unfamiliar territory',
    Jupiter: 'growth, wisdom, teaching, meaning, faith, expansion',
    Saturn:  'responsibility, limits, rebuilding, patience, mastery',
    Mercury: 'communication, learning, analysis, trade, practical work'
  };

  var SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
  var ORDINALS = ['','first','second','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth','eleventh','twelfth'];

  /* House themes, used only to name the life area a verified placement
     activates. Never used as a substitute for an actual placement. */
  var HOUSE_AREAS = {
    1:  'self, identity, body and the way you meet the world',
    2:  'resources, values, speech and what you gather around you',
    3:  'effort, courage, siblings, communication and nearby travel',
    4:  'home, family, emotional security, privacy and belonging',
    5:  'creativity, children, learning and what you enjoy expressing',
    6:  'work, service, routine, obstacles and the effort to resolve them',
    7:  'partnership, agreements and one-to-one relationship',
    8:  'obstacles, sudden change, hidden matters and what is held privately',
    9:  'meaning, belief, teachers, higher study and long journeys',
    10: 'work in the world, visibility, responsibility and direction',
    11: 'networks, gains, community and longer-range hopes',
    12: 'retreat, release, rest, inner life and what is set down'
  };

  function glyphSVG(lord, size, cls) {
    var g = GLYPH[lord];
    if (!g) return '';
    /* Rendered as text so the symbol keeps its designed proportions at any
       size and inherits colour from CSS, as the medallion expects. */
    return '<span class="' + (cls || 'coz-glyph') + '" role="img" aria-label="' + lord + '"' +
           (size ? ' style="font-size:' + size + '"' : '') + '>' + g + '</span>';
  }

  /* Medallion: the circular framed symbol from the approved artwork.
     One component, any lord, colour inherited from CSS. */
  function medallion(lord, size) {
    size = size || 74;
    /* Glyph set to roughly half the medallion so the symbol sits with the same
       optical weight at every size the pages use. */
    return '<span class="coz-medallion" style="width:' + size + 'px;height:' + size +
           'px;font-size:' + Math.round(size * 0.52) + 'px" data-lord="' + lord + '">' +
           glyphSVG(lord, '') + '</span>';
  }

  function readChart() {
    var raw = null;
    try { raw = localStorage.getItem('cozChartJSON'); } catch (e) { return null; }
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }

  /* Locate a body in the chart's planets array. Returns null when absent
     rather than guessing, so callers can fail closed. */
  function planet(chart, name) {
    if (!chart || !chart.planets) return null;
    for (var i = 0; i < chart.planets.length; i++) {
      if (chart.planets[i].name === name) return chart.planets[i];
    }
    return null;
  }

  function signName(n) { return (n >= 1 && n <= 12) ? SIGNS[n - 1] : null; }
  function ordinal(n) { return (n >= 1 && n <= 12) ? ORDINALS[n] : null; }

  /* Every graha sharing a house with the given body, excluding the
     Ascendant and the body itself. Verified co-presence only. */
  function coTenants(chart, name) {
    var p = planet(chart, name), out = [];
    if (!p || !chart.planets) return out;
    for (var i = 0; i < chart.planets.length; i++) {
      var q = chart.planets[i];
      if (q.name === name || q.name === 'Ascendant') continue;
      if (q.house === p.house) out.push(q.name);
    }
    return out;
  }

  global.COZ_GRAHA = {
    LORDS: LORDS, THEMES: THEMES, HOUSE_AREAS: HOUSE_AREAS,
    glyphSVG: glyphSVG, medallion: medallion,
    readChart: readChart, planet: planet, coTenants: coTenants,
    signName: signName, ordinal: ordinal
  };
})(window);
