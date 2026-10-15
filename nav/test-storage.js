/* COZ TEST STORAGE · NAV TEST N2.0 (Oct 15 2026; N1.1 r2's guard, hardened after the N2 isolation review)
   CozAlyze/Test/nav only, never the Demo.
   The build pastes this file, unchanged, as the first script inside every page in this folder except
   test-setup.html, so it cannot fail to load (a missing or late separate file would let a page run on the
   Demo's own storage). This copy is the readable source; no page loads it as a separate file.
   The Test and the Demo are on the same site (cozalyze.github.io), so they share the phone's storage.
   This keeps the test pages away from the Demo's data and from the reading servers.

   1. STORAGE. Every localStorage and sessionStorage read and write made on a test page, including by
      the scripts these pages load, goes to keys that start with "cozTEST:". A test page never sees or
      changes a Demo key (saved charts, the current chart, readings, the tester password). The build
      refuses any page or script that uses storage any other way (property-style access, another
      window's or frame's storage, IndexedDB, cookies, workers) and every script is a pinned copy in
      this folder. Storage events from Demo writes (another tab) never reach the test pages.
   2. ROOM FOR THE DEMO. A test write that would take the site's stored data past about 4 MB is refused
      (QuotaExceededError, which the pages already handle as "not enough space"), so the test can never
      crowd the Demo out of the phone's storage.
   3. NETWORK. A test page may request files from this site and from the font and script hosts the pages
      already use. Anything else is refused before it is sent: the reading servers (*.netlify.app) and the
      model (api.anthropic.com) included. No reading can be started, continued or paid for from a test page.
      The build refuses any page or script that names another host.
   4. FRAMES AND WINDOWS. A frame or a new window may only open one of this folder's own pages (PAGES
      below; a refused frame shows a blank page). Never a Demo page, the setup page, a missing page, or
      an inline (srcdoc) frame, any of which could run without this guard.
   5. FAIL CLOSED. If any part of this guard cannot be installed, the page stops before anything else runs
      and says so.

   Art, video, styles and data files load from the Demo folder on the same site (window.COZ_TEST_ASSETS).
   Anything refused is listed in window.__cozTestBlocked and the console. */
