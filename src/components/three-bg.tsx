import { useEffect, useRef } from "react";
import * as THREE from "three";

export type ThreeVariant =
  | "icosahedron"
  | "torus-knot"
  | "cube-grid"
  | "octahedron-lattice"
  | "dodecahedron"
  | "radar-rings";

export type ThreeAccent = "green" | "magenta";

const ACCENT_HEX: Record<ThreeAccent, number> = {
  green: 0x39ff14,
  magenta: 0xff2d87,
};

/**
 * Build a thick wireframe from any geometry by replacing each edge with
 * a small cylinder. Few cylinders per shape, so cheap.
 */
function thickWire(
  geometry: THREE.BufferGeometry,
  radius: number,
  color: number,
  opacity = 0.75,
): THREE.Group {
  const edges = new THREE.EdgesGeometry(geometry);
  const positions = edges.attributes.position as THREE.BufferAttribute;
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity });
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < positions.count; i += 2) {
    const a = new THREE.Vector3().fromBufferAttribute(positions, i);
    const b = new THREE.Vector3().fromBufferAttribute(positions, i + 1);
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    if (len < 1e-4) continue;
    const cyl = new THREE.CylinderGeometry(radius, radius, len, 8, 1);
    const mesh = new THREE.Mesh(cyl, mat);
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(up, dir.clone().normalize());
    group.add(mesh);
  }
  edges.dispose();
  geometry.dispose();
  return group;
}

/**
 * Fixed full-viewport WebGL backdrop. Pointer-events: none so it never
 * blocks the UI. 2–3 large, thick wireframe shapes per scene.
 */
export function ThreeBackground({
  variant,
  accent,
  className = "",
}: {
  variant: ThreeVariant;
  accent: ThreeAccent;
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    if (typeof window === "undefined") return;

    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.z = 10;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);

    const color = ACCENT_HEX[accent];
    const TUBE = 0.06; // thicker than the previous 1px lines

    const group = new THREE.Group();
    scene.add(group);

    const place = (g: THREE.Group, x: number, y: number, z = 0, scale = 1) => {
      g.position.set(x, y, z);
      g.scale.setScalar(scale);
      group.add(g);
      return g;
    };

    switch (variant) {
      case "dodecahedron":
      case "icosahedron": {
        // Landing — most complex: dodecahedron + icosahedron, big & thick
        place(thickWire(new THREE.DodecahedronGeometry(3.4, 0), TUBE, color, 0.8), -2.2, 0.4, 0);
        place(thickWire(new THREE.IcosahedronGeometry(2.4, 1), TUBE * 0.85, color, 0.55), 2.8, -0.6, -1);
        break;
      }
      case "torus-knot": {
        // Auth / Join — single large torus knot
        place(thickWire(new THREE.TorusKnotGeometry(2.6, 0.7, 96, 12), TUBE, color, 0.7), 0, 0, 0);
        break;
      }
      case "cube-grid": {
        // Play — octahedron + torus knot (medium complexity)
        place(thickWire(new THREE.OctahedronGeometry(2.6, 0), TUBE, color, 0.8), -2.6, 0.2, 0);
        place(thickWire(new THREE.TorusKnotGeometry(1.6, 0.45, 80, 10), TUBE * 0.85, color, 0.55), 2.6, -0.4, -1);
        break;
      }
      case "octahedron-lattice": {
        // Admin — 2 octahedra
        place(thickWire(new THREE.OctahedronGeometry(2.8, 0), TUBE, color, 0.75), -2.4, 0.5, 0);
        place(thickWire(new THREE.OctahedronGeometry(1.8, 0), TUBE * 0.9, color, 0.55), 2.6, -0.8, -1);
        break;
      }
      case "radar-rings": {
        // Sponsor radar — simplest: 2 concentric rings
        const ring1 = thickWire(new THREE.TorusGeometry(3.2, 0.02, 8, 96), TUBE, color, 0.75);
        ring1.rotation.x = Math.PI / 2;
        group.add(ring1);
        const ring2 = thickWire(new THREE.TorusGeometry(2.0, 0.02, 8, 96), TUBE * 0.9, color, 0.55);
        ring2.rotation.x = Math.PI / 2;
        group.add(ring2);
        break;
      }
      default: {
        // Sponsor — cube + tetrahedron
        place(thickWire(new THREE.BoxGeometry(2.6, 2.6, 2.6), TUBE, color, 0.75), -2.4, 0.3, 0);
        place(thickWire(new THREE.TetrahedronGeometry(2.0, 0), TUBE * 0.9, color, 0.6), 2.6, -0.6, -1);
      }
    }

    let mouseX = 0;
    let mouseY = 0;
    const onMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 0.4;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 0.4;
    };
    window.addEventListener("mousemove", onMove);

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    let raf = 0;
    const clock = new THREE.Clock();
    const animate = () => {
      const t = clock.getElapsedTime();
      if (!reduceMotion) {
        group.rotation.y = t * 0.1 + mouseX;
        group.rotation.x = Math.sin(t * 0.07) * 0.22 + mouseY;
        if (variant === "radar-rings") {
          group.rotation.z = t * 0.12;
        }
      }
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", onResize);
      scene.traverse((obj) => {
        const m = obj as THREE.Mesh & { geometry?: THREE.BufferGeometry; material?: THREE.Material | THREE.Material[] };
        m.geometry?.dispose?.();
        if (Array.isArray(m.material)) m.material.forEach((mm) => mm.dispose());
        else m.material?.dispose?.();
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === host) {
        host.removeChild(renderer.domElement);
      }
    };
  }, [variant, accent]);

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 z-0 ${className}`}
    />
  );
}
