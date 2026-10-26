// XRXES Virtual Showroom: a browser-first 3D boutique. Products come from a merchant catalog (products.json).
// Desktop: drag to look around, scroll to zoom, click a product. Phone: swipe and tap. Headsets: Enter VR where WebXR is supported.
// Every product is also listed in a plain list view, for people who prefer or need it. Only anonymous view counts are sent.
import * as THREE from '../vendor/three.module.min.js';
import { OrbitControls } from '../vendor/OrbitControls.js';
import { VRButton } from '../vendor/VRButton.js';

const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const money = c => '$' + (c / 100).toFixed(2);
const CAT = await (await fetch('products.json')).json();
const P = CAT.products;
const link = p => `${CAT.base}/p/${p.slug}/?ref=${CAT.ref}`;
const send = (type, slug) => { try { navigator.sendBeacon('/api/event', new Blob([JSON.stringify({ type, slug })], { type: 'application/json' })); } catch (e) {} };

// ---------------------------------------------------------------- scene
const canvas = $('#scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(1.75, devicePixelRatio)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.xr.enabled = true;
const scene = new THREE.Scene(); scene.background = new THREE.Color('#2a1d22'); scene.fog = new THREE.Fog('#2a1d22', 18, 34);
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100); camera.position.set(0, 2.1, 9.5);
const controls = new OrbitControls(camera, canvas); controls.target.set(0, 1.3, 0); controls.enableDamping = true; controls.minDistance = 2.2; controls.maxDistance = 12;
controls.maxPolarAngle = Math.PI * 0.53; controls.minPolarAngle = Math.PI * 0.25; controls.enablePan = false;

function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
// floor: warm parquet
const floorTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = 'hsl(18, 28%, 36%)'; g.fillRect(0, 0, w, h); for (let y = 0; y < 8; y++) for (let x = -1; x < 4; x++) { const l = 32 + (((x + 4) * 7 + y * 3) % 5) * 3, px = x * 128 + (y % 2) * 64; g.fillStyle = `hsl(18, 28%, ${l}%)`; g.fillRect(px, y * 64, 128, 64); g.strokeStyle = 'rgba(0,0,0,.25)'; g.strokeRect(px + .5, y * 64 + .5, 127, 63); } });
floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(6, 6);
const floor = new THREE.Mesh(new THREE.CircleGeometry(16, 64), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.55, metalness: 0.05 }));
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
// curved boutique wall with arches
const wallMat = new THREE.MeshStandardMaterial({ color: '#d9b3b5', roughness: 0.9, side: THREE.BackSide });
const wall = new THREE.Mesh(new THREE.CylinderGeometry(11, 11, 6, 72, 1, true, Math.PI * 0.15, Math.PI * 1.7), wallMat); wall.position.y = 3; wall.receiveShadow = true; scene.add(wall);
const archMat = new THREE.MeshStandardMaterial({ color: '#f3e3e1', roughness: 0.8 });
for (let i = 0; i < 9; i++) {
  const a = Math.PI * 0.25 + i * (Math.PI * 1.5 / 8), arch = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.06, 8, 40, Math.PI), archMat);
  arch.position.set(Math.sin(a) * -10.8, 3.6, Math.cos(a) * -10.8); arch.lookAt(0, 3.6, 0); scene.add(arch);
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.6, 8), archMat); col.position.set(Math.sin(a) * -10.8 + Math.cos(a) * 1.1, 1.8, Math.cos(a) * -10.8 - Math.sin(a) * 1.1); scene.add(col);
  const col2 = col.clone(); col2.position.set(Math.sin(a) * -10.8 - Math.cos(a) * 1.1, 1.8, Math.cos(a) * -10.8 + Math.sin(a) * 1.1); scene.add(col2);
}
// sign
const sign = new THREE.Mesh(new THREE.PlaneGeometry(5, 1.25), new THREE.MeshBasicMaterial({ transparent: true, map: canvasTex(1024, 256, (g, w, h) => {
  g.fillStyle = 'rgba(0,0,0,0)'; g.fillRect(0, 0, w, h); g.textAlign = 'center'; g.fillStyle = '#fff6f3'; g.font = '400 120px Didot, "Bodoni 72", Georgia, serif'; g.fillText('PantiesOn', w / 2, 140);
  g.font = '600 34px system-ui, sans-serif'; g.fillStyle = '#e8a3b6'; g.fillText('VIRTUAL BOUTIQUE  ·  POWERED BY XRXES', w / 2, 210); }) }));
