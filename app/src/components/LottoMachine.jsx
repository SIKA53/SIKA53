import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Body, Plane, Sphere, Vec3, World } from 'cannon-es';
import { gsap } from 'gsap';

const BALL_COUNT = 45;
const BALL_RADIUS = 0.45;
const DRAW_INTERVAL = 2.3;
const SLOT_POSITIONS = Array.from({ length: 6 }).map((_, index) =>
  new THREE.Vector3(-5 + index * 2, 1.4, 0)
);

const CAMERA_POSES = {
  idle: {
    landscape: {
      position: { x: 10, y: 12, z: 22 },
      target: { x: 0, y: 4.5, z: 0 }
    },
    portrait: {
      position: { x: 8, y: 13, z: 26 },
      target: { x: 0, y: 5.2, z: 0 }
    }
  },
  draw: {
    landscape: {
      position: { x: 8, y: 6.5, z: 11 },
      target: { x: 2.6, y: 3.8, z: 0 }
    },
    portrait: {
      position: { x: 6.5, y: 7.2, z: 12.5 },
      target: { x: 2.3, y: 4, z: 0.2 }
    }
  },
  reveal: {
    landscape: {
      position: { x: 0, y: 6.5, z: 16 },
      target: { x: 0, y: 2.2, z: 0 }
    },
    portrait: {
      position: { x: 0, y: 7.5, z: 18.5 },
      target: { x: 0, y: 2.4, z: 0 }
    }
  }
};

