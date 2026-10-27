'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export function HeroGlobe({ className = '' }: { className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    } catch {
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 20);
    camera.position.z = 3.2;

    const globe = new THREE.Group();
    scene.add(globe);

    const sphereGeometry = new THREE.SphereGeometry(1, 36, 28);
    const sphereMaterial = new THREE.MeshBasicMaterial({
      color: '#e11d2e',
      wireframe: true,
      transparent: true,
      opacity: 0.26,
    });
    globe.add(new THREE.Mesh(sphereGeometry, sphereMaterial));

    const cores = typeof navigator === 'undefined' ? 4 : Math.max(1, navigator.hardwareConcurrency || 4);
    const particleCount = Math.min(640, Math.max(120, cores * 48));
    const positions = new Float32Array(particleCount * 3);
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < particleCount; i += 1) {
      const y = 1 - (i / Math.max(1, particleCount - 1)) * 2;
      const radius = Math.sqrt(1 - y * y);
      const angle = goldenAngle * i;
      const offset = i * 3;
      positions[offset] = Math.cos(angle) * radius * 1.006;
      positions[offset + 1] = y * 1.006;
      positions[offset + 2] = Math.sin(angle) * radius * 1.006;
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMaterial = new THREE.PointsMaterial({
      color: '#ff8290',
      size: 0.018,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
    });
    globe.add(new THREE.Points(particleGeometry, particleMaterial));

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.setAttribute('aria-hidden', 'true');
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    host.appendChild(renderer.domElement);

    let frameId = 0;
    let inView = false;
    let disposed = false;

    const render = () => {
      frameId = 0;
      if (disposed || !inView) return;
      globe.rotation.y += 0.0018;
      globe.rotation.x = Math.sin(performance.now() * 0.00015) * 0.04;
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(render);
    };

    const resize = () => {
      const { width, height } = host.getBoundingClientRect();
      if (width <= 0 || height <= 0) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      if (inView && !frameId) frameId = requestAnimationFrame(render);
    };

    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(resize)
      : null;
    resizeObserver?.observe(host);
    resize();

    const intersectionObserver = typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(([entry]) => {
          inView = Boolean(entry?.isIntersecting);
          if (inView && !frameId) frameId = requestAnimationFrame(render);
          if (!inView && frameId) {
            cancelAnimationFrame(frameId);
            frameId = 0;
          }
        }, { threshold: 0.01 })
      : null;
    intersectionObserver?.observe(host);
    if (!intersectionObserver) {
      inView = true;
      frameId = requestAnimationFrame(render);
    }

    return () => {
      disposed = true;
      if (frameId) cancelAnimationFrame(frameId);
      intersectionObserver?.disconnect();
      resizeObserver?.disconnect();
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
        for (const material of materials) {
          for (const value of Object.values(material)) {
            if (value instanceof THREE.Texture) value.dispose();
          }
          material.dispose();
        }
      });
      scene.clear();
      renderer.renderLists.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={hostRef} className={className} aria-hidden="true" />;
}