sign.position.set(0, 4.6, -10.6); scene.add(sign);
// light
scene.add(new THREE.HemisphereLight('#ffe9e4', '#3b2a2f', 0.9));
const key = new THREE.DirectionalLight('#fff3ea', 1.2); key.position.set(4, 9, 6); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); Object.assign(key.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10 }); scene.add(key);

// ---------------------------------------------------------------- mannequins and products
const formMat = new THREE.MeshStandardMaterial({ color: '#efe4dc', roughness: 0.6 });
const goldMat = new THREE.MeshStandardMaterial({ color: '#c8a46a', roughness: 0.35, metalness: 0.8 });
const torsoProfile = [[0, 0], [0.22, 0], [0.26, 0.05], [0.31, 0.2], [0.28, 0.36], [0.24, 0.5], [0.27, 0.66], [0.31, 0.8], [0.3, 0.92], [0.22, 1.02], [0.09, 1.08], [0.07, 1.16], [0, 1.18]].map(([x, y]) => new THREE.Vector2(x, y));
function band(from, to, color, open) { // a garment band on the form between two heights (0..1.18), slightly larger than the form
  const pts = torsoProfile.filter(p => p.y >= from - 0.001 && p.y <= to + 0.001).map(p => new THREE.Vector2(p.x * 1.035 + 0.004, p.y));
  if (pts.length < 2) return null;
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.42, metalness: 0.04, sheen: 1, side: THREE.DoubleSide });
  return new THREE.Mesh(new THREE.LatheGeometry(pts, 48, open ? 0.2 : 0, open ? Math.PI * 2 - 0.4 : Math.PI * 2), m);
}
function display(p) {
  const g = new THREE.Group(), c = new THREE.Color(p.swatch);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.62, 0.5, 40), new THREE.MeshStandardMaterial({ color: '#f6eeea', roughness: 0.5 })); base.position.y = 0.25; base.castShadow = base.receiveShadow = true; g.add(base);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.015, 8, 48), goldMat); rim.rotation.x = Math.PI / 2; rim.position.y = 0.5; g.add(rim);
  if (p.category === 'Gift Sets') {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.32, 0.5), new THREE.MeshStandardMaterial({ color: c, roughness: 0.5 })); box.position.y = 0.66; box.castShadow = true; g.add(box);
    const rib = new THREE.MeshStandardMaterial({ color: '#8e3553', roughness: 0.3 });
    const r1 = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.33, 0.06), rib); r1.position.y = 0.66; g.add(r1); const r2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.33, 0.52), rib); r2.position.y = 0.66; g.add(r2);
    const bow = new THREE.Mesh(new THREE.TorusKnotGeometry(0.07, 0.022, 48, 6, 2, 3), rib); bow.position.y = 0.86; g.add(bow); g.userData.h = 1.1;
    return g;
  }
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.55, 10), goldMat); pole.position.y = 0.77; g.add(pole);
  const torso = new THREE.Group(); torso.position.y = 1.02; g.add(torso);
  const form = new THREE.Mesh(new THREE.LatheGeometry(torsoProfile, 48), formMat); form.castShadow = true; torso.add(form);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), goldMat); cap.position.y = 1.2; torso.add(cap);
  const k = p.category, t = p.title.toLowerCase();
  const parts = k === 'Bras' ? [[0.62, 0.86]] : k === 'Panties' ? [[0.0, 0.26]] : k === 'Bodysuits' ? [[0.0, 0.9]] : k === 'Accessories' ? [[0.22, 0.38]] : /robe/.test(t) ? [[0.0, 1.0]] : /pajama/.test(t) ? [[0.55, 0.9], [0.0, 0.3]] : [[0.05, 0.9]];
  parts.forEach(([a, b]) => { const m = band(a, b, c, /robe/.test(t)); if (m) { m.castShadow = true; torso.add(m); } });
  if (k === 'Bras' || /slip|bodysuit|pajama/.test(t)) { // straps
    const sm = new THREE.MeshStandardMaterial({ color: c, roughness: 0.4 });
    [-1, 1].forEach(s => { const st = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.008, 6, 24, Math.PI), sm); st.position.set(s * 0.12, 0.88, 0); st.rotation.set(0, Math.PI / 2, 0); torso.add(st); });
  }
  g.userData.h = 2.35; g.userData.torso = torso; return g;
}
const items = [], N = P.length;
P.forEach((p, i) => {
  const a = (i / N) * Math.PI * 2 + Math.PI / N, r = i % 2 ? 6.4 : 4.6;
  const g = display(p); g.position.set(Math.sin(a) * r, 0, Math.cos(a) * r - 1); g.lookAt(0, 0, -1); g.rotateY(Math.PI); g.userData.p = p; g.userData.i = i; scene.add(g);
  const spot = new THREE.SpotLight('#fff1e8', 9, 9, 0.38, 0.6, 1.4); spot.position.set(g.position.x * 0.92, 5.6, g.position.z * 0.92); spot.target = g; spot.castShadow = false; scene.add(spot);
  // hotspot: a soft ring with a number
  const hot = new THREE.Mesh(new THREE.RingGeometry(0.11, 0.15, 32), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthTest: false }));
  hot.position.set(g.position.x, g.userData.h + 0.15, g.position.z); hot.renderOrder = 10; hot.userData.ring = true; scene.add(hot); g.userData.hot = hot;
  items.push(g);
});

