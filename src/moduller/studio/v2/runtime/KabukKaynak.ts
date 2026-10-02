/** Onaylı oyun kabuğu. İndirilen içerik çalıştırılmaz; yalnızca manifest okunur. */
import { DEDE_MOTOR_SOURCE } from './dede/motorKaynak';
import { DEDE_SAHNE_SOURCE } from './dede/sahneKaynak';

export const KABUK_JS = `(function () {
${DEDE_MOTOR_SOURCE}
${DEDE_SAHNE_SOURCE}
  var state = { app: null, paused: false, input: false, waitPick: false, selected: null, node: null, nodes: {}, entities: {}, pick: [], balance: 0, result: '', wait: 0, anims: [], motes: [], urls: {}, hosts: {}, manifest: null, clock: 0, frames: 0, acc: 0, safeTop: 16, safeBottom: 16 };
  var PRESET = { gold: [0.85, 0.66, 0.22], silver: [0.78, 0.78, 0.82], wood: [0.46, 0.28, 0.14], stone: [0.32, 0.31, 0.29], dark: [0.1, 0.09, 0.12], default: [0.42, 0.3, 0.62] };

  function post(msg) {
    var raw = JSON.stringify(msg);
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(raw);
    if (window.parent && window.parent !== window) window.parent.postMessage(raw, '*');
  }
  function hostOk(url) {
    try { return !!state.hosts[new URL(url).hostname]; } catch (e) { return false; }
  }
  function renk(preset) {
    if (typeof preset === 'string' && preset.charAt(0) === '#' && preset.length === 7) {
      var n = parseInt(preset.slice(1), 16);
      return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
    }
    return PRESET[preset] || PRESET.default;
  }
  function boya(entity, preset) {
    var c = renk(preset);
    var models = entity.findComponents ? entity.findComponents('model') : [];
    for (var i = 0; i < models.length; i++) {
      var mis = models[i].meshInstances || [];
      for (var j = 0; j < mis.length; j++) {
        if (!mis[j].material) continue;
        mis[j].material.diffuse = new pc.Color(c[0], c[1], c[2]);
        if (mis[j].material.update) mis[j].material.update();
      }
    }
  }
  function malzeme(preset) {
    var c = renk(preset);
    var mat = new pc.StandardMaterial();
    mat.diffuse = new pc.Color(c[0], c[1], c[2]);
    mat.update();
    return mat;
  }
  function dugum(id) {
    return state.nodes[id] || null;
  }
  function git(id) {
    var node = dugum(id);
    if (!node) return;
    state.node = node;
    var fn = EYLEMLER[node.action];
    if (!fn) { post({ type: 'ISSUE', code: 'UNKNOWN_ACTION' }); return; }
    fn(node);
  }
  function sonra() {
    var next = state.node && state.node.next && state.node.next[0];
    if (next) git(next);
  }
  function secilebilir(id) {
    var row = state.entities[id];
    return row && row.selectable;
  }
  function hud(text) {
    var el = document.getElementById('hud');
    if (el) el.textContent = text;
  }
  function patlama(entity, olumlu) {
    var origin = entity.getPosition();
    var renkP = olumlu ? new pc.Color(0.95, 0.82, 0.35) : new pc.Color(0.75, 0.15, 0.2);
    for (var i = 0; i < state.motes.length && i < 12; i++) {
      var m = state.motes[i];
      m.enabled = true;
      m.setPosition(origin.x, origin.y + 0.4, origin.z);
      m.model.material.diffuse = renkP;
      m.model.material.update();
      m._life = 0.7 + i * 0.02;
      m._vel = new pc.Vec3((i % 4) - 1.5, 1.2 + (i % 3) * 0.3, ((i * 3) % 5) - 2);
    }
  }
  function acilis(entity) {
    var start = entity.getEulerAngles().clone();
    state.anims.push({ t: 0, dur: 0.85, step: function (k) {
      entity.setEulerAngles(start.x + -28 * k, start.y, start.z + Math.sin(k * 12) * (1 - k) * 4);
    }});
  }
  function odak(entity) {
    if (!state.camera || !entity) return;
    var p = entity.getPosition();
    var hedef = new pc.Vec3(p.x * 0.35, p.y + 1.6, p.z + 3.4);
    state.anims.push({ t: 0, dur: 0.55, cam: state.camera.getPosition().clone(), to: hedef, look: p, step: function (k, a) {
      state.camera.setPosition(
        a.cam.x + (a.to.x - a.cam.x) * k,
        a.cam.y + (a.to.y - a.cam.y) * k,
        a.cam.z + (a.to.z - a.cam.z) * k
      );
      state.camera.lookAt(a.look);
    }});
  }
  function sesCal(cue) {
    var bus = state.audio;
    if (!bus || !bus.sound) return;
    var ad = cue === 'open' ? 'open' : cue === 'bad' ? 'bad' : 'good';
    if (bus.sound.slot(ad)) bus.sound.play(ad);
  }
  var EYLEMLER = {
    GAME_START: function () { hud(String(state.balance)); sonra(); },
    ENABLE_SELECTION: function () { state.input = true; state.waitPick = false; sonra(); },
    WAIT_CHEST_SELECTED: function () { state.waitPick = true; state.input = true; },
    DISABLE_INPUT: function () { state.input = false; state.waitPick = false; sonra(); },
    CAMERA_FOCUS: function () { odak(state.selected); state.anims[state.anims.length - 1] && (state.anims[state.anims.length - 1].then = sonra); },
    PLAY_OPEN_ANIMATION: function () { if (state.selected) acilis(state.selected); state.anims[state.anims.length - 1] && (state.anims[state.anims.length - 1].then = sonra); if (!state.selected) sonra(); },
    PLAY_SFX: function (node) { sesCal((node.params && node.params.cue) || 'open'); sonra(); },
    RESOLVE_TEST_RESULT: function () {
      var delta = state.selectedDelta || 0;
      state.balance += delta;
      state.result = (delta > 0 ? '+' : '') + delta;
      sesCal(delta >= 0 ? 'good' : 'bad');
      sonra();
    },
    PLAY_RESULT_EFFECT: function () {
      if (state.selected) patlama(state.selected, (state.selectedDelta || 0) >= 0);
      sonra();
    },
    SHOW_RESULT: function () { hud(state.result + '   ' + state.balance); sonra(); },
    WAIT: function (node) { state.wait = Number(node.params && node.params.seconds) || 1; },
    RESET_ROUND: function () {
      Object.keys(state.entities).forEach(function (id) {
        var row = state.entities[id];
        if (!row.selectable) return;
        row.entity.setEulerAngles(row.baseRot.x, row.baseRot.y, row.baseRot.z);
        row.entity.setPosition(row.basePos.x, row.basePos.y, row.basePos.z);
      });
      if (state.camera) {
        state.camera.setPosition(state.camHome.x, state.camHome.y, state.camHome.z);
        state.camera.lookAt(0, 0.6, 0);
      }
      state.selected = null;
      sonra();
    },
    SPAWN_SCENE: function () { sonra(); },
    ENABLE_CONTROL: function () { state.input = true; hud(String(state.balance)); sonra(); },
    TRACK_COMBO: function () { sonra(); },
    WAIT_INPUT: function () { state.input = true; },
    CHECK_SESSION: function () { sonra(); },
    CASCADE_BOOT: function () { sonra(); }
  };

  function kurSahne(manifest, urls) {
    if (!manifest) { post({ type: 'ISSUE', code: 'RUNTIME_MANIFEST_MISSING' }); return; }
    if (manifest.runtime && manifest.runtime !== 'playcanvas-engine') { post({ type: 'ISSUE', code: 'RUNTIME_VERSION_UNSUPPORTED' }); return; }
    if (manifest.runtimeVersion && manifest.runtimeVersion !== '1.73.4') { post({ type: 'ISSUE', code: 'RUNTIME_VERSION_UNSUPPORTED' }); return; }
    if (!manifest.scene || !manifest.scene.entities) { post({ type: 'ISSUE', code: 'SCENE_GRAPH_MISSING' }); return; }
    if (!manifest.gameplay || !manifest.gameplay.nodes) { post({ type: 'ISSUE', code: 'GAMEPLAY_GRAPH_MISSING' }); return; }
    if (typeof pc === 'undefined' || typeof pc.Application !== 'function') {
      post({ type: 'ISSUE', code: 'ENGINE_INIT_FAILED' });
      return;
    }
    if (state.app) { state.app.destroy(); state.app = null; }
    var canvas = document.getElementById('c');
    var app;
    try {
      var deneme = document.createElement('canvas');
      var gl = deneme.getContext('webgl2') || deneme.getContext('webgl');
      if (!gl) { post({ type: 'ISSUE', code: 'WEBGL_UNAVAILABLE' }); return; }
      app = new pc.Application(canvas, {
        mouse: new pc.Mouse(canvas),
        touch: canvas && typeof pc.TouchDevice === 'function' ? new pc.TouchDevice(canvas) : null,
        keyboard: new pc.Keyboard(window)
      });
    } catch (bootErr) {
      post({ type: 'ISSUE', code: 'ENGINE_INIT_FAILED' });
      return;
    }
    app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
    app.setCanvasResolution(pc.RESOLUTION_AUTO);
    window.addEventListener('resize', function () { if (state.app) state.app.resizeCanvas(); });
    state.app = app;
    state.entities = {};
    state.pick = [];
    state.anims = [];
    state.motes = [];
    state.urls = urls || {};
    state.manifest = manifest;
    state.balance = manifest.economy && manifest.economy.testBalance || 0;
    state.nodes = {};
    (manifest.gameplay.nodes || []).forEach(function (n) { state.nodes[n.id] = n; });
    var clear = [0.05, 0.04, 0.08];
    var camEnt = null;
    (manifest.scene.entities || []).forEach(function (row) { if (row.role === 'camera') camEnt = row; });
    if (camEnt) {
      var camComp = (camEnt.components || []).filter(function (c) { return c.kind === 'camera'; })[0];
      if (camComp && camComp.props && camComp.props.clearColor) clear = camComp.props.clearColor;
    }
    var cam = new pc.Entity('camera');
    cam.addComponent('camera', { clearColor: new pc.Color(clear[0], clear[1], clear[2]), fov: 48, nearClip: 0.1, farClip: 80 });
    var cp = camEnt ? camEnt.transform.position : [0, 2.4, 7.2];
    cam.setPosition(cp[0], cp[1], cp[2]);
    cam.lookAt(0, 0.6, 0);
    app.root.addChild(cam);
    state.camera = cam;
    state.camHome = cam.getPosition().clone();

    if (manifest.cascade) {
      try {
        dedeKur(state, app, cam, manifest, post);
      } catch (oyunHata) {
        post({ type: 'ISSUE', code: 'ENGINE_INIT_FAILED' });
        return;
      }
      app.start();
      app.on('update', kare);
      post({ type: 'READY', physics: 'dede-cascade' });
      return;
    }

    var fill = new pc.Entity('ambient');
    fill.addComponent('light', { type: 'directional', intensity: 0.45, color: new pc.Color(0.6, 0.55, 0.75), castShadows: false });
    fill.setEulerAngles(40, 25, 0);
    app.root.addChild(fill);

    (manifest.scene.entities || []).forEach(function (row) {
      if (row.role === 'camera' || row.role === 'ui') return;
      var entity = new pc.Entity(row.name || row.id);
      var t = row.transform || { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] };
      entity.setPosition(t.position[0], t.position[1], t.position[2]);
      entity.setEulerAngles(t.rotation[0], t.rotation[1], t.rotation[2]);
      entity.setLocalScale(t.scale[0], t.scale[1], t.scale[2]);
      var gameplay = null;
      var material = 'default';
      var modelAsset = null;
      (row.components || []).forEach(function (c) {
        if (c.kind === 'primitive') {
          entity.addComponent('model', { type: c.props.shape || 'box' });
          if (c.props.pendingAsset) post({ type: 'ISSUE', code: 'ASSET_PENDING' });
        }
        if (c.kind === 'material') material = c.props.preset || 'default';
        if (c.kind === 'model') modelAsset = c.props.assetId;
        if (c.kind === 'light' && c.props.lightType === 'directional') {
          entity.addComponent('light', { type: 'directional', intensity: c.props.intensity || 1, castShadows: false });
        }
        if (c.kind === 'light' && c.props.lightType === 'point') {
          var col = c.props.color || [1, 0.8, 0.4];
          entity.addComponent('light', { type: 'point', intensity: c.props.intensity || 0.3, range: c.props.range || 2, color: new pc.Color(col[0], col[1], col[2]), castShadows: false });
        }
        if (c.kind === 'gameplay') gameplay = c.props;
        if (c.kind === 'audio') state.audioPlan = c.props.assetIds || [];
      });
      if (entity.model) entity.model.material = malzeme(material);
      app.root.addChild(entity);
      var kayit = { id: row.id, entity: entity, selectable: !!(gameplay && gameplay.selectable), delta: gameplay ? gameplay.testDelta : 0, basePos: entity.getPosition().clone(), baseRot: entity.getEulerAngles().clone(), material: material };
      state.entities[row.id] = kayit;
      if (kayit.selectable) state.pick.push(row.id);
      if (modelAsset && state.urls[modelAsset]) modelYukle(modelAsset, entity, material);
    });

    for (var i = 0; i < 16; i++) {
      var mote = new pc.Entity('mote');
      mote.addComponent('model', { type: 'sphere' });
      mote.setLocalScale(0.08, 0.08, 0.08);
      mote.model.material = malzeme('gold');
      mote.enabled = false;
      app.root.addChild(mote);
      state.motes.push(mote);
    }
    sesKur();
    app.start();
    app.on('update', kare);
    if (app.mouse) app.mouse.on(pc.EVENT_MOUSEDOWN, function (e) { isaret(e.x, e.y); });
    canvas.addEventListener('pointerdown', function (e) {
      var rect = canvas.getBoundingClientRect();
      isaret(e.clientX - rect.left, e.clientY - rect.top);
    });
    if (app.touch) app.touch.on(pc.EVENT_TOUCHSTART, function (e) {
      if (!e.touches || !e.touches[0]) return;
      isaret(e.touches[0].x, e.touches[0].y);
    });
    git(manifest.gameplay.entry);
    post({ type: 'READY', physics: 'kinematic-shell' });
  }

  function modelYukle(assetId, parent, preset) {
    var url = state.urls[assetId];
    if (!hostOk(url)) { post({ type: 'ISSUE', code: 'NETWORK_DENIED' }); return; }
    state.app.assets.loadFromUrl(url, 'container', function (err, asset) {
      if (err || !asset || !asset.resource) { post({ type: 'ISSUE', code: 'ASSET_DOWNLOAD_FAILED' }); return; }
      var inst = asset.resource.instantiateRenderEntity();
      inst.setLocalScale(1, 1, 1);
      parent.addChild(inst);
      boya(inst, preset);
    });
  }
  function sesKur() {
    var ids = state.audioPlan || [];
    if (!ids.length) return;
    var bus = new pc.Entity('audio');
    bus.addComponent('sound');
    state.app.root.addChild(bus);
    state.audio = bus;
    var es = { chest_open: 'open', open: 'open', reward: 'good', positive: 'good', negative: 'bad', negative_result: 'bad' };
    ids.forEach(function (id) {
      var url = state.urls[id];
      if (!url || !hostOk(url)) return;
      var slot = 'open';
      Object.keys(es).forEach(function (k) { if (id.indexOf(k) >= 0) slot = es[k]; });
      state.app.assets.loadFromUrl(url, 'audio', function (err, asset) {
        if (err || !asset) { post({ type: 'ISSUE', code: 'AUDIO_LOAD' }); return; }
        bus.sound.addSlot(slot, { asset: asset, overlap: true, volume: 0.9 });
      });
    });
  }
  function enYakin(x, y, ids) {
    var liste = ids || state.pick;
    var cam = state.camera.camera;
    var near = new pc.Vec3();
    var far = new pc.Vec3();
    cam.screenToWorld(x, y, cam.nearClip, near);
    cam.screenToWorld(x, y, cam.farClip, far);
    var dir = far.clone().sub(near).normalize();
    var best = null;
    var bestD = 999;
    for (var i = 0; i < liste.length; i++) {
      var row = state.entities[liste[i]];
      if (!row) continue;
      var p = row.entity.getPosition();
      var t = p.clone().sub(near).dot(dir);
      if (t < 0) continue;
      var closest = near.clone().add(dir.clone().scale(t));
      var d = closest.distance(p);
      if (d < bestD) { bestD = d; best = row; }
    }
    return { row: best, d: bestD };
  }
  function isaret(x, y) {
    if (!state.camera || !state.camera.camera) return;
    if (state.paused) {
      var duzenle = enYakin(x, y, Object.keys(state.entities));
      if (!duzenle.row || duzenle.d > 1.8) return;
      post({ type: 'SELECT', id: duzenle.row.id });
      return;
    }
    if (!state.input || !state.waitPick) return;
    var canvas = document.getElementById('c');
    var sx = canvas.clientWidth ? canvas.width / canvas.clientWidth : 1;
    var sy = canvas.clientHeight ? canvas.height / canvas.clientHeight : 1;
    var denemeler = [
      enYakin(x, y),
      enYakin(x * sx, y * sy),
      enYakin(x, canvas.clientHeight - y),
      enYakin(x * sx, canvas.height - (y * sy))
    ];
    var secim = denemeler[0];
    for (var i = 1; i < denemeler.length; i++) if (denemeler[i].d < secim.d) secim = denemeler[i];
    if (!secim.row || secim.d > 1.15) return;
    state.selected = secim.row.entity;
    state.selectedDelta = Number(secim.row.delta) || 0;
    sonra();
  }
  function kare(dt) {
    if (state.paused) dt = 0;
    state.frames += 1;
    state.acc += dt || 0.016;
    if (state.acc >= 0.5) {
      var draw = state.app && state.app.stats && state.app.stats.drawCalls ? state.app.stats.drawCalls.total : null;
      post({ type: 'STATS', fps: Math.round(state.frames / state.acc), frameMs: Math.round((state.acc / state.frames) * 1000), drawCalls: draw });
      state.frames = 0;
      state.acc = 0;
    }
    if (state.paused) return;
    if (state.dede) {
      state.dede.tick(dt);
      return;
    }
    var i;
    for (i = state.anims.length - 1; i >= 0; i--) {
      var a = state.anims[i];
      a.t += dt;
      var k = Math.min(1, a.t / a.dur);
      a.step(k, a);
      if (k >= 1) { state.anims.splice(i, 1); if (a.then) a.then(); }
    }
    if (state.wait > 0) {
      state.wait -= dt;
      if (state.wait <= 0) sonra();
    }
    var t = state.clock += dt;
    state.pick.forEach(function (id) {
      var row = state.entities[id];
      if (!row || !row.entity.light) return;
      row.entity.light.intensity = 0.25 + Math.sin(t * 2 + row.basePos.x) * 0.12;
      row.entity.setPosition(row.basePos.x, row.basePos.y + Math.sin(t * 1.4 + row.basePos.x) * 0.04, row.basePos.z);
    });
    for (i = 0; i < state.motes.length; i++) {
      var m = state.motes[i];
      if (!m.enabled || !m._life) continue;
      m._life -= dt;
      m.translate(m._vel.x * dt, m._vel.y * dt, m._vel.z * dt);
      if (m._life <= 0) m.enabled = false;
    }
  }
  function mesaj(raw) {
    var data = raw;
    if (typeof raw === 'string') {
      try { data = JSON.parse(raw); } catch (e) { return; }
    }
    if (!data || typeof data !== 'object') return;
    if (data.type === 'SAFE') {
      state.safeTop = Number(data.top) || 16;
      state.safeBottom = Number(data.bottom) || 16;
      var el = document.getElementById('hud');
      if (el) {
        el.style.top = state.safeTop + 'px';
        el.style.left = (Number(data.left) || 16) + 'px';
      }
      if (state.dede && state.dede.safe) state.dede.safe();
      return;
    }
    if (data.type === 'RESIZE' && state.app && state.app.resizeCanvas) {
      state.app.resizeCanvas();
      return;
    }
    if (data.type === 'LOAD' && data.manifest && data.manifest.runtime === 'playcanvas-engine') {
      state.hosts = {};
      (data.allowedHosts || []).forEach(function (h) { state.hosts[h] = true; });
      state.paused = false;
      kurSahne(data.manifest, data.urls || {});
    }
    if (data.type === 'PAUSE') state.paused = true;
    if (data.type === 'RESUME') state.paused = false;
    if (data.type === 'RESTART' && state.manifest) kurSahne(state.manifest, state.urls);
  }
  window.addEventListener('message', function (e) { mesaj(e.data); });
  document.addEventListener('message', function (e) { mesaj(e.data); });
  post({ type: 'BOOTED' });
})();
`;
