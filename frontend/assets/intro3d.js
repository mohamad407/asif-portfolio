/* Cinematic 3D world for the narrated intro.
 * One WebGL scene per intro scene: galaxy vortex, layered stack, neural network,
 * rising data towers and a portal tunnel. The camera flies between them on every scene change.
 * Public API: IV3D.start(), IV3D.stop(), IV3D.scene(i) */
(function () {
  var T = window.THREE, noop = function () {};
  window.IV3D = { start: noop, stop: noop, scene: noop };
  var wrap = document.getElementById('ivWrap');
  if (!T || !wrap || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var mobile = innerWidth < 768;
  var GOLD = 0xe6cf9f, GOLD2 = 0xc9a96e, IVORY = 0xfbf7ee, VIOLET = 0x8f7bff;
  var canvas, R, scene, cam, groups = [], dust, cur = 0, running = false, raf = 0, last = 0, clock = 0;
  var mx = 0, my = 0, kick = 0, look = new T.Vector3(), lookT = new T.Vector3(), camT = new T.Vector3();
  var ADD = T.AdditiveBlending, tex;

  function dot() {
    if (tex) return tex;
    var c = document.createElement('canvas'); c.width = c.height = 64;
    var x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, '#fff'); g.addColorStop(.3, 'rgba(255,255,255,.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    return (tex = new T.CanvasTexture(c));
  }
  function tm(m) { m.userData.o = m.opacity; return m; }
  function basic(c, o) { return tm(new T.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: ADD, depthWrite: false })); }
  function lineM(c, o) { return tm(new T.LineBasicMaterial({ color: c, transparent: true, opacity: o, blending: ADD, depthWrite: false })); }
  function points(pos, colors, size, o) {
    var g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3));
    var vc = colors && colors.length;
    if (vc) g.setAttribute('color', new T.BufferAttribute(colors, 3));
    var m = tm(new T.PointsMaterial({ map: dot(), size: size, transparent: true, opacity: o, depthWrite: false, blending: ADD, vertexColors: !!vc, color: vc ? 0xffffff : (colors || GOLD) }));
    return new T.Points(g, m);
  }
  function sprite(c, s, o) {
    var m = tm(new T.SpriteMaterial({ map: dot(), color: c, transparent: true, opacity: o, blending: ADD, depthWrite: false }));
    var sp = new T.Sprite(m); sp.scale.set(s, s, 1); return sp;
  }
  function reg(g, mats, tick, enter) { groups.push({ g: g, mats: mats, tick: tick || noop, enter: enter || noop, vis: 0, tgt: 0 }); g.visible = false; scene.add(g); }
  var ease = function (x) { x = Math.min(1, Math.max(0, x)); var c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };

  /* 0 · galaxy vortex with gyroscope rings */
  function buildGalaxy() {
    var g = new T.Group(), N = mobile ? 1300 : 2800, p = new Float32Array(N * 3), c = new Float32Array(N * 3), col = new T.Color(), pal = [IVORY, GOLD, GOLD2, VIOLET];
    for (var i = 0; i < N; i++) {
      var r = .4 + Math.pow(Math.random(), .75) * 7.4, a = r * 1.25 + (i % 3) * 2.094 + (Math.random() - .5) * .55, h = (Math.random() - .5) * .55 * (1 - r / 9);
      p[i * 3] = Math.cos(a) * r; p[i * 3 + 1] = h; p[i * 3 + 2] = Math.sin(a) * r;
      col.setHex(pal[Math.random() < .1 ? 3 : (Math.random() * 3 | 0)]).multiplyScalar(.5 + Math.random() * .5);
      c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b;
    }
    var P = points(p, c, .11, .95), mats = [P.material], rings = [];
    g.add(P);
    for (var k = 0; k < 3; k++) {
      var m = basic(GOLD, .6); mats.push(m);
      var rg = new T.Mesh(new T.TorusGeometry(1.5 + k * .6, .014, 8, 140), m); g.add(rg); rings.push(rg);
    }
    var core = sprite(GOLD, 4.2, .95); g.add(core); mats.push(core.material);
    reg(g, mats, function (t) {
      g.rotation.y = t * .12; g.rotation.x = .62; g.position.y = -.9;
      rings[0].rotation.set(t * .5 + 1.2, 0, 0); rings[1].rotation.set(0, t * .4, 1); rings[2].rotation.set(t * .3, 0, t * .35);
      core.scale.setScalar(4.2 + Math.sin(t * 2) * .35);
    });
  }

  /* 1 · layered full-stack slabs with orbiting cubes */
  function buildStack() {
    var g = new T.Group(), mats = [], slabs = [], geo = new T.BoxGeometry(4.2, .28, 4.2), eg = new T.EdgesGeometry(geo);
    [-1.5, 0, 1.5].forEach(function (y, k) {
      var s = new T.Group(), fm = basic(GOLD, .07), lm = lineM(k === 1 ? IVORY : GOLD, .9);
      s.add(new T.Mesh(geo, fm)); s.add(new T.LineSegments(eg, lm)); s.userData.y = y;
      mats.push(fm, lm); g.add(s); slabs.push(s);
    });
    var pos = new Float32Array(6); pos[1] = -2.4; pos[4] = 2.4;
    var spine = new T.Line(new T.BufferGeometry().setAttribute('position', new T.BufferAttribute(pos, 3)), lineM(GOLD, .5)); g.add(spine); mats.push(spine.material);
    var cubes = [], cg = new T.BoxGeometry(.32, .32, .32), ce = new T.EdgesGeometry(cg), cm = lineM(IVORY, .85); mats.push(cm);
    for (var i = 0; i < 12; i++) { var cb = new T.LineSegments(ce, cm); cb.userData = { a: Math.random() * 6.28, r: 3.3 + Math.random() * 1.6, y: (Math.random() - .5) * 4, s: .25 + Math.random() * .4 }; g.add(cb); cubes.push(cb); }
    reg(g, mats, function (t) {
      g.rotation.y = t * .18;
      slabs.forEach(function (s, k) { s.position.y = s.userData.y * (1 + .16 * Math.sin(t * 1.3)); s.rotation.y = (k - 1) * Math.sin(t * .6) * .35; });
      cubes.forEach(function (c) { var a = c.userData.a + t * c.userData.s; c.position.set(Math.cos(a) * c.userData.r, c.userData.y + Math.sin(t + c.userData.a) * .3, Math.sin(a) * c.userData.r); c.rotation.x = t * .9; c.rotation.y = t * .7; });
    });
  }

  /* 2 · neural network with travelling pulses */
  function buildNet() {
    var g = new T.Group(), mats = [], L = [3, 5, 6, 5, 3], nodes = [], edges = [];
    L.forEach(function (n, l) { var layer = []; for (var i = 0; i < n; i++) layer.push(new T.Vector3((l - 2) * 2.1, (i - (n - 1) / 2) * 1.0 + (Math.random() - .5) * .3, (Math.random() - .5) * 3)); nodes.push(layer); });
    var np = []; nodes.forEach(function (l) { l.forEach(function (v) { np.push(v.x, v.y, v.z); }); });
    var N = points(new Float32Array(np), IVORY, .4, 1); g.add(N); mats.push(N.material);
    var ep = [];
    for (var l = 0; l < L.length - 1; l++) nodes[l].forEach(function (a) { nodes[l + 1].forEach(function (b) { ep.push(a.x, a.y, a.z, b.x, b.y, b.z); edges.push([a, b]); }); });
    var E = new T.LineSegments(new T.BufferGeometry().setAttribute('position', new T.BufferAttribute(new Float32Array(ep), 3)), lineM(GOLD2, .3)); g.add(E); mats.push(E.material);
    var PN = 26, pp = new Float32Array(PN * 3), st = [];
    for (var i = 0; i < PN; i++) st.push({ e: Math.random() * edges.length | 0, t: Math.random(), v: .35 + Math.random() * .5 });
    var P = points(pp, GOLD, .34, 1); g.add(P); mats.push(P.material);
    reg(g, mats, function (t, dt) {
      var a = P.geometry.attributes.position.array;
      st.forEach(function (s, i) {
        s.t += dt * s.v; if (s.t > 1) { s.t = 0; s.e = Math.random() * edges.length | 0; }
        var ed = edges[s.e]; a[i * 3] = ed[0].x + (ed[1].x - ed[0].x) * s.t; a[i * 3 + 1] = ed[0].y + (ed[1].y - ed[0].y) * s.t; a[i * 3 + 2] = ed[0].z + (ed[1].z - ed[0].z) * s.t;
      });
      P.geometry.attributes.position.needsUpdate = true;
      g.rotation.y = Math.sin(t * .25) * .6 + mx * .5; g.rotation.x = my * .2;
    });
  }

  /* 3 · rising data towers */
  function buildTowers() {
    var g = new T.Group(), mats = [], bars = [], geo = new T.BoxGeometry(.5, 1, .5); geo.translate(0, .5, 0);
    var eg = new T.EdgesGeometry(geo), fm = basic(GOLD, .08), lm = lineM(IVORY, .6); mats.push(fm, lm);
    for (var x = 0; x < 6; x++) for (var z = 0; z < 6; z++) {
      var b = new T.Group(); b.add(new T.Mesh(geo, fm)); b.add(new T.LineSegments(eg, lm));
      b.position.set((x - 2.5) * .85, 0, (z - 2.5) * .85);
      b.userData = { h: .3 + Math.pow(Math.random(), 1.6) * 1.9 + (x + z) * .07, d: (x + z) * .06 + Math.random() * .25 };
      g.add(b); bars.push(b);
    }
    var gr = new T.GridHelper(7, 14, GOLD2, GOLD2); gr.material.transparent = true; gr.material.opacity = .25; gr.material.depthWrite = false; gr.material.blending = ADD; tm(gr.material); mats.push(gr.material); g.add(gr);
    var grow = 0; g.position.y = -2.7; g.scale.set(1, 1, 1);
    reg(g, mats, function (t, dt) {
      grow += dt; g.rotation.y = t * .16;
      bars.forEach(function (b) { b.scale.y = Math.max(.001, b.userData.h * ease((grow - b.userData.d) / 1.2) * (1 + Math.sin(t * 1.4 + b.userData.d * 9) * .04)); });
    }, function () { grow = 0; });
  }

  /* 4 · portal tunnel */
  function buildPortal() {
    var g = new T.Group(), mats = [], rings = [];
    for (var i = 0; i < 12; i++) {
      var m = basic(i % 3 ? GOLD : IVORY, .7), r = new T.Mesh(new T.TorusGeometry(1.5 + i * .09, .012, 8, 110), m);
      r.position.z = -i * 1.5; g.add(r); rings.push(r); mats.push(m);
    }
    var N = mobile ? 350 : 700, p = new Float32Array(N * 3), sp = [];
    for (var j = 0; j < N; j++) { var a = Math.random() * 6.28, rr = .4 + Math.random() * 2.6; sp.push({ a: a, r: rr, z: -Math.random() * 18, v: 2 + Math.random() * 4 }); }
    var P = points(p, GOLD, .12, .95); g.add(P); mats.push(P.material);
    var glow = sprite(GOLD, 5, .55); glow.position.z = -17; g.add(glow); mats.push(glow.material);
    reg(g, mats, function (t, dt) {
      rings.forEach(function (r, i) { r.rotation.z = t * (.25 + i * .02) * (i % 2 ? 1 : -1); r.material.opacity = r.material.userData.o * (.3 + .7 * (Math.sin(t * 3 - i * .7) * .5 + .5)); });
      var a = P.geometry.attributes.position.array;
      sp.forEach(function (s, i) { s.z += dt * s.v; if (s.z > 3) s.z = -18; a[i * 3] = Math.cos(s.a + t * .4) * s.r; a[i * 3 + 1] = Math.sin(s.a + t * .4) * s.r; a[i * 3 + 2] = s.z; });
      P.geometry.attributes.position.needsUpdate = true;
    });
  }

  var VIEWS = [   // camera position / look-at per scene
    [[0, .4, 7.5], [0, 0, 0]], [[5.6, 2.2, 7.6], [0, 0, 0]], [[-1, .8, 9], [0, 0, 0]], [[4.2, 3.4, 8.8], [0, -.6, 0]], [[0, 0, 6.2], [0, 0, -9]]
  ];

  function init() {
    canvas = document.createElement('canvas'); canvas.id = 'ivCanvas'; wrap.appendChild(canvas);
    try { R = new T.WebGLRenderer({ canvas: canvas, alpha: true, antialias: !mobile, powerPreference: 'high-performance' }); } catch (e) { R = null; canvas.remove(); return false; }
    R.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1 : 1.6));
    scene = new T.Scene(); scene.fog = new T.FogExp2(0x050505, .028);
    cam = new T.PerspectiveCamera(55, 1, .1, 120); cam.position.set(0, 0, 14);
    // ambient dust
    var N = 700, p = new Float32Array(N * 3);
    for (var i = 0; i < N; i++) { var r = 6 + Math.random() * 22, a = Math.random() * 6.28, b = Math.acos(2 * Math.random() - 1); p[i * 3] = r * Math.sin(b) * Math.cos(a); p[i * 3 + 1] = r * Math.cos(b) * .6; p[i * 3 + 2] = r * Math.sin(b) * Math.sin(a) - 4; }
    dust = points(p, GOLD2, .09, .5); scene.add(dust);
    buildGalaxy(); buildStack(); buildNet(); buildTowers(); buildPortal();
    size(); addEventListener('resize', size);
    wrap.addEventListener('mousemove', function (e) { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; });
    return true;
  }
  function size() { if (!R) return; var w = wrap.clientWidth || innerWidth, h = wrap.clientHeight || innerHeight; R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }

  function frame(now) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    var dt = Math.min(.05, (now - last) / 1000 || .016); last = now; clock += dt;
    var v = VIEWS[cur % VIEWS.length], k = 1 - Math.pow(.04, dt);          // smooth camera fly-through
    camT.set(v[0][0] + mx * 1.4, v[0][1] - my * .9, v[0][2]); lookT.set(v[1][0], v[1][1], v[1][2]);
    if (cur % VIEWS.length === 4) camT.z += Math.sin(clock * .8) * .6;
    cam.position.lerp(camT, k * .9); look.lerp(lookT, k); cam.lookAt(look);
    kick = Math.max(0, kick - dt * 1.1);
    cam.rotateZ(Math.sin(kick * 3.14) * .07);
    cam.fov = 55 + kick * 16; cam.updateProjectionMatrix();
    dust.rotation.y = clock * .02;
    groups.forEach(function (G, i) {
      G.vis += ((i === cur % groups.length ? 1 : 0) - G.vis) * Math.min(1, dt * 3.2);
      G.g.visible = G.vis > .015;
      if (!G.g.visible) return;
      G.mats.forEach(function (m) { m.opacity = m.userData.o * G.vis; });
      G.g.scale.setScalar(.84 + .16 * G.vis);
      G.tick(clock, dt);
    });
    R.render(scene, cam);
  }

  window.IV3D = {
    start: function () {
      if (!R && !init()) return;
      canvas.style.display = ''; size(); running = true; window.__bgPause = true; last = performance.now();
      cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
    },
    stop: function () { running = false; cancelAnimationFrame(raf); window.__bgPause = false; if (canvas) canvas.style.display = 'none'; },
    scene: function (i) {
      if (!R) return;
      cur = i; kick = 1;
      var G = groups[i % groups.length]; if (G && G.enter) G.enter();
    }
  };
})();