(function () {
  if (window.__cozTestStorage) return;
  window.__cozTestStorage = "N2.0";
  var P = "cozTEST:";
  /* this folder's own pages (the build checks this list against the pages it builds) */
  var PAGES = ["account.html", "saved-charts.html",
    "vedic-reading.html", "vedic-birth-chart.html", "saved-vedic-document.html", "current-life-cycle.html",
    "current-season.html", "key-time-windows.html", "what-comes-next.html",
    "tropical-reading.html", "tropical-birth-chart.html", "tropical-current-transits.html", "saved-tropical-document.html",
    "compare-reading.html", "combined-reading.html", "your-ascendants.html", "ascendant-reading.html",
    "compare-current-timing.html", "compare-current-timing-reading.html", "compare-birth-charts.html",
    "compare-system.html", "saved-compare-document.html",
    "tropical-reveal.html", "sidereal-reveal.html"];                   /* the two chart engines: hidden calculation frames only */
  try {
    /* ---------- 1. storage ---------- */
    var proto = Storage.prototype;
    var g = proto.getItem, s = proto.setItem, r = proto.removeItem, k = proto.key;
    var lenDesc = Object.getOwnPropertyDescriptor(proto, "length");
    var rawLen = function (st) { return lenDesc.get.call(st); };
    var testKeys = function (st) {
      var out = [], n = rawLen(st), i, key;
      for (i = 0; i < n; i++) { key = k.call(st, i); if (key && key.indexOf(P) === 0) out.push(key.slice(P.length)); }
      return out;
    };
    /* ---------- 2. room for the Demo (localStorage is shared with it; sessionStorage is per tab) ---------- */
    var CAP = 4.0 * 1048576;                                          /* estimated bytes, 2 per character */
    var LOCAL = null; try { LOCAL = window.localStorage; } catch (e) {}
    var usedBytes = function (st) {
      var n = rawLen(st), t = 0, i, key, v;
      for (i = 0; i < n; i++) { key = k.call(st, i); v = key == null ? null : g.call(st, key); t += ((key ? key.length : 0) + (v ? v.length : 0)) * 2; }
      return t;
    };
    proto.getItem = function (key) { return g.call(this, P + key); };
    proto.setItem = function (key, v) {
      var pk = P + key;
      if (this === LOCAL) {
        var old = g.call(this, pk), add = (pk.length + String(v).length) * 2 - (old != null ? (pk.length + old.length) * 2 : 0);
        if (add > 0 && usedBytes(this) + add > CAP) {
          try { console.warn("[COZ TEST] write refused: it would crowd the Demo's storage (" + key + ")"); } catch (e) {}
          throw new DOMException("The CozAlyze test keeps room free for the Demo.", "QuotaExceededError");
        }
      }
      return s.call(this, pk, v);
    };
    proto.removeItem = function (key) { return r.call(this, P + key); };
    proto.key = function (i) { var a = testKeys(this); i = Math.floor(Number(i)); return i >= 0 && i < a.length ? a[i] : null; };
    proto.clear = function () { var st = this; testKeys(st).forEach(function (key) { r.call(st, P + key); }); };
    Object.defineProperty(proto, "length", { configurable: true, enumerable: true, get: function () { return testKeys(this).length; } });
    /* a Demo page writing in another tab fires "storage" events here; they never reach the test pages */
    window.addEventListener("storage", function (ev) { if (!ev.key || ev.key.indexOf(P) !== 0) ev.stopImmediatePropagation(); }, true);

    /* ---------- 3. network ---------- */
    var blocked = window.__cozTestBlocked = [];
    var HOSTS = /^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|unpkg\.com)\//;
    var abs = function (u) { try { return new URL(String(u), location.href); } catch (e) { return null; } };
    var allowed = function (u) {
      var a = abs(u); if (!a) return false;
      if (a.protocol === "data:" || a.protocol === "blob:") return true;
      return a.origin === location.origin || HOSTS.test(a.href);
    };
    var refuse = function (u, via) {
      var a = abs(u), where = a ? a.origin + a.pathname : String(u);
      blocked.push({ via: via, url: where, at: new Date().toISOString() });
      try { console.warn("[COZ TEST] refused " + via + " to " + where + " (test pages never contact the reading servers or open a Demo page)"); } catch (e) {}
      return new TypeError("The CozAlyze test refused a request to " + where + ".");
    };
    if (window.fetch) {
      var nf = window.fetch;
      window.fetch = function (input, init) {
        var u = typeof input === "string" ? input : (input && input.url) || String(input);
        if (!allowed(u)) return Promise.reject(refuse(u, "fetch"));
        return nf.apply(this, arguments);
      };
    }
    if (window.XMLHttpRequest) {
      var xo = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function (m, u) { if (!allowed(u)) throw refuse(u, "xhr"); return xo.apply(this, arguments); };
    }
    if (window.EventSource) {
      var ES = window.EventSource;
      var ESW = function (u, o) { if (!allowed(u)) throw refuse(u, "eventsource"); return new ES(u, o); };
      ESW.prototype = ES.prototype; window.EventSource = ESW;
    }
    if (window.WebSocket) {
      var WS = window.WebSocket;
      var WSW = function (u) { throw refuse(u, "websocket"); };
      WSW.prototype = WS.prototype; window.WebSocket = WSW;
    }
    if (navigator.sendBeacon) {
      var sb = navigator.sendBeacon.bind(navigator);
      navigator.sendBeacon = function (u, d) { if (!allowed(u)) { refuse(u, "beacon"); return false; } return sb(u, d); };
    }

    /* ---------- 4. frames and windows: this folder's own pages only ---------- */
    var DIR = location.pathname.replace(/[^\/]*$/, "");              /* this test folder, /Test/nav/ */
    var pageOK = function (u) {
      var a = abs(u); if (!a || a.origin !== location.origin || a.pathname.indexOf(DIR) !== 0) return false;
      return PAGES.indexOf(a.pathname.slice(DIR.length)) >= 0;
    };
    var frameOK = function (u) { var a = abs(u); return !!a && (a.href === "about:blank" || pageOK(u)); };
    var fd = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, "src");
    Object.defineProperty(HTMLIFrameElement.prototype, "src", { configurable: true, enumerable: fd.enumerable, get: fd.get,
      set: function (v) { if (!frameOK(v)) { refuse(v, "frame"); v = "about:blank"; } fd.set.call(this, v); } });
    var sd = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, "srcdoc");
    if (sd) Object.defineProperty(HTMLIFrameElement.prototype, "srcdoc", { configurable: true, enumerable: sd.enumerable, get: sd.get,
      set: function () { refuse("about:srcdoc", "frame"); } });
    var sa = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function (n, v) {
      if (this instanceof HTMLIFrameElement) {
        var name = String(n).toLowerCase();
        if (name === "srcdoc") { refuse("about:srcdoc", "frame"); return; }
        if (name === "src" && !frameOK(v)) { refuse(v, "frame"); v = "about:blank"; }
      }
      return sa.call(this, n, v);
    };
    var wo = window.open;
    window.open = function (u) {
      if (u == null || String(u).trim() === "" || !pageOK(u)) { refuse(u == null ? "about:blank" : u, "window"); return null; }
      return wo.apply(window, arguments);
    };

    window.COZ_TEST_ASSETS = "/Demo/";
    try { console.log("[COZ TEST] storage isolated under " + P + "; reading servers and the model are refused"); } catch (e) {}
  } catch (err) {
    /* ---------- 5. fail closed: no storage, no requests, and the page stops here ---------- */
    try { console.error("[COZ TEST] the test guard could not start, so this page stopped: " + (err && err.message)); } catch (e) {}
    try { ["getItem", "setItem", "removeItem", "key", "clear"].forEach(function (m) { Storage.prototype[m] = function () { throw new Error("The CozAlyze test page stopped."); }; }); } catch (e) {}
    try { window.fetch = function () { return Promise.reject(new TypeError("The CozAlyze test page stopped.")); }; } catch (e) {}
    try { XMLHttpRequest.prototype.open = function () { throw new TypeError("The CozAlyze test page stopped."); }; } catch (e) {}
    try { window.open = function () { return null; }; } catch (e) {}
    try { window.stop(); } catch (e) {}
    try { document.documentElement.innerHTML = '<body style="margin:0;padding:48px 24px;background:#02040c;color:#EEE7D8;font:16px/1.5 -apple-system,Helvetica,Arial,sans-serif">This test page stopped because its safety check couldn’t start. Nothing was changed.</body>'; } catch (e) {}
    throw err;
  }
})();
