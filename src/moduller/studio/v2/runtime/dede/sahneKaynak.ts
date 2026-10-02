/** DEDE PlayCanvas sahnesi. Motorun ürettiği kareyi çizer; sonucu kendisi uydurmaz. */
export const DEDE_SAHNE_SOURCE = `
function dedeKur(state, app, cam, manifest, post) {
  var cfg = manifest.cascade || {};
  var motor = createDedeMotor();
  var session = motor.createSession(manifest.economy && manifest.economy.testBalance || 10000);
  var ayar = { music: true, sfx: true, voice: true, haptics: true, particles: true };
  var nodes = {};
  var pool = [];
  var mote = [];
  var presenter = null;
  var round = null;
  var running = false;
  var ready = false;
  var lastVoice = '';
  var saidReady = false;
  var portrait = cfg.portrait || '';
  var fail = false;
  var robe = cfg.robe || '#6B2450';
  var gemScale = Number(cfg.gemScale) || 1;
  var burstN = ayar.particles ? (Number(cfg.particleBurst) || 14) : 6;
  var gridShift = Number(cfg.gridOffsetY) || 0;
  var night = String(cfg.sky || '') === 'night';
  var ui = null;
  var audio = null;
  var winShown = 0;
  var clock = 0;

  function el(tag, cls) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    return node;
  }
  function renkHex(hex, yedek) {
    var h = String(hex || '');
    if (h.charAt(0) !== '#' || h.length !== 7) return yedek;
    var n = parseInt(h.slice(1), 16);
    if (!isFinite(n)) return yedek;
    return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }
  function pbr(r, g, b, metal, gloss, emit) {
    var m = new pc.StandardMaterial();
    m.diffuse = new pc.Color(r, g, b);
    m.metalness = metal;
    m.useMetalness = true;
    m.gloss = gloss;
    m.glossiness = gloss;
    if (emit) m.emissive = new pc.Color(emit[0], emit[1], emit[2]);
    m.update();
    return m;
  }
  function addModel(parent, shape, scale, mat, pos) {
    var e = new pc.Entity();
    e.addComponent('model', { type: shape });
    e.setLocalScale(scale[0], scale[1], scale[2]);
    e.model.material = mat;
    if (pos) e.setLocalPosition(pos[0], pos[1], pos[2]);
    parent.addChild(e);
    return e;
  }
  function cizGokyuzu() {
    var c = document.createElement('canvas');
    c.width = 512; c.height = 768;
    var g = c.getContext('2d');
    var sky = g.createLinearGradient(0, 0, 0, 768);
    if (night) {
      sky.addColorStop(0, '#14102a');
      sky.addColorStop(0.45, '#2a1a4a');
      sky.addColorStop(1, '#3a2a28');
    } else {
      sky.addColorStop(0, '#8ea0e8');
      sky.addColorStop(0.38, '#c7b0ea');
      sky.addColorStop(0.72, '#e7c4a2');
      sky.addColorStop(1, '#f0d7b0');
    }
    g.fillStyle = sky;
    g.fillRect(0, 0, 512, 768);
    g.fillStyle = night ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.45)';
    for (var i = 0; i < 18; i++) {
      g.beginPath();
      g.ellipse(40 + (i * 47) % 480, 80 + (i * 83) % 420, 50 + (i % 4) * 18, 18 + (i % 3) * 6, 0, 0, 6.28);
      g.fill();
    }
    g.fillStyle = night ? '#1b2438' : '#5d6d86';
    g.beginPath();
    g.moveTo(0, 430);
    g.lineTo(70, 360);
    g.lineTo(140, 410);
    g.lineTo(230, 300);
    g.lineTo(310, 400);
    g.lineTo(420, 320);
    g.lineTo(512, 410);
    g.lineTo(512, 520);
    g.lineTo(0, 520);
    g.fill();
    g.fillStyle = night ? '#d9d3c8' : '#f4efe6';
    g.fillRect(196, 250, 120, 150);
    g.fillStyle = night ? '#c2a46a' : '#e6c98a';
    g.fillRect(188, 236, 136, 18);
    g.fillRect(246, 180, 22, 78);
    g.beginPath();
    g.moveTo(236, 180);
    g.lineTo(257, 148);
    g.lineTo(278, 180);
    g.fill();
    var tex = new pc.Texture(app.graphicsDevice, { width: 512, height: 768, format: pc.PIXELFORMAT_R8_G8_B8_A8 });
    tex.setSource(c);
    return tex;
  }
  function yaziDoku(text, fill, stroke) {
    var c = document.createElement('canvas');
    c.width = 256; c.height = 128;
    var g = c.getContext('2d');
    g.clearRect(0, 0, 256, 128);
    g.font = '700 64px Georgia, serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = 8;
    g.strokeStyle = stroke;
    g.strokeText(text, 128, 68);
    g.fillStyle = fill;
    g.fillText(text, 128, 68);
    var tex = new pc.Texture(app.graphicsDevice, { width: 256, height: 128, format: pc.PIXELFORMAT_R8_G8_B8_A8 });
    tex.setSource(c);
    return tex;
  }
  function sesKur() {
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) {
      post({ type: 'ISSUE', code: 'AUDIO_LOAD' });
      return null;
    }
    var ctx = new Ctx();
    var master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);
    var musicGain = ctx.createGain();
    musicGain.gain.value = 0.12;
    musicGain.connect(master);
    var sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.5;
    sfxGain.connect(master);
    function tone(freq, dur, type, gain, when) {
      if (!ayar.sfx) return;
      var t0 = ctx.currentTime + (when || 0);
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.type = type || 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(gain || 0.08, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      o.connect(g);
      g.connect(sfxGain);
      o.start(t0);
      o.stop(t0 + dur + 0.02);
    }
    function noise(dur, gain) {
      if (!ayar.sfx) return;
      var n = Math.floor(ctx.sampleRate * dur);
      var buf = ctx.createBuffer(1, n, ctx.sampleRate);
      var data = buf.getChannelData(0);
      for (var i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
      var src = ctx.createBufferSource();
      src.buffer = buf;
      var g = ctx.createGain();
      var filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 900;
      g.gain.value = gain || 0.08;
      src.connect(filter);
      filter.connect(g);
      g.connect(sfxGain);
      src.start();
    }
    var musicTimer = null;
    var motif = [196, 247, 294, 330, 294, 262, 247, 220];
    function musicStep(i) {
      if (!ayar.music) return;
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.value = motif[i % motif.length];
      g.gain.setValueAtTime(0.05, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
      o.connect(g);
      g.connect(musicGain);
      o.start();
      o.stop(ctx.currentTime + 0.75);
      var o2 = ctx.createOscillator();
      var g2 = ctx.createGain();
      o2.type = 'sine';
      o2.frequency.value = motif[i % motif.length] / 2;
      g2.gain.value = 0.03;
      o2.connect(g2);
      g2.connect(musicGain);
      o2.start();
      o2.stop(ctx.currentTime + 0.8);
    }
    var step = 0;
    function loop() {
      musicStep(step++);
      musicTimer = window.setTimeout(loop, 780);
    }
    function uygula() {
      musicGain.gain.value = ayar.music ? 0.12 : 0;
      sfxGain.gain.value = ayar.sfx ? 0.5 : 0;
    }
    return {
      ctx: ctx,
      uygula: uygula,
      resume: function () { if (ctx.state === 'suspended') ctx.resume(); },
      startMusic: function () { if (!musicTimer) loop(); },
      cue: function (name) {
        if (!ayar.sfx) return;
        if (name === 'symbol_drop' || name === 'cascade') noise(0.12, 0.05);
        else if (name === 'symbol_land') tone(210, 0.06, 'square', 0.03);
        else if (name === 'symbol_win') { tone(523, 0.12, 'sine', 0.06); tone(659, 0.16, 'sine', 0.05, 0.05); }
        else if (name === 'symbol_break') noise(0.18, 0.09);
        else if (name === 'multiplier_spawn') { tone(880, 0.1, 'triangle', 0.05); tone(1174, 0.14, 'sine', 0.04, 0.06); }
        else if (name === 'multiplier_collect') tone(698, 0.2, 'sine', 0.06);
        else if (name === 'button_press' || name === 'UI_open' || name === 'UI_close') tone(440, 0.05, 'square', 0.03);
        else if (name === 'round_start') { tone(262, 0.12, 'triangle', 0.05); tone(392, 0.16, 'sine', 0.04, 0.08); }
        else if (name === 'round_end') tone(330, 0.2, 'sine', 0.04);
        else if (name === 'big_win' || name === 'bonus_trigger') {
          tone(523, 0.16, 'triangle', 0.07);
          tone(659, 0.18, 'triangle', 0.06, 0.1);
          tone(784, 0.22, 'sine', 0.06, 0.18);
          tone(1046, 0.28, 'sine', 0.05, 0.26);
        }
      }
    };
  }
  function soyle(line) {
    if (!line || !ayar.voice || line === lastVoice) return;
    lastVoice = line;
    var synth = window.speechSynthesis;
    if (!synth || typeof SpeechSynthesisUtterance !== 'function') {
      post({ type: 'ISSUE', code: 'AUDIO_VOICE' });
      return;
    }
    try {
      var u = new SpeechSynthesisUtterance(line);
      u.lang = 'tr-TR';
      u.rate = 1;
      u.pitch = 0.85;
      synth.speak(u);
    } catch (err) {
      post({ type: 'ISSUE', code: 'AUDIO_VOICE' });
    }
  }
  function haptic(kind) {
    if (!ayar.haptics) return;
    post({ type: 'HAPTIC', code: kind });
  }
  function para(n) {
    return Math.round(n).toLocaleString('tr-TR');
  }
  function uiKur() {
    var stil = el('style');
    stil.textContent = [
      '#dede-ui{position:absolute;inset:0;display:flex;flex-direction:column;pointer-events:none;color:#f6f0e4;font-family:Georgia,serif}',
      '#dede-ui button,#dede-ui input{pointer-events:auto;font-family:inherit}',
      '.dede-logo{font-weight:900;letter-spacing:.18em;font-size:28px;text-align:center;margin-top:4px;',
      'background:linear-gradient(#f8e7b0,#6d3b93);-webkit-background-clip:text;background-clip:text;color:transparent;',
      '-webkit-text-stroke:1px #e6c56a;text-shadow:0 6px 16px rgba(80,40,10,.35)}',
      '.dede-orta{flex:1}',
      '.dede-kazanc{text-align:center;letter-spacing:.22em;font-size:12px;color:#f0e2b8}',
      '.dede-tutar{text-align:center;font-size:28px;color:#f6e7bf;font-weight:800;min-height:36px}',
      '.dede-carpan{text-align:center;color:#e7d39a;font-weight:700;min-height:22px}',
      '.dede-bar{display:flex;justify-content:space-between;margin:8px 16px;padding:8px 12px;border-radius:14px;',
      'background:rgba(22,10,36,.72);border:1px solid rgba(230,197,106,.35);font-size:13px}',
      '.dede-kont{display:flex;align-items:center;justify-content:space-between;padding:8px 22px 12px}',
      '.dede-ikon{width:46px;height:46px;border-radius:23px;border:1px solid #e6c56a;background:#2a1544;color:#f6e7bf;font-size:18px}',
      '.dede-oyna{width:74px;height:74px;border-radius:37px;border:0;background:radial-gradient(circle at 40% 35%,#f0d78a,#8a5a16 55%,#3a1760);',
      'color:#2a103c;font-weight:900;font-size:16px;letter-spacing:.04em}',
      '.dede-oyna:disabled{opacity:.45}',
      '.dede-sheet,.dede-test,.dede-load,.dede-buyuk{pointer-events:auto}',
      '.dede-load{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:flex-end;padding:28px;background:rgba(18,8,32,.55)}',
      '.dede-load b{font-size:42px;letter-spacing:.2em;color:#f3e2a8}',
      '.dede-load li{margin:6px 0;opacity:.45}',
      '.dede-load li.ok{opacity:1;color:#f6e7bf}',
      '.dede-buyuk{position:absolute;inset:0;display:none;align-items:center;justify-content:center;background:rgba(10,6,18,.55);text-align:center}',
      '.dede-buyuk h2{margin:0;letter-spacing:.16em;color:#f8e7b0}',
      '.dede-sheet,.dede-test{position:absolute;left:12px;right:12px;bottom:16px;background:#1a0e2c;border:1px solid rgba(230,197,106,.4);border-radius:16px;padding:12px;display:none}',
      '.dede-satir{display:flex;justify-content:space-between;margin:8px 0;align-items:center}',
      '.dede-fail{position:absolute;inset:0;display:none;align-items:center;justify-content:center;background:rgba(12,6,20,.82);text-align:center;padding:24px}'
    ].join('');
    document.head.appendChild(stil);
    ui = el('div');
    ui.id = 'dede-ui';
    ui.innerHTML = ''
      + '<div class="dede-logo">DEDE</div>'
      + '<div class="dede-orta"></div>'
      + '<div class="dede-kazanc">KAZANÇ</div>'
      + '<div class="dede-tutar" id="dede-tutar">0</div>'
      + '<div class="dede-carpan" id="dede-carpan"></div>'
      + '<div class="dede-bar"><span id="dede-bakiye">TEST 10.000</span><span id="dede-tur">TUR 00</span></div>'
      + '<div class="dede-kont">'
      + '<button class="dede-ikon" id="dede-ayar" type="button">⚙</button>'
      + '<button class="dede-ikon" id="dede-pay" type="button"></button>'
      + '<button class="dede-oyna" id="dede-oyna" type="button" disabled>▶ OYNAT</button>'
      + '</div>'
      + '<div class="dede-load" id="dede-load"><b>DEDE</b><ul id="dede-adim"></ul></div>'
      + '<div class="dede-buyuk" id="dede-buyuk"><div><h2>BÜYÜK KAZANÇ</h2><div id="dede-buyuk-sayi" style="font-size:40px;font-weight:800"></div></div></div>'
      + '<div class="dede-sheet" id="dede-sheet"></div>'
      + '<div class="dede-test" id="dede-test"></div>'
      + '<div class="dede-fail" id="dede-fail"><div><p>3D varlıklar yüklenemedi.</p><button id="dede-retry" type="button">Yeniden dene</button></div></div>';
    document.body.appendChild(ui);
    var stakeBtn = document.getElementById('dede-pay');
    stakeBtn.textContent = String(session.testStake);
    document.getElementById('dede-oyna').addEventListener('click', oynat);
    stakeBtn.addEventListener('click', function () {
      if (running) return;
      var i = motor.stakes.indexOf(session.testStake);
      session.testStake = motor.stakes[(i + 1) % motor.stakes.length];
      stakeBtn.textContent = String(session.testStake);
      ses('button_press');
    });
    document.getElementById('dede-ayar').addEventListener('click', function () { acSheet(); ses('UI_open'); });
    document.getElementById('dede-retry').addEventListener('click', function () {
      fail = false;
      session.assetFailure = false;
      document.getElementById('dede-fail').style.display = 'none';
      hazirBitir();
    });
    var testBtn = el('button', 'dede-ikon');
    testBtn.textContent = 'T';
    testBtn.style.position = 'absolute';
    testBtn.style.right = '12px';
    testBtn.style.top = '12px';
    testBtn.style.pointerEvents = 'auto';
    testBtn.addEventListener('click', function () { acTest(); ses('UI_open'); });
    ui.appendChild(testBtn);
  }
  function adimYaz(maddeler, aktif) {
    var ul = document.getElementById('dede-adim');
    ul.innerHTML = '';
    for (var i = 0; i < maddeler.length; i++) {
      var li = el('li');
      li.textContent = maddeler[i];
      if (i <= aktif) li.className = 'ok';
      ul.appendChild(li);
    }
  }
  function sembol(type, mult) {
    var root = new pc.Entity(type);
    var metal = type === 'watch' || type === 'key' || type === 'ring' || type === 'crown' || type === 'medallion' || type === 'lantern' ? 0.82 : 0.18;
    var pal = {
      amethyst: [0.58, 0.28, 0.9], emerald: [0.1, 0.72, 0.38], ruby: [0.82, 0.12, 0.18],
      sapphire: [0.18, 0.38, 0.95], topaz: [0.95, 0.74, 0.2], watch: [0.9, 0.72, 0.28],
      lantern: [0.62, 0.36, 0.78], key: [0.92, 0.74, 0.3], ring: [0.9, 0.7, 0.28],
      crown: [0.95, 0.78, 0.34], medallion: [0.92, 0.74, 0.28]
    };
    var c = pal[type] || [0.8, 0.7, 0.3];
    var mat = pbr(c[0], c[1], c[2], metal, 0.9, metal > 0.5 ? [c[0] * 0.15, c[1] * 0.12, c[2] * 0.05] : [c[0] * 0.08, c[1] * 0.05, c[2] * 0.12]);
    var s = 0.34 * gemScale;
    if (type === 'amethyst' || type === 'sapphire') addModel(root, 'cone', [s, s * 1.15, s], mat);
    else if (type === 'emerald') addModel(root, 'box', [s * 0.9, s * 1.15, s * 0.7], mat);
    else if (type === 'ruby') addModel(root, 'sphere', [s * 0.95, s * 0.8, s * 0.7], mat);
    else if (type === 'topaz') addModel(root, 'cylinder', [s, s * 0.42, s], mat);
    else if (type === 'watch') {
      addModel(root, 'cylinder', [s, s * 0.22, s], mat);
      addModel(root, 'sphere', [s * 0.28, s * 0.28, s * 0.2], pbr(0.15, 0.1, 0.2, 0.2, 0.8), [0, 0.08, 0.05]);
    } else if (type === 'lantern') {
      addModel(root, 'box', [s * 0.62, s * 0.9, s * 0.5], mat);
      addModel(root, 'sphere', [s * 0.28, s * 0.28, s * 0.28], pbr(1, 0.72, 0.3, 0.1, 0.7, [0.6, 0.3, 0.05]), [0, 0, 0]);
    } else if (type === 'key') {
      addModel(root, 'cylinder', [s * 0.12, s * 1.1, s * 0.12], mat);
      addModel(root, 'box', [s * 0.42, s * 0.18, s * 0.12], mat, [0.08, -0.22, 0]);
    } else if (type === 'ring') {
      addModel(root, 'cylinder', [s * 0.7, s * 0.16, s * 0.7], mat);
      addModel(root, 'sphere', [s * 0.28, s * 0.28, s * 0.28], pbr(0.55, 0.25, 0.85, 0.2, 0.9, [0.2, 0.05, 0.3]), [0, 0.12, 0]);
    } else if (type === 'crown') {
      addModel(root, 'cylinder', [s * 0.8, s * 0.22, s * 0.8], mat);
      addModel(root, 'cone', [s * 0.22, s * 0.48, s * 0.22], mat, [-0.16, 0.2, 0]);
      addModel(root, 'cone', [s * 0.22, s * 0.62, s * 0.22], mat, [0, 0.24, 0]);
      addModel(root, 'cone', [s * 0.22, s * 0.48, s * 0.22], mat, [0.16, 0.2, 0]);
    } else {
      addModel(root, 'cylinder', [s * 0.92, s * 0.12, s * 0.92], mat);
      addModel(root, 'sphere', [s * 0.36, s * 0.36, s * 0.2], pbr(0.45, 0.16, 0.72, 0.25, 0.9, [0.25, 0.08, 0.3]));
      var plane = new pc.Entity('val');
      plane.addComponent('model', { type: 'plane' });
      plane.setLocalScale(s * 1.1, 1, s * 0.55);
      plane.setEulerAngles(-90, 0, 0);
      plane.setLocalPosition(0, 0.08, 0);
      var face = new pc.StandardMaterial();
      face.diffuseMap = yaziDoku('x' + mult, '#f8e7ff', '#3a1464');
      face.emissiveMap = face.diffuseMap;
      face.emissive = new pc.Color(0.7, 0.5, 1);
      face.opacityMap = face.diffuseMap;
      face.blendType = pc.BLEND_NORMAL;
      face.update();
      plane.model.material = face;
      root.addChild(plane);
    }
    app.root.addChild(root);
    return root;
  }
  function yer(cell) {
    var pitch = 0.46;
    var x = (cell.column - 2.5) * pitch;
    var y = (2 - cell.row) * pitch * 0.86 + 0.62 + gridShift + (cell.offset || 0) * pitch;
    return [x, y, 0];
  }
  function patlat(pos, kind) {
    var renk = kind === 'break' ? new pc.Color(0.72, 0.4, 1) : kind === 'confetti' ? new pc.Color(0.95, 0.82, 0.35) : new pc.Color(0.95, 0.78, 0.3);
    var n = Math.min(burstN, mote.length);
    for (var i = 0; i < n; i++) {
      var m = mote[i];
      if (m.enabled && m._life > 0.2) continue;
      m.enabled = true;
      m.setPosition(pos[0], pos[1], pos[2]);
      m.model.material.diffuse = renk;
      m.model.material.emissive = renk;
      m.model.material.update();
      m._life = 0.55;
      m._vel = new pc.Vec3((i % 5) - 2, 1.4 + (i % 3), ((i * 2) % 5) - 2);
    }
  }
  function dedeGovde() {
    var robeC = renkHex(robe, [0.42, 0.14, 0.31]);
    var root = new pc.Entity('dede');
    var cloth = pbr(robeC[0], robeC[1], robeC[2], 0.25, 0.55, [0.05, 0.01, 0.04]);
    var gold = pbr(0.86, 0.68, 0.24, 0.85, 0.75);
    var skin = pbr(0.83, 0.68, 0.55, 0.05, 0.35);
    var hair = pbr(0.9, 0.9, 0.92, 0.15, 0.4);
    addModel(root, 'capsule', [0.28, 0.42, 0.2], cloth, [0, 0.15, 0]);
    addModel(root, 'box', [0.34, 0.06, 0.16], gold, [0, 0.22, 0.06]);
    var head = new pc.Entity('head');
    head.addComponent('model', { type: 'sphere' });
    head.setLocalScale(0.2, 0.22, 0.18);
    head.setLocalPosition(0, 0.58, 0);
    head.model.material = skin;
    root.addChild(head);
    addModel(root, 'sphere', [0.22, 0.12, 0.2], hair, [0, 0.7, 0]);
    addModel(root, 'box', [0.16, 0.05, 0.04], hair, [0, 0.48, 0.08]);
    addModel(root, 'box', [0.08, 0.08, 0.04], hair, [0, 0.44, 0.08]);
    var arm = new pc.Entity('arm');
    arm.addComponent('model', { type: 'capsule' });
    arm.setLocalScale(0.08, 0.22, 0.08);
    arm.setLocalPosition(0.22, 0.28, 0.04);
    arm.model.material = cloth;
    root.addChild(arm);
    var cane = new pc.Entity('cane');
    addModel(cane, 'cylinder', [0.025, 0.55, 0.025], pbr(0.35, 0.22, 0.12, 0.4, 0.4), [0.34, 0.15, 0.08]);
    addModel(cane, 'cone', [0.07, 0.12, 0.07], pbr(0.55, 0.25, 0.9, 0.2, 0.9, [0.4, 0.15, 0.2]), [0.34, 0.48, 0.08]);
    root.addChild(cane);
    root._arm = arm;
    root._head = head;
    root._cane = cane;
    app.root.addChild(root);
    root.setLocalScale(0.62, 0.62, 0.62);
    root.setPosition(0, 1.72 + gridShift, 0.35);
    return root;
  }
  function sahneyiKur() {
    var bg = new pc.Entity('mansion');
    bg.addComponent('model', { type: 'plane' });
    bg.setLocalScale(6.2, 1, 9.2);
    bg.setEulerAngles(-90, 0, 0);
    bg.setPosition(0, 0.2, -1.6);
    var mat = new pc.StandardMaterial();
    mat.diffuseMap = cizGokyuzu();
    mat.emissiveMap = mat.diffuseMap;
    mat.emissive = new pc.Color(0.35, 0.3, 0.4);
    mat.update();
    bg.model.material = mat;
    app.root.addChild(bg);
    var marble = pbr(0.92, 0.88, 0.82, 0.18, 0.62);
    var band = pbr(0.84, 0.66, 0.25, 0.8, 0.7);
    [-1.7, 1.7].forEach(function (x) {
      var kol = new pc.Entity('kol');
      kol.addComponent('model', { type: 'cylinder' });
      kol.setLocalScale(0.22, 1.7, 0.22);
      kol.setPosition(x, 0.55 + gridShift, -0.15);
      kol.model.material = marble;
      app.root.addChild(kol);
      var altin = new pc.Entity('altin');
      altin.addComponent('model', { type: 'cylinder' });
      altin.setLocalScale(0.26, 0.05, 0.26);
      altin.setPosition(x, 1.55 + gridShift, -0.15);
      altin.model.material = band;
      app.root.addChild(altin);
    });
    var plum = pbr(0.12, 0.06, 0.2, 0.2, 0.35);
    var zemin = new pc.Entity('grid');
    zemin.addComponent('model', { type: 'box' });
    zemin.setLocalScale(2.85, 2.35, 0.06);
    zemin.setPosition(0, 0.52 + gridShift, -0.18);
    zemin.model.material = plum;
    app.root.addChild(zemin);
    for (var i = 0; i < 36; i++) {
      var m = new pc.Entity('mote');
      m.addComponent('model', { type: 'sphere' });
      m.setLocalScale(0.035, 0.035, 0.035);
      m.model.material = pbr(0.95, 0.8, 0.35, 0.3, 0.6, [0.4, 0.25, 0.05]);
      m.enabled = false;
      app.root.addChild(m);
      mote.push(m);
    }
    nodes.dede = dedeGovde();
    if (portrait) {
      var img = new Image();
      img.onload = function () {
        try {
          var tex = new pc.Texture(app.graphicsDevice, { width: img.width, height: img.height });
          tex.setSource(img);
          var kart = new pc.Entity('portre');
          kart.addComponent('model', { type: 'plane' });
          kart.setLocalScale(0.42, 1, 0.58);
          kart.setEulerAngles(-78, 0, 0);
          kart.setPosition(1.15, 1.85 + gridShift, 0.55);
          var pm = new pc.StandardMaterial();
          pm.diffuseMap = tex;
          pm.emissiveMap = tex;
          pm.emissive = new pc.Color(0.45, 0.4, 0.5);
          pm.update();
          kart.model.material = pm;
          app.root.addChild(kart);
          nodes.portre = kart;
        } catch (err) {
          post({ type: 'ISSUE', code: 'ASSET_DOWNLOAD_FAILED' });
        }
      };
      img.onerror = function () { post({ type: 'ISSUE', code: 'ASSET_DOWNLOAD_FAILED' }); };
      img.src = portrait;
    }
    cam.setPosition(0, 0.7, 6.15);
    cam.lookAt(0, 0.48, 0);
    cam.camera.fov = 36;
    var sun = new pc.Entity('sun');
    sun.addComponent('light', { type: 'directional', intensity: 1.25, color: new pc.Color(1, 0.9, 0.75), castShadows: false });
    sun.setEulerAngles(48, 28, 0);
    app.root.addChild(sun);
    var fill = new pc.Entity('fill');
    fill.addComponent('light', { type: 'directional', intensity: 0.45, color: night ? new pc.Color(0.35, 0.4, 0.7) : new pc.Color(0.55, 0.48, 0.8), castShadows: false });
    fill.setEulerAngles(-20, 160, 0);
    app.root.addChild(fill);
    var rim = new pc.Entity('rim');
    rim.addComponent('light', { type: 'directional', intensity: 0.55, color: new pc.Color(1, 0.82, 0.45), castShadows: false });
    rim.setEulerAngles(20, -140, 0);
    app.root.addChild(rim);
  }
  function ses(name) { if (audio) audio.cue(name); }
  function hud() {
    document.getElementById('dede-bakiye').textContent = 'TEST ' + para(session.testBalance);
    document.getElementById('dede-tur').textContent = 'TUR ' + String(session.roundNo).padStart(2, '0');
    document.getElementById('dede-tutar').textContent = winShown > 0 ? '+' + para(winShown) : '0';
    var carpan = document.getElementById('dede-carpan');
    carpan.textContent = round && round.totalMultiplier > 1 ? 'ÇARPAN x' + round.totalMultiplier : '';
    document.getElementById('dede-pay').textContent = String(session.testStake);
    document.getElementById('dede-oyna').disabled = running || !ready || session.testBalance < session.testStake;
  }
  function senkron(frame) {
    if (fail) return;
    var gorunen = {};
    var yeni = false;
    for (var i = 0; i < frame.cells.length; i++) {
      var cell = frame.cells[i];
      gorunen[cell.id] = 1;
      var node = nodes[cell.id];
      if (!node) {
        node = sembol(cell.type, cell.multiplier);
        nodes[cell.id] = node;
        yeni = true;
      }
      var p = yer(cell);
      if (cell.animationState === 'collect') {
        var k = frame.progress;
        p[0] = p[0] * (1 - k);
        p[1] = p[1] + ( -1.35 - p[1]) * k;
      }
      node.setPosition(p[0], p[1], 0);
      node.enabled = cell.animationState !== 'break' || frame.progress < 0.72;
      var pulse = cell.animationState === 'win' ? 1 + Math.sin(frame.progress * 3.14) * 0.08 : cell.animationState === 'break' ? Math.max(0.2, 1 - frame.progress) : 1;
      node.setLocalScale(pulse, pulse, pulse);
      if (cell.animationState === 'break' && frame.progress > 0.35 && frame.progress < 0.5) patlat(p, 'break');
      if (cell.animationState === 'collect' && frame.progress > 0.2 && frame.progress < 0.35) patlat(p, 'gold');
    }
    if (yeni) ses('symbol_drop');
    Object.keys(nodes).forEach(function (id) {
      if (id === 'dede' || id === 'portre') return;
      if (!gorunen[id]) {
        if (nodes[id].destroy) nodes[id].destroy();
        delete nodes[id];
      }
    });
    var dede = nodes.dede;
    if (dede) {
      var mood = frame.dede;
      var bob = Math.sin(clock * 1.6) * 0.03;
      dede.setPosition(0, 1.72 + gridShift + bob, 0.35);
      if (dede._head) dede._head.setEulerAngles(Math.sin(clock * 0.8) * 4, Math.sin(clock * 0.5) * 6, 0);
      if (dede._arm && dede._cane) {
        var lift = mood === 'HAPPY' || mood === 'BIG_WIN' || mood === 'SURPRISED' ? -28 : 8;
        if (mood === 'WAITING') lift = 16;
        dede._cane.setEulerAngles(lift, 0, mood === 'BIG_WIN' ? -18 : 0);
        dede._arm.setEulerAngles(lift * 0.4, 0, 0);
      }
      if (mood === 'BIG_WIN' && frame.progress > 0.15 && frame.progress < 0.28) patlat([0.1, 1.8, 0.2], 'confetti');
    }
    winShown = frame.winShown || 0;
    if (frame.bigWin) {
      var buyuk = document.getElementById('dede-buyuk');
      buyuk.style.display = 'flex';
      document.getElementById('dede-buyuk-sayi').textContent = '+' + para(Math.round((round.totalWin || 0) * frame.progress));
    }
    if (frame.voice) soyle(frame.voice);
    if (frame.burst === 'spark' && frame.progress < 0.1) ses('symbol_win');
    if (frame.burst === 'break' && frame.progress < 0.1) { ses('symbol_break'); haptic('win'); }
    if (frame.burst === 'gold' && frame.progress < 0.1) { ses('multiplier_spawn'); haptic('multiplier'); }
    if (frame.burst === 'confetti' && frame.progress < 0.1) { ses('big_win'); haptic('big'); }
    hud();
    session.gameState = frame.gameState;
  }
  function oynat() {
    if (!ready || running || fail) return;
    if (session.testBalance < session.testStake) return;
    if (audio) { audio.resume(); audio.startMusic(); }
    ses('button_press');
    ses('round_start');
    haptic('play');
    soyle(session.roundNo === 0 ? 'Haydi bakalım.' : 'Konak bugün hareketli.');
    round = motor.startRound(session);
    if (!round) return;
    running = true;
    presenter = motor.createPresenter(round, 0);
    document.getElementById('dede-buyuk').style.display = 'none';
    document.getElementById('dede-oyna').disabled = true;
    hud();
  }
  function vitrin() {
    var ornek = motor.quoteRound({ seed: 'DEDE_VITRIN', stake: session.testStake, nonce: 1 });
    var sahte = motor.createPresenter(ornek, 0);
    var kare = sahte.tick(0.02);
    var adim = 0;
    while (kare.gameState === 'POPULATE_GRID' && kare.progress < 0.96 && adim < 40) {
      kare = sahte.tick(0.04);
      adim += 1;
    }
    kare.gameState = 'READY';
    kare.voice = null;
    kare.burst = 'none';
    senkron(kare);
  }
  function hazirBitir() {
    ready = !fail;
    session.gameState = fail ? 'ERROR' : 'READY';
    var load = document.getElementById('dede-load');
    if (load) load.style.display = 'none';
    document.getElementById('dede-oyna').disabled = !ready;
    hud();
    if (ready && !saidReady) {
      saidReady = true;
      vitrin();
      soyle('Haydi bakalım.');
    }
  }
  function acSheet() {
    var sheet = document.getElementById('dede-sheet');
    sheet.style.display = 'block';
    sheet.innerHTML = '';
    function dugme(ad, fn) {
      var b = el('button');
      b.textContent = ad;
      b.style.display = 'block';
      b.style.width = '100%';
      b.style.margin = '6px 0';
      b.style.padding = '10px';
      b.style.borderRadius = '10px';
      b.style.border = '0';
      b.style.background = '#3a2158';
      b.style.color = '#f6e7bf';
      b.addEventListener('click', fn);
      sheet.appendChild(b);
    }
    dugme('Müzik: ' + (ayar.music ? 'açık' : 'kapalı'), function () { ayar.music = !ayar.music; if (audio) audio.uygula(); acSheet(); });
    dugme('Efekt: ' + (ayar.sfx ? 'açık' : 'kapalı'), function () { ayar.sfx = !ayar.sfx; if (audio) audio.uygula(); acSheet(); });
    dugme('Ses: ' + (ayar.voice ? 'açık' : 'kapalı'), function () { ayar.voice = !ayar.voice; acSheet(); });
    dugme('Titreşim: ' + (ayar.haptics ? 'açık' : 'kapalı'), function () { ayar.haptics = !ayar.haptics; acSheet(); });
    dugme('Performans: ' + (ayar.particles ? 'tam' : 'düşük'), function () { ayar.particles = !ayar.particles; burstN = ayar.particles ? (Number(cfg.particleBurst) || 14) : 6; acSheet(); });
    dugme(state.paused ? 'Devam' : 'Duraklat', function () { state.paused = !state.paused; session.gameState = state.paused ? 'PAUSED' : 'READY'; });
    dugme('Kurallar', function () {
      sheet.innerHTML = '<p style="line-height:1.4">6×5 konak ızgarası. Yan yana duran aynı taşlar 5 ve üzeri olduğunda kazanır, kırılır ve üstten yenileri düşer. Madalyonlar tur sonunda kazancı çarpan olarak toplar. Bakiye yalnızca TEST kredisidir.</p>';
      dugme('Kapat', function () { sheet.style.display = 'none'; ses('UI_close'); });
    });
    dugme('Test oturumunu başlat', function () {
      session = motor.createSession(manifest.economy && manifest.economy.testBalance || 10000);
      session.seed = 'DEDE_TEST_001';
      round = null;
      running = false;
      winShown = 0;
      Object.keys(nodes).forEach(function (id) {
        if (id === 'dede' || id === 'portre') return;
        if (nodes[id].destroy) nodes[id].destroy();
        delete nodes[id];
      });
      hud();
      sheet.style.display = 'none';
    });
    dugme('Kapat', function () { sheet.style.display = 'none'; ses('UI_close'); });
  }
  function acTest() {
    var panel = document.getElementById('dede-test');
    panel.style.display = 'block';
    panel.innerHTML = '';
    var seed = el('input');
    seed.value = session.seed;
    seed.style.width = '100%';
    seed.style.marginBottom = '8px';
    panel.appendChild(seed);
    var bakiye = el('input');
    bakiye.value = String(session.testBalance);
    bakiye.style.width = '100%';
    panel.appendChild(bakiye);
    function dugme(ad, fn) {
      var b = el('button');
      b.textContent = ad;
      b.style.margin = '4px';
      b.addEventListener('click', fn);
      panel.appendChild(b);
    }
    dugme('Tohum', function () { session.seed = seed.value || 'DEDE_TEST_001'; });
    dugme('Bakiye', function () { if (!running) session.testBalance = Math.max(0, Math.round(Number(bakiye.value) || 0)); hud(); });
    dugme('Çöküş', function () { session.force = { cascade: true }; });
    dugme('Çarpan', function () { session.force = { multiplier: true, cascade: true }; });
    dugme('Büyük', function () { session.force = { bigWin: true }; });
    dugme('Varlık hata', function () {
      fail = true;
      session.assetFailure = true;
      session.gameState = 'ERROR';
      document.getElementById('dede-fail').style.display = 'flex';
      post({ type: 'ISSUE', code: 'ASSET_DOWNLOAD_FAILED' });
    });
    dugme('Sessiz', function () { ayar.music = false; ayar.sfx = false; ayar.voice = false; if (audio) audio.uygula(); });
    dugme('Kapat', function () { panel.style.display = 'none'; ses('UI_close'); });
  }
  uiKur();
  var adimlar = ['Sahne hazırlanıyor', '3D varlıklar yükleniyor', 'Sesler yükleniyor', 'Oyun motoru hazırlanıyor'];
  adimYaz(adimlar, 0);
  sahneyiKur();
  adimYaz(adimlar, 1);
  audio = sesKur();
  if (audio) audio.uygula();
  adimYaz(adimlar, 2);
  session.gameState = 'LOADING';
  adimYaz(adimlar, 3);
  if (cfg.assetFailure) {
    fail = true;
    document.getElementById('dede-fail').style.display = 'flex';
    post({ type: 'ISSUE', code: 'ASSET_DOWNLOAD_FAILED' });
  }
  window.setTimeout(hazirBitir, 60);
  state.dede = {
    tick: function (dt) {
      if (state.paused) return;
      clock += dt || 0;
      for (var i = 0; i < mote.length; i++) {
        var m = mote[i];
        if (!m.enabled || !m._life) continue;
        m._life -= dt;
        m.translate((m._vel.x || 0) * dt, (m._vel.y || 0) * dt, (m._vel.z || 0) * dt);
        if (m._life <= 0) m.enabled = false;
      }
      if (!presenter) return;
      var frame = presenter.tick(dt || 0);
      senkron(frame);
      if (frame.gameState === 'CASCADE' && frame.progress < 0.05) ses('cascade');
      if (frame.done && running) {
        motor.commit(session, round);
        running = false;
        presenter = null;
        window.__DEDE_SON = { cascadeIndex: round.cascadeIndex, totalWin: round.totalWin, balance: session.testBalance, state: session.gameState };
        ses('round_end');
        if (round.totalWin <= 0) soyle('');
        document.getElementById('dede-buyuk').style.display = 'none';
        hud();
        post({ type: 'STATS', fps: 0, frameMs: 0, drawCalls: null, code: 'ROUND' });
      }
    },
    safe: function () {
      ui.style.paddingTop = (state.safeTop || 12) + 'px';
      ui.style.paddingBottom = (state.safeBottom || 12) + 'px';
    }
  };
  state.dede.safe();
}
`;
