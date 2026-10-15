/* COZ TEST STORAGE · NAV TEST N1.1 r2 (Oct 14 2026) · CozAlyze/Test/tropical-nav only, never the Demo
   The build pastes this file, unchanged, as the first script inside every page in this folder except
   test-setup.html, so it cannot fail to load (a missing or late separate file would let a page run on the
   Demo's own storage). This copy is the readable source; no page loads it as a separate file.
   The Test and the Demo are on the same site (cozalyze.github.io), so they share the phone's storage.
   This keeps the test pages away from the Demo's data and from the reading servers.

   1. STORAGE. Every localStorage and sessionStorage read and write made on a test page, including by
      the scripts these pages load, goes to keys that start with "cozTEST:". A test page never sees or
      changes a Demo key (saved charts, the current chart, readings, the tester password). Those scripts
      use getItem / setItem / removeItem / key / length / clear only; no property-style access (checked
      when this test was built; the three engine scripts are pinned copies in this folder).
   2. ROOM FOR THE DEMO. A test write that would take the site's stored data past about 4 MB is refused
      (QuotaExceededError, which the pages already handle as "not enough space"), so the test can never
      crowd the Demo out of the phone's storage.
   3. NETWORK. A test page may request files from this site and from the font and script hosts the pages
      already use. Anything else is refused before it is sent: the reading servers (*.netlify.app) and the
      model (api.anthropic.com) included. No reading can be started, continued or paid for from a test page.
   4. FRAMES AND WINDOWS. A frame may only open a page from this test folder (or a blank page); a new
      window only a page from this test folder. Never a Demo page, which would use the Demo's own storage.

   Art and video load from the Demo folder on the same site (window.COZ_TEST_ASSETS).
   Anything refused is listed in window.__cozTestBlocked and the console. */
(function () {
  if (window.__cozTestStorage) return;
  window.__cozTestStorage = "N1.1";
  var P = "cozTEST:";

  /* ---------- 1. storage ---------- */
  var proto = Storage.prototype;
  var g = proto.getItem, s = proto.setItem, r = proto.removeItem, k = proto.key;
  var lenDesc = Object.getOwnPropertyDescriptor(proto, "length");
  function rawLen(st) { return lenDesc.get.call(st); }
  function testKeys(st) {
    var out = [], n = rawLen(st), i, key;
    for (i = 0; i < n; i++) { key = k.call(st, i); if (key && key.indexOf(P) === 0) out.push(key.slice(P.length)); }
    return out;
  }
  /* ---------- 2. room for the Demo (localStorage is shared with it; sessionStorage is per tab) ---------- */
  var CAP = 4.0 * 1048576;                                          /* estimated bytes, 2 per character */
  var LOCAL = null; try { LOCAL = window.localStorage; } catch (e) {}
  function usedBytes(st) {
    var n = rawLen(st), t = 0, i, key, v;
    for (i = 0; i < n; i++) { key = k.call(st, i); v = key == null ? null : g.call(st, key); t += ((key ? key.length : 0) + (v ? v.length : 0)) * 2; }
    return t;
  }
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

  /* ---------- 3. network ---------- */
  var blocked = window.__cozTestBlocked = [];
  var HOSTS = /^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|unpkg\.com)\//;
  function abs(u) { try { return new URL(String(u), location.href); } catch (e) { return null; } }
  function allowed(u) {
    var a = abs(u); if (!a) return false;
    if (a.protocol === "data:" || a.protocol === "blob:") return true;
    return a.origin === location.origin || HOSTS.test(a.href);
  }
  function refuse(u, via) {
    var a = abs(u), where = a ? a.origin + a.pathname : String(u);
    blocked.push({ via: via, url: where, at: new Date().toISOString() });
    try { console.warn("[COZ TEST] refused " + via + " to " + where + " (test pages never contact the reading servers)"); } catch (e) {}
    return new TypeError("The CozAlyze test refused a request to " + where + ".");
  }
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

  /* ---------- 4. frames and windows ---------- */
  var DIR = location.pathname.replace(/[^\/]*$/, "");              /* this test folder, e.g. /Test/tropical-nav/ */
  function inFolder(u) { var a = abs(u); return !!a && a.origin === location.origin && a.pathname.indexOf(DIR) === 0; }
  function frameOK(u) { var a = abs(u); return !!a && (a.href === "about:blank" || inFolder(u)); }
  var fd = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, "src");
  if (fd && fd.set) {
    Object.defineProperty(HTMLIFrameElement.prototype, "src", { configurable: true, enumerable: fd.enumerable, get: fd.get,
      set: function (v) { if (!frameOK(v)) { refuse(v, "frame"); v = "about:blank"; } fd.set.call(this, v); } });
  }
  var sa = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function (n, v) {
    if (this instanceof HTMLIFrameElement && String(n).toLowerCase() === "src" && !frameOK(v)) { refuse(v, "frame"); v = "about:blank"; }
    return sa.call(this, n, v);
  };
  var wo = window.open;
  window.open = function (u) { if (!inFolder(u == null ? "" : u) || String(u) === "") { refuse(u, "window"); return null; } return wo.apply(window, arguments); };

  window.COZ_TEST_ASSETS = "/Demo/";
  try { console.log("[COZ TEST] storage isolated under " + P + "; reading servers and the model are refused"); } catch (e) {}
})();