function createNumberTexture(number) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#fdfdff');
  gradient.addColorStop(1, '#d5ddff');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = '#14247a';
  ctx.font = `${size * 0.55}px "Poppins", "Segoe UI", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(number), size / 2, size / 2 + size * 0.04);

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 16;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function sampleBalls(balls, count) {
  const available = balls.filter((ball) => !ball.drawn);
  const shuffled = available
    .map((item) => ({ item, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ item }) => item);
  return shuffled.slice(0, count);
}

function getCameraPose(key, aspect) {
  const orientation = aspect < 1 ? 'portrait' : 'landscape';
  const pose = CAMERA_POSES[key] ?? CAMERA_POSES.idle;
  return pose[orientation] ?? pose.landscape;
}

const LottoMachine = forwardRef(function LottoMachine(_, ref) {
  const mountRef = useRef(null);
  const machineRef = useRef({});
  const animationRef = useRef();
  const drawTimelineRef = useRef();
  const cameraPoseRef = useRef('idle');
  const drawStateRef = useRef({
    isDrawing: false,
    drawnNumbers: [],
    callbacks: null
  });

  useEffect(() => {
    const container = mountRef.current;
    const width = container.clientWidth || container.offsetWidth || 640;
    const height = container.clientHeight || container.offsetHeight || 480;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#050712');
    scene.fog = new THREE.Fog('#050712', 60, 120);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 200);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.6;
    controls.maxPolarAngle = Math.PI / 2.2;
    controls.enablePan = false;
    controls.minDistance = 10;
    controls.maxDistance = 34;
    controls.zoomSpeed = 0.6;
    controls.target.set(0, 4.5, 0);

    const getContainerSize = () => {
      const bounds = container.getBoundingClientRect();
      const nextWidth = Math.max(bounds.width || width, 1);
      const nextHeight = Math.max(bounds.height || height, 1);
      return {
        width: nextWidth,
        height: nextHeight,
        aspect: nextWidth / nextHeight
      };
    };

    const setCameraPose = (
      poseKey,
      { animated = true, duration = 1.2, ease = 'power2.inOut' } = {}
    ) => {
      cameraPoseRef.current = poseKey;
      const { aspect } = getContainerSize();
      const { position, target } = getCameraPose(poseKey, aspect);

      if (!animated) {
        gsap.killTweensOf(camera.position);
        gsap.killTweensOf(controls.target);
        camera.position.set(position.x, position.y, position.z);
        controls.target.set(target.x, target.y, target.z);
        controls.update();
        return;
      }

      gsap.to(camera.position, {
        duration,
        x: position.x,
        y: position.y,
        z: position.z,
        ease
      });

      gsap.to(controls.target, {
        duration,
        x: target.x,
        y: target.y,
        z: target.z,
        ease,
        onUpdate: () => controls.update(),
        onComplete: () => controls.update()
      });
    };

    setCameraPose('idle', { animated: false });

    const world = new World({ gravity: new Vec3(0, -9.82, 0) });
    world.allowSleep = true;
    world.solver.iterations = 40;
    world.defaultContactMaterial.restitution = 0.75;
    world.defaultContactMaterial.friction = 0.05;

    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#6f86ff'),
      transparent: true,
      opacity: 0.16,
      roughness: 0,
      transmission: 0.82,
      thickness: 0.35,
      side: THREE.DoubleSide
    });

    const ambient = new THREE.AmbientLight(0x6c7bff, 0.6);
    scene.add(ambient);

    const keyLight = new THREE.SpotLight(0xffffff, 1.4, 90, Math.PI / 6, 0.3, 1);
    keyLight.position.set(4, 22, 14);
    keyLight.target.position.set(0, 4, 0);
    scene.add(keyLight);
    scene.add(keyLight.target);

    const fillLight = new THREE.PointLight(0x3edcff, 0.8, 70);
    fillLight.position.set(-12, 7, -10);
    scene.add(fillLight);

    const floorGeometry = new THREE.CircleGeometry(12, 64);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x0a0d25,
      roughness: 0.8,
      metalness: 0.2
    });
    const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -0.01;
    scene.add(floorMesh);

    const chamber = new THREE.Mesh(
      new THREE.SphereGeometry(6, 48, 48),
      glassMaterial
    );
    chamber.position.set(0, 4.5, 0);
    scene.add(chamber);

    const chute = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.1, 6, 32, 1, true),
      glassMaterial.clone()
    );
    chute.rotation.z = Math.PI / 2;
    chute.position.set(3.8, 3.5, 0);
    scene.add(chute);

    const platform = new THREE.Mesh(
      new THREE.BoxGeometry(16, 1.2, 6),
      new THREE.MeshStandardMaterial({
        color: 0x090b1b,
        roughness: 0.4,
        metalness: 0.5
      })
    );
    platform.position.set(0, 0.5, 0);
    scene.add(platform);

    const slotBase = new THREE.Mesh(
      new THREE.BoxGeometry(14, 0.6, 3.5),
      new THREE.MeshStandardMaterial({
        color: 0x121633,
        roughness: 0.3,
        metalness: 0.6,
        emissive: 0x15205c,
        emissiveIntensity: 0.2
      })
    );
    slotBase.position.set(0, 0.95, 0);
    scene.add(slotBase);

    const slotLights = new THREE.PointLight(0x6fa4ff, 0.7, 18);
    slotLights.position.set(0, 2.5, 2.5);
    scene.add(slotLights);

    const chamberMaterial = new THREE.MeshStandardMaterial({
      color: 0x0b1029,
      metalness: 0.85,
      roughness: 0.4,
      envMapIntensity: 1.2
    });

    const support = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 0.6, 8, 16),
      chamberMaterial
    );
    support.position.set(-3.8, 4.5, 0);
    support.rotation.z = Math.PI / 2;
    scene.add(support);

    // Physics bounds
    const floorBody = new Body({ mass: 0, shape: new Plane() });
    floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    world.addBody(floorBody);

    const roofBody = new Body({ mass: 0, shape: new Plane() });
    roofBody.quaternion.setFromEuler(Math.PI / 2, 0, 0);
    roofBody.position.set(0, 9, 0);
    world.addBody(roofBody);

    const wallCount = 14;
    const radius = 5.4;
    for (let i = 0; i < wallCount; i += 1) {
      const angle = (i / wallCount) * Math.PI * 2;
      const wall = new Body({ mass: 0, shape: new Plane() });
      wall.quaternion.setFromEuler(0, angle, 0);
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      wall.position.set(x, 4.5, z);
      world.addBody(wall);
    }

    const tubeExit = new Body({ mass: 0, shape: new Plane() });
    tubeExit.quaternion.setFromEuler(0, Math.PI / 2, 0);
    tubeExit.position.set(6, 3.5, 0);
    world.addBody(tubeExit);

    const ballMaterial = new THREE.MeshStandardMaterial({
      roughness: 0.35,
      metalness: 0.45,
      envMapIntensity: 1.4
    });

    const balls = [];
    const ballGeometry = new THREE.SphereGeometry(BALL_RADIUS, 32, 32);

    const createBall = (number) => {
      const mesh = new THREE.Mesh(ballGeometry, ballMaterial.clone());
      mesh.material.color = new THREE.Color().setHSL(0.55 + Math.random() * 0.1, 0.65, 0.58);
      mesh.material.map = createNumberTexture(number);
      mesh.material.needsUpdate = true;

      const xzRadius = Math.random() * 3.2;
      const angle = Math.random() * Math.PI * 2;
      const body = new Body({
        mass: 0.6,
        shape: new Sphere(BALL_RADIUS),
        position: new Vec3(
          Math.cos(angle) * xzRadius,
          1.5 + Math.random() * 5,
          Math.sin(angle) * xzRadius
        ),
        angularDamping: 0.3,
        linearDamping: 0.12
      });

      scene.add(mesh);
      world.addBody(body);

      return {
        number,
        mesh,
        body,
        drawn: false
      };
    };

    for (let number = 1; number <= BALL_COUNT; number += 1) {
      balls.push(createBall(number));
    }

    const slotHolder = new THREE.Group();
    SLOT_POSITIONS.forEach((pos) => {
      const slot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.6, 0.6, 1.4, 32),
        new THREE.MeshStandardMaterial({
          color: 0x1b264b,
          roughness: 0.35,
          metalness: 0.7,
          emissive: 0x142782,
          emissiveIntensity: 0.35
        })
      );
      slot.position.copy(pos);
      slot.rotation.z = Math.PI / 2;
      slot.position.y = pos.y;
      slotHolder.add(slot);
    });
    scene.add(slotHolder);

    const clock = new THREE.Clock();
    let lastJitter = 0;

    const step = () => {
      const delta = Math.min(clock.getDelta(), 1 / 20);
      world.step(1 / 60, delta, 3);

      balls.forEach((ball) => {
        if (ball.drawn) return;
        ball.mesh.position.copy(ball.body.position);
        ball.mesh.quaternion.copy(ball.body.quaternion);
      });

      lastJitter += delta;
      if (lastJitter > 1.2) {
        balls.forEach((ball) => {
          if (ball.drawn) return;
          const force = new Vec3(
            (Math.random() - 0.5) * 30,
            Math.random() * 15,
            (Math.random() - 0.5) * 30
          );
          ball.body.applyImpulse(force, ball.body.position);
        });
        lastJitter = 0;
      }

      controls.update();
      renderer.render(scene, camera);
      animationRef.current = requestAnimationFrame(step);
    };

    animationRef.current = requestAnimationFrame(step);

    const handleResize = () => {
      if (!container) return;
      const { width: nextWidth, height: nextHeight } = getContainerSize();
      renderer.setSize(nextWidth, nextHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      camera.aspect = nextWidth / nextHeight;
      camera.updateProjectionMatrix();
      setCameraPose(cameraPoseRef.current, { animated: false });
    };

    const resetMachine = () => {
      drawStateRef.current.isDrawing = false;
      drawStateRef.current.drawnNumbers = [];
      drawStateRef.current.callbacks = null;

      drawTimelineRef.current?.kill?.();
      drawTimelineRef.current = undefined;

      balls.forEach((ball) => {
        ball.drawn = false;
        if (!world.bodies.includes(ball.body)) {
          world.addBody(ball.body);
        }
        const xzRadius = Math.random() * 3.2;
        const angle = Math.random() * Math.PI * 2;
        ball.body.position.set(
          Math.cos(angle) * xzRadius,
          1.5 + Math.random() * 5,
          Math.sin(angle) * xzRadius
        );
        ball.body.velocity.set(0, 0, 0);
        ball.body.angularVelocity.set(0, 0, 0);
        ball.body.quaternion.set(0, 0, 0, 1);
        ball.mesh.rotation.set(0, 0, 0);
        ball.mesh.position.set(
          ball.body.position.x,
          ball.body.position.y,
          ball.body.position.z
        );
        ball.mesh.visible = true;
      });

      gsap.killTweensOf(camera.position);
      gsap.killTweensOf(controls.target);
      controls.autoRotate = true;
      setCameraPose('idle');
    };

    const animateDrawnBall = (ball, index, callbacks) => {
      ball.drawn = true;
      drawStateRef.current.drawnNumbers.push(ball.number);
      callbacks?.onBallDrawn?.(ball.number);

      world.removeBody(ball.body);

      const slotPosition = SLOT_POSITIONS[index];
      const timeline = gsap.timeline();

      timeline.to(ball.mesh.position, {
        duration: 1.1,
        x: 4.5,
        y: 4.2,
        z: 0.2,
        ease: 'power2.inOut'
      });

      timeline.to(
        ball.mesh.position,
        {
          duration: 1.1,
          x: slotPosition.x,
          y: slotPosition.y,
          z: slotPosition.z,
          ease: 'power2.inOut'
        },
        '>-0.15'
      );

      timeline.to(
        ball.mesh.rotation,
        {
          duration: 1.6,
          x: `+=${Math.PI * 2}`,
          y: `+=${Math.PI * 2}`,
          ease: 'power2.out'
        },
        '<'
      );

      return timeline;
    };

    const startDraw = (callbacks) => {
      if (drawStateRef.current.isDrawing) return;
      const selection = sampleBalls(balls, 6);
      if (selection.length < 6) return;

      drawTimelineRef.current?.kill?.();
      drawTimelineRef.current = undefined;

      drawStateRef.current.isDrawing = true;
      drawStateRef.current.drawnNumbers = [];
      drawStateRef.current.callbacks = callbacks;

      controls.autoRotate = false;
      setCameraPose('draw');

      const master = gsap.timeline({
        onComplete: () => {
          setCameraPose('reveal', { duration: 1.4 });
          drawStateRef.current.isDrawing = false;
          drawTimelineRef.current = undefined;
          callbacks?.onComplete?.([...drawStateRef.current.drawnNumbers]);
        }
      });

      selection.forEach((ball, index) => {
        master.add(animateDrawnBall(ball, index, callbacks), index * DRAW_INTERVAL);
      });

      drawTimelineRef.current = master;
    };

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => handleResize())
        : null;

    resizeObserver?.observe(container);
    handleResize();

    window.addEventListener('resize', handleResize);

    machineRef.current = {
      scene,
      world,
      camera,
      renderer,
      controls,
      balls,
      resetMachine,
      startDraw
    };

    return () => {
      cancelAnimationFrame(animationRef.current);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      scene.traverse((child) => {
        if (child.isMesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((material) => material.dispose?.());
          } else {
            child.material?.dispose?.();
          }
        }
      });
      container.removeChild(renderer.domElement);
    };
  }, []);

  useImperativeHandle(ref, () => ({
    startDraw: (callbacks) => {
      machineRef.current?.startDraw?.(callbacks);
    },
    reset: () => {
      machineRef.current?.resetMachine?.();
    }
  }));

  return <div ref={mountRef} className="lotto-machine-canvas" style={{ width: '100%', height: '100%' }} />;
});

export default LottoMachine;