// ---------------------------------------------------------------- picking, card, tour
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(); let down = null, current = -1, fly = null;
function pick(x, y) { const r = canvas.getBoundingClientRect(); ptr.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1); ray.setFromCamera(ptr, camera); const hits = ray.intersectObjects(items, true); if (!hits.length) return -1; let o = hits[0].object; while (o && o.userData.i === undefined) o = o.parent; return o ? o.userData.i : -1; }
canvas.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
canvas.addEventListener('pointerup', e => { if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return; const i = pick(e.clientX, e.clientY); if (i > -1) focus(i); });
canvas.addEventListener('pointermove', e => { canvas.style.cursor = pick(e.clientX, e.clientY) > -1 ? 'pointer' : 'grab'; });
function focus(i) {
  current = (i + N) % N; const g = items[current], p = g.userData.p;
  const to = new THREE.Vector3(g.position.x * 0.55, 1.75, g.position.z * 0.55 + 0.6), tgt = new THREE.Vector3(g.position.x, 1.4, g.position.z);
  fly = { t: 0, from: camera.position.clone(), to, tf: controls.target.clone(), tt: tgt };
  $('#card').hidden = false;
  $('#card').innerHTML = `<button class="x" type="button" aria-label="Close">×</button><p class="k">${esc(p.brand)} · ${esc(p.category)}</p><h2>${esc(p.title)}</h2><p class="pr">${money(p.price)}</p><p>${esc(p.description)}</p>`
    + `<p class="sz"><b>Sizes</b> ${p.sizes.map(esc).join(' · ')}</p><p class="sz"><b>Colors</b> ${p.colors.map(esc).join(' · ')}</p>`
    + `<p class="acts"><a class="btn" href="${esc(link(p))}" rel="noopener" target="_blank">View and buy at ${esc(CAT.store)}</a></p><p class="nav"><button type="button" data-d="-1">‹ Previous</button><span>${current + 1} / ${N}</span><button type="button" data-d="1">Next ›</button></p>`;
  $('#card .x').onclick = () => { $('#card').hidden = true; current = -1; };
  document.querySelectorAll('#card [data-d]').forEach(b => b.onclick = () => focus(current + +b.dataset.d));
  send('view', p.slug);
}
$('#tour').onclick = () => focus(current < 0 ? 0 : current + 1);
document.addEventListener('keydown', e => { if ($('#list').hidden === false) return; if (e.key === 'ArrowRight') focus(current + 1); if (e.key === 'ArrowLeft') focus(current - 1); if (e.key === 'Escape') { $('#card').hidden = true; current = -1; } });

