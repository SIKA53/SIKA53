import * as THREE from 'https://unpkg.com/three@0.150.1/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.150.1/examples/jsm/controls/OrbitControls.js';
import * as CANNON from 'https://cdn.skypack.dev/cannon-es';

const canvas = document.getElementById('lotto-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 5, 8);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// Lighting
const ambient = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambient);
const dir = new THREE.DirectionalLight(0xffffff, 0.5);
dir.position.set(5, 10, 7);
scene.add(dir);

// Physics world
const world = new CANNON.World({ gravity: new CANNON.Vec3(0, 0, 0) });
world.broadphase = new CANNON.NaiveBroadphase();

const BALL_RADIUS = 0.3;
const BALL_COUNT = 45;
const DRAW_COUNT = 6;
const MACHINE_RADIUS = 3;

// Create lotto machine sphere (visual only)
const sphereGeo = new THREE.SphereGeometry(MACHINE_RADIUS, 32, 32);
const sphereMat = new THREE.MeshPhongMaterial({ color: 0x222222, transparent: true, opacity: 0.2, wireframe: true });
const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
scene.add(sphereMesh);

// Utility to create ball texture with number
function createNumberTexture(number) {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(size/2, size/2, size/2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000000';
  ctx.font = `${size * 0.6}px bold sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(number.toString(), size/2, size/2);
  return new THREE.CanvasTexture(canvas);
}

const balls = [];
for (let i = 1; i <= BALL_COUNT; i++) {
  const tex = createNumberTexture(i);
  const mat = new THREE.MeshPhongMaterial({ map: tex });
  const geo = new THREE.SphereGeometry(BALL_RADIUS, 32, 32);
  const mesh = new THREE.Mesh(geo, mat);
  // random initial position
  mesh.position.set(
    (Math.random() - 0.5) * (MACHINE_RADIUS - BALL_RADIUS) * 1.5,
    (Math.random() - 0.5) * (MACHINE_RADIUS - BALL_RADIUS) * 1.5,
    (Math.random() - 0.5) * (MACHINE_RADIUS - BALL_RADIUS) * 1.5
  );
  scene.add(mesh);

  const body = new CANNON.Body({ mass: 1, shape: new CANNON.Sphere(BALL_RADIUS) });
  body.position.copy(mesh.position);
  // random velocity
  body.velocity.set(
    (Math.random() - 0.5) * 5,
    (Math.random() - 0.5) * 5,
    (Math.random() - 0.5) * 5
  );
  world.addBody(body);

  balls.push({ mesh, body, number: i, drawn: false, target: null });
}

function keepInside(body) {
  const pos = body.position;
  const dist = pos.length();
  if (dist > MACHINE_RADIUS - BALL_RADIUS) {
    pos.scale((MACHINE_RADIUS - BALL_RADIUS) / dist, pos);
    body.velocity.negate(body.velocity);
  }
}

// Drawing logic
let drawing = false;
let drawnIndex = 0;
const resultDiv = document.getElementById('results');
const drawBtn = document.getElementById('drawBtn');
const resetBtn = document.getElementById('resetBtn');
const drawPositions = [];
for (let i = 0; i < DRAW_COUNT; i++) {
  drawPositions.push(new THREE.Vector3(-2.5 + i * 1.0, -1.5, 4));
}

function pickBall() {
  const remaining = balls.filter(b => !b.drawn);
  if (!remaining.length) return null;
  const idx = Math.floor(Math.random() * remaining.length);
  return remaining[idx];
}

function drawNext() {
  if (drawnIndex >= DRAW_COUNT) {
    drawing = false;
    drawBtn.style.display = 'none';
    resetBtn.style.display = 'inline-block';
    return;
  }
  const ball = pickBall();
  if (!ball) return;
  ball.drawn = true;
  ball.body.type = CANNON.Body.KINEMATIC;
  ball.target = drawPositions[drawnIndex];
  resultDiv.textContent += `${ball.number} `;
  drawnIndex++;
  setTimeout(drawNext, 2200); // wait before next draw
}

drawBtn.addEventListener('click', () => {
  if (drawing) return;
  drawing = true;
  resultDiv.textContent = '';
  drawNext();
});

resetBtn.addEventListener('click', resetMachine);

function resetMachine() {
  drawnIndex = 0;
  drawing = false;
  resultDiv.textContent = '';
  drawBtn.style.display = 'inline-block';
  resetBtn.style.display = 'none';
  balls.forEach(b => {
    b.drawn = false;
    b.target = null;
    b.body.type = CANNON.Body.DYNAMIC;
    b.body.position.set(
      (Math.random() - 0.5) * (MACHINE_RADIUS - BALL_RADIUS) * 1.5,
      (Math.random() - 0.5) * (MACHINE_RADIUS - BALL_RADIUS) * 1.5,
      (Math.random() - 0.5) * (MACHINE_RADIUS - BALL_RADIUS) * 1.5
    );
    b.body.velocity.set(
      (Math.random() - 0.5) * 5,
      (Math.random() - 0.5) * 5,
      (Math.random() - 0.5) * 5
    );
  });
}

const clock = new THREE.Clock();
function animate() {
  const dt = clock.getDelta();
  world.step(1/60, dt);

  balls.forEach(b => {
    if (!b.drawn) {
      keepInside(b.body);
      b.mesh.position.copy(b.body.position);
    } else if (b.target) {
      // move towards target
      b.mesh.position.lerp(b.target, 0.05);
    }
  });

  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();
