/* ==================================================================
   EMERGE_SOUND — Final Sound System V4 engine (e27, continuous opening)
   ------------------------------------------------------------------
   Sonic law (locked): low-register, physical, dark, restrained, dry,
   spatial. No pitch sweeps. Movement expressed via gain / density /
   stereo only. Relative WAV levels are preserved — every cue plays
   at gain 1.0; the master limiter exists strictly to guard against
   stacking, never to reshape a single cue.
   e27: the Earth-arrival cue (07) is retired — the wav is no longer
   in the master, so it is out of FILES and DUCKS and its call site in
   Scene 1 is a silent no-op (play() drops any cue with no buffer).
   No other cue changed; AUDIO_VER stays 18.
   e26: cue lift 2 — construction (14) and sweep (15) raised again to
   +3 dB over the originals (double the e25 step) under 14_d / 15c.
   e25: cue lift — seven one-shot/bed cues raised +1.5 dB (~15%) per
   Jason under NEW filenames (14_c, 15b, 16_c, 17b, 19b, 20b, 23b) so
   no cached copy can play: construction, sweep, tokens, impact, choice
   bed, ascension, tap boom. Relative-levels law otherwise intact.
   e24: living page — the index no longer navigates away at the card
   click; it starts the void on its own (already unlocked) context and
   displays the chosen reveal file in a fullscreen iframe. A one-line
   shim in the reveal files adopts the parent's engine, so every reveal
   cue plays on audio that has been alive since the card tap: sound from
   the reveal's very first frame, unbroken until REVEAL MY CHART, on
   iPhone too. Direct visits to a reveal URL still build their own
   engine and obey the first-touch rule.
   e23: startLoop accepts a level — the ambient field returns a step
   louder (1.4) at REVEAL MY CHART so the reading music is clearly
   audible. The index no longer whispers or carries the void; each
   reveal page owns its whole opening (whisper -> tap to reveal ->
   drawing) so there is nothing left for the page turn to chop.
   e21: the void is the JOURNEY bed on the reveal pages — from the
   page's first touch through the whole chart drawing, ending only at
   REVEAL MY CHART, where the ambient field takes over for good.
   Void at 01c (-11.9 peak, more in the background). Location-found
   cue (09) removed — its call sites are silent no-ops.
   e19: the ambient field is the one bed everywhere else; retired cue
   names remain as silent no-ops so no call site ever throws.
   e18: continuous ambient field (UNCLE_JOHN_FIELD_LOOP, seamless 43.5s,
   peak -14.1) auto-starts with audio on every page, loops under all cues,
   survives scene handoffs; everything else plays over it.
   e17: 01/03/12 restored to their approved final levels under NEW
   filenames (01b / 03d / 12b) so no cached or stale same-name copy
   can ever play again; digit beep at its approved final level; the
   retired motion-bend cue fully removed (motion() kept as a no-op).
   iOS: the context is born inside the first user gesture. Any cue
   fired while the context is locked or a buffer is still decoding
   is dropped silently (loops are remembered and started when ready).
   ================================================================== */
