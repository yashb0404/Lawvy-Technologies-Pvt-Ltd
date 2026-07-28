/* Lawvy hero — WebGL "knowledge lattice"
   A wireframe icosahedral core with glowing vertex nodes, wrapped in a drifting
   particle field. Follows the pointer, drifts away as you scroll past the hero. */

import * as THREE from "three";

const canvas = document.getElementById("scene");
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (canvas && !reduced) {
  init(canvas);
}

function init(canvas) {
  const GOLD = 0xc6a96b;
  const GOLD_LITE = 0xebd9ab;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (err) {
    return; // no WebGL — the CSS gradient background stands on its own
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 100);
  camera.position.set(0, 0, 15);

  const world = new THREE.Group();
  scene.add(world);

  /* ── the lattice core ─────────────────────── */
  const coreGeo = new THREE.IcosahedronGeometry(4.4, 2);

  const wire = new THREE.LineSegments(
    new THREE.WireframeGeometry(coreGeo),
    new THREE.LineBasicMaterial({ color: GOLD, transparent: true, opacity: 0.22 })
  );
  world.add(wire);

  const nodes = new THREE.Points(
    coreGeo,
    new THREE.PointsMaterial({
      color: GOLD_LITE,
      size: 0.075,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  world.add(nodes);

  // an inner shell, counter-rotating, to give the core depth
  const inner = new THREE.LineSegments(
    new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(2.6, 1)),
    new THREE.LineBasicMaterial({ color: 0x5b7fbf, transparent: true, opacity: 0.3 })
  );
  world.add(inner);

  /* ── ambient particle field ───────────────── */
  const COUNT = 900;
  const pos = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    // shell distribution so particles never sit inside the core
    const r = 7 + Math.random() * 16;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.6;
    pos[i * 3 + 2] = r * Math.cos(phi);
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));

  const dust = new THREE.Points(
    dustGeo,
    new THREE.PointsMaterial({
      color: 0x9fb2d6,
      size: 0.055,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  scene.add(dust);

  /* ── pointer + scroll state ───────────────── */
  const pointer = { x: 0, y: 0 };
  const eased = { x: 0, y: 0 };
  let scrolled = 0;
  let visible = true;

  window.addEventListener("pointermove", (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  window.addEventListener("scroll", () => {
    scrolled = window.scrollY / window.innerHeight;
    visible = scrolled < 1.15;
  }, { passive: true });

  // Reconcile the drawing buffer with the display size from inside the render
  // loop. A one-shot call would race first layout, and resize/observer events
  // can be throttled — checking each frame is cheap and never goes stale.
  function syncSize() {
    const dpr = Math.min(window.devicePixelRatio, 2);
    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);
    if (!w || !h || (canvas.width === w && canvas.height === h)) return;

    renderer.setPixelRatio(dpr);
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    // pull the camera back on narrow screens so the core still fits
    camera.position.z = canvas.clientWidth < 760 ? 20 : 15;
    camera.updateProjectionMatrix();
  }

  const clock = new THREE.Clock();

  renderer.setAnimationLoop(() => {
    if (!visible) return; // stop drawing once the hero is off screen

    syncSize();
    const t = clock.getElapsedTime();

    eased.x += (pointer.x - eased.x) * 0.045;
    eased.y += (pointer.y - eased.y) * 0.045;

    world.rotation.y = t * 0.075 + eased.x * 0.45;
    world.rotation.x = Math.sin(t * 0.22) * 0.09 + eased.y * 0.3;
    world.position.y = Math.sin(t * 0.55) * 0.22 - scrolled * 3.2;

    inner.rotation.y = -t * 0.19;
    inner.rotation.z = t * 0.11;

    dust.rotation.y = t * 0.018 + eased.x * 0.12;
    dust.rotation.x = eased.y * 0.08;

    // breathe the wire opacity so the lattice feels alive
    wire.material.opacity = 0.18 + Math.sin(t * 0.9) * 0.05;

    renderer.render(scene, camera);
  });
}