// plain list view: every product without 3D
$('#listbtn').onclick = () => { const l = $('#list'); l.hidden = !l.hidden; $('#listbtn').setAttribute('aria-expanded', String(!l.hidden)); $('#listbtn').textContent = l.hidden ? 'List view' : '3D view'; if (!l.hidden) l.querySelector('a').focus(); };
$('#list ul').innerHTML = P.map(p => `<li><span class="sw" style="background:${esc(p.swatch)}"></span><span><b>${esc(p.title)}</b><small>${esc(p.brand)} · ${esc(p.category)} · ${money(p.price)}</small><small>${esc(p.description)}</small></span><a href="${esc(link(p))}" rel="noopener" target="_blank">View</a></li>`).join('');

// headsets: enter VR where the browser supports it; a controller's trigger selects a product
if (navigator.xr) navigator.xr.isSessionSupported('immersive-vr').then(ok => { if (!ok) return; const b = VRButton.createButton(renderer); b.id = 'vrbtn'; b.removeAttribute('style'); $('#bar').appendChild(b); }).catch(() => {});
const ctrl = renderer.xr.getController(0); scene.add(ctrl);
ctrl.addEventListener('select', () => { const m = new THREE.Matrix4().extractRotation(ctrl.matrixWorld); ray.ray.origin.setFromMatrixPosition(ctrl.matrixWorld); ray.ray.direction.set(0, 0, -1).applyMatrix4(m); const hits = ray.intersectObjects(items, true); if (hits.length) { let o = hits[0].object; while (o && o.userData.i === undefined) o = o.parent; if (o) { showVrLabel(o); send('view-vr', o.userData.p.slug); } } });
let vrLabel = null;
function showVrLabel(g) {
  if (vrLabel) scene.remove(vrLabel); const p = g.userData.p;
  vrLabel = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.6), new THREE.MeshBasicMaterial({ transparent: true, map: canvasTex(800, 300, (c, w, h) => { c.fillStyle = 'rgba(36,26,31,.92)'; c.fillRect(0, 0, w, h); c.fillStyle = '#e8a3b6'; c.font = '600 30px system-ui'; c.fillText(p.brand.toUpperCase(), 40, 70); c.fillStyle = '#fff'; c.font = '400 54px Georgia'; c.fillText(p.title.slice(0, 26), 40, 150); c.font = '600 44px system-ui'; c.fillText(money(p.price), 40, 240); }) }));
  vrLabel.position.set(g.position.x, g.userData.h + 0.6, g.position.z); vrLabel.lookAt(camera.position); scene.add(vrLabel);
}

// ---------------------------------------------------------------- loop
function size() { const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
addEventListener('resize', size); size();
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(0.05, clock.getDelta()), t = clock.elapsedTime;
  if (fly) { fly.t = Math.min(1, fly.t + dt * 1.4); const e = fly.t < 0.5 ? 2 * fly.t * fly.t : 1 - Math.pow(-2 * fly.t + 2, 2) / 2; camera.position.lerpVectors(fly.from, fly.to, e); controls.target.lerpVectors(fly.tf, fly.tt, e); if (fly.t >= 1) fly = null; }
  items.forEach((g, i) => { const h = g.userData.hot; h.lookAt(camera.position); const s = 1 + Math.sin(t * 2.4 + i) * 0.12 + (i === current ? 0.35 : 0); h.scale.setScalar(s); h.material.color.set(i === current ? '#e8a3b6' : '#ffffff'); if (g.userData.torso) g.userData.torso.rotation.y = Math.sin(t * 0.4 + i) * 0.25; });
  if (!renderer.xr.isPresenting) controls.update();
  renderer.render(scene, camera);
});
$('#loading').hidden = true; send('open', '');