(function(){
  'use strict';
  if (window.EMERGE_SOUND) return;   /* e24: inside the living-page iframe the parent's engine is already installed by the shim — never build a second (locked) one */

  var FILES = {
    ambient:      '/Demo/UNCLE_JOHN_FIELD_LOOP.wav',  /* continuous quiet field under everything */
    voidatm:      '/Demo/01c_void_atmosphere.wav',     /* the journey bed — reveal-page first touch through the chart drawing */
    fold:         '/Demo/03d_vacuum_fold.wav',
    tap:          '/Demo/23b_tap_boom.wav',    /* single boom — the tap is one soft pulse */
    growth:       '/Demo/06_earth_growth_no_rising_tone.wav',
    orbit:        '/Demo/08_earth_rotation_silent_orbit_FINAL.wav',
    harmony:      '/Demo/11_birth_data_complete_fixed_harmony.wav',
    calc:         '/Demo/12b_calculation.wav',
    construction: '/Demo/14_d_magnetic_construction.wav',
    sweep:        '/Demo/15c_fast_screen_sweep.wav',
    tokens:       '/Demo/16_c_unified_planet_tokens.wav',
    impact:       '/Demo/17b_final_reveal_clean_impact.wav',
    hum:          '/Demo/18_reading_hum_plus_20.wav',
    choice:       '/Demo/19b_two_perspectives.wav',
    ascension:    '/Demo/20b_ascension_final.wav'
  };
  var IS_LOOP = { ambient:1, voidatm:1, orbit:1, calc:1, hum:1, choice:1 };
  /* one-shots that briefly duck the void bed so they read clearly */
  var DUCKS   = { harmony:1, impact:1, fold:1, ascension:1 };

  var AUDIO_VER = '18';
  var ENGINE_VER = '27';   /* bump on ANY wav content change — defeats stale wav caching */
  var ctx = null, master = null, limiter = null;
  var buffers = {}, loading = {}, loops = {}, wantLoop = {};
  var fired = {};                   /* timeline cues fired once per page */
  var voidGain = null;              /* remembered for ducking */

  function ready(){ return ctx && ctx.state === 'running'; }

  function buildGraph(){
    master = ctx.createGain();
    master.gain.value = 1.0;
    limiter = ctx.createDynamicsCompressor();       /* stacking guard only */
    limiter.threshold.value = -6;
    limiter.knee.value = 4;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.25;
    master.connect(limiter);
    limiter.connect(ctx.destination);
  }

  function load(name){
    if (buffers[name] || loading[name]) return;
    loading[name] = true;
    fetch(FILES[name] + '?a=' + AUDIO_VER)
      .then(function(r){ if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then(function(ab){ return ctx.decodeAudioData(ab); })
      .then(function(buf){
        buffers[name] = buf; loading[name] = false;
        if (wantLoop[name]) { var lvl = wantLoop[name]; wantLoop[name] = false;
          startLoop(name, (typeof lvl === 'number') ? lvl : 1.0); }
      })
      .catch(function(e){ loading[name] = false;
        try { console.log('[SOUND] load failed:', name, e && e.message); } catch(_){} });
  }

  function unlock(){
    try {
      if (!ctx){
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ctx = new AC();
        buildGraph();
        for (var k in FILES) load(k);            /* warm every cue */
      }
      if (ctx.state === 'suspended') ctx.resume();
      if (!window.EMERGE_HOLD_AMBIENT) startLoop('ambient');   /* the field plays continuously; reveal pages hold it until REVEAL MY CHART */
    } catch(_){}
  }

  function makeSource(name, pan){
    var src = ctx.createBufferSource();
    src.buffer = buffers[name];
    var g = ctx.createGain();
    g.gain.value = 1.0;                          /* relative WAV levels preserved */
    src.connect(g);
    if (typeof pan === 'number' && ctx.createStereoPanner){
      var p = ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan));
      g.connect(p); p.connect(master);
    } else g.connect(master);
    return { src: src, gain: g };
  }

  function duckVoid(){
    if (!voidGain) return;
    var t = ctx.currentTime;
    try {
      voidGain.gain.cancelScheduledValues(t);
      voidGain.gain.setValueAtTime(voidGain.gain.value, t);
      voidGain.gain.linearRampToValueAtTime(0.35, t + 0.12);
      voidGain.gain.linearRampToValueAtTime(1.0,  t + 1.8);
    } catch(_){}
  }

  /* digit-entry tone: generated, not sampled — one fixed clock-set beep,
     identical pitch and level on every press (approved final level) */
  function beep(){
    if (!ready()) return;
    var t = ctx.currentTime;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0, t);
    g.gain.linearRampToValueAtTime(0.085, t + 0.002);
    g.gain.setValueAtTime(0.085, t + 0.018);
    g.gain.exponentialRampToValueAtTime(0.0005, t + 0.085);
    g.connect(master);
    var o1 = ctx.createOscillator(); o1.type = 'sine'; o1.frequency.value = 620;
    var o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = 1240;
    var g2 = ctx.createGain(); g2.gain.value = 0.18;
    o1.connect(g); o2.connect(g2); g2.connect(g);
    o1.start(t); o2.start(t); o1.stop(t + 0.1); o2.stop(t + 0.1);
  }

  /* one soft low beat per house number as it lands on the wheel */
  function numpulse(){
    if (!ready()) return;
    var t = ctx.currentTime;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0, t);
    g.gain.linearRampToValueAtTime(0.16, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0005, t + 0.28);
    g.connect(master);
    [[85,1.0],[170,0.6],[255,0.25]].forEach(function(p){
      var o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = p[0];
      var og = ctx.createGain(); og.gain.value = p[1];
      o.connect(og); og.connect(g); o.start(t); o.stop(t + 0.3);
    });
  }

  function play(name, opts){
    if (name === 'pulse') return beep();
    if (!ready() || !buffers[name]) return;      /* locked or not decoded: drop */
    opts = opts || {};
    var n = makeSource(name, opts.pan);
    if (DUCKS[name]) duckVoid();
    try { n.src.start(0); } catch(_){}
  }

  /* short grain from a one-shot bank — digit pulses stay in the approved timbre */
  function grain(name){
    if (!ready() || !buffers[name]) return;
    var buf = buffers[name];
    var n = makeSource(name);
    var maxOff = Math.max(0, buf.duration - 0.25);
    var off = Math.random() * maxOff;
    var t = ctx.currentTime;
    try {
      n.gain.gain.setValueAtTime(0.0, t);
      n.gain.gain.linearRampToValueAtTime(1.0, t + 0.015);
      n.gain.gain.setValueAtTime(1.0, t + 0.13);
      n.gain.gain.linearRampToValueAtTime(0.0, t + 0.2);
      n.src.start(0, off, 0.22);
    } catch(_){}
  }

  /* level: optional target gain for this loop (default 1.0 preserves the
     relative-WAV-levels law; used by REVEAL MY CHART to bring the ambient
     field back a step louder for the reading) */
  function startLoop(name, level){
    if (name === 'drawbed') return;                        /* retired — the ambient field is the bed */
    if (loops[name]) return;
    var lvl = (typeof level === 'number') ? level : 1.0;
    if (!ready() || !buffers[name]) { wantLoop[name] = lvl; return; }
    var n = makeSource(name);
    n.src.loop = true;
    var t = ctx.currentTime;
    var fadeIn = (name === 'music' || name === 'drawbed' || name === 'ambient') ? 4.5 : 0.9;   /* beds drift in, not arrive */
    try {
      n.gain.gain.setValueAtTime(0.0, t);
      n.gain.gain.linearRampToValueAtTime(lvl, t + fadeIn);
      n.src.start(0);
    } catch(_){}
    loops[name] = n;
    if (name === 'voidatm') voidGain = n.gain;
  }

  function stopLoop(name, fade){
    wantLoop[name] = false;
    var n = loops[name];
    if (!n) return;
    loops[name] = null;
    if (name === 'voidatm') voidGain = null;
    var f = (typeof fade === 'number') ? fade : 1.0;
    try {
      var t = ctx.currentTime;
      n.gain.gain.cancelScheduledValues(t);
      n.gain.gain.setValueAtTime(n.gain.gain.value, t);
      n.gain.gain.linearRampToValueAtTime(0.0, t + f);
      n.src.stop(t + f + 0.05);
    } catch(_){}
  }

  /* gently raise (or settle) a running loop in place — the bed asserts itself */
  function swell(name, mult, secs){
    var n = loops[name];
    if (!n || !ctx) return;
    var m = (typeof mult === 'number') ? mult : 1.5;
    var s = (typeof secs === 'number') ? secs : 1.2;
    try {
      var t = ctx.currentTime;
      n.gain.gain.cancelScheduledValues(t);
      n.gain.gain.setValueAtTime(n.gain.gain.value, t);
      n.gain.gain.linearRampToValueAtTime(m, t + s);
    } catch(_){}
  }

  function stopAll(){
    for (var k in loops) if (loops[k] && k !== 'ambient') stopLoop(k, 0.35);
  }

  /* motion-bend cue retired — kept as a safe no-op so call sites never throw */
  function motion(){}

  /* event-driven sync to the real drawing timeline: each named cue fires
     exactly once when t crosses its threshold */
  function tick(map, t, pans){
    for (var key in map){
      if (!fired[key] && t >= map[key]){
        fired[key] = true;
        if (IS_LOOP[key]) startLoop(key);
        else play(key, pans && (key in pans) ? { pan: pans[key] } : undefined);
      }
    }
  }

  function haptic(ms){
    try { navigator.vibrate && navigator.vibrate(ms || 10); } catch(_){}
  }

  /* iOS grants audio on finger-UP (touchend/click), not finger-down.
     Arm every gesture type and keep retrying until the context runs. */
  (function armUnlock(){
    var evs = ['touchend', 'touchstart', 'click', 'pointerdown', 'pointerup', 'keydown'];
    function h(){
      try {
        unlock();
        if (ctx && ctx.state !== 'running') ctx.resume();
        if (ctx && ctx.state === 'running')
          evs.forEach(function(e){ window.removeEventListener(e, h, { capture:true } ); });
      } catch(_){}
    }
    evs.forEach(function(e){ window.addEventListener(e, h, { capture:true, passive:false }); });
  })();

  function status(){
    return 'snd e' + ENGINE_VER + ' ' + (ctx ? ctx.state : 'no-ctx');
  }

  window.EMERGE_SOUND = {
    unlock: unlock, play: play, grain: grain,
    loop: startLoop, stopLoop: stopLoop, stopAll: stopAll, swell: swell,
    motion: motion, tick: tick, haptic: haptic, numpulse: numpulse, status: status
  };
})();
