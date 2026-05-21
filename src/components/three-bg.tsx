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
 * Fixed full-viewport WebGL backdrop. Pointer-events: none so it never
 * blocks the UI. One canvas per page; remounts on variant change.
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
    camera.position.z = 8;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);

    const colorHex = ACCENT_HEX[accent];
    const mat = new THREE.LineBasicMaterial({ color: colorHex, transparent: true, opacity: 0.45 });
    const matSoft = new THREE.LineBasicMaterial({ color: colorHex, transparent: true, opacity: 0.2 });

    const group = new THREE.Group();
    scene.add(group);

    const buildIcosahedron = () => {
      const geo = new THREE.IcosahedronGeometry(2.6, 1);
      const wire = new THREE.WireframeGeometry(geo);
      group.add(new THREE.LineSegments(wire, mat));
      const inner = new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(1.4, 0));
      group.add(new THREE.LineSegments(inner, matSoft));
    };
    const buildTorusKnot = () => {
      const geo = new THREE.TorusKnotGeometry(2, 0.55, 140, 16);
      group.add(new THREE.LineSegments(new THREE.WireframeGeometry(geo), mat));
    };
    const buildCubeGrid = () => {
      const cubeGeo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
      const wire = new THREE.WireframeGeometry(cubeGeo);
      for (let x = -3; x <= 3; x++) {
        for (let y = -2; y <= 2; y++) {
          for (let z = -2; z <= 2; z++) {
            if ((x + y + z) % 2 !== 0) continue;
            const seg = new THREE.LineSegments(wire, z === 0 ? mat : matSoft);
            seg.position.set(x * 1.6, y * 1.6, z * 1.6 - 2);
            group.add(seg);
          }
        }
      }
    };
    const buildOctaLattice = () => {
      const octa = new THREE.WireframeGeometry(new THREE.OctahedronGeometry(0.9));
      for (let i = 0; i < 14; i++) {
        const seg = new THREE.LineSegments(octa, i % 3 === 0 ? mat : matSoft);
        seg.position.set((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 7, (Math.random() - 0.5) * 6);
        seg.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
        group.add(seg);
      }
    };
    const buildDodecahedron = () => {
      const geo = new THREE.DodecahedronGeometry(2.8, 0);
      group.add(new THREE.LineSegments(new THREE.WireframeGeometry(geo), mat));
      const small = new THREE.DodecahedronGeometry(1.2, 0);
      const s = new THREE.LineSegments(new THREE.WireframeGeometry(small), matSoft);
      s.position.set(0, 0, 0);
      group.add(s);
    };
    const buildRadarRings = () => {
      for (let i = 1; i <= 6; i++) {
        const ringGeo = new THREE.TorusGeometry(i * 0.7, 0.012, 8, 96);
        const m = new THREE.LineBasicMaterial({ color: colorHex, transparent: true, opacity: 0.6 - i * 0.07 });
        const seg = new THREE.LineSegments(new THREE.WireframeGeometry(ringGeo), m);
        seg.rotation.x = Math.PI / 2;
        group.add(seg);
      }
      // crosshair lines
      const lineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-5, 0, 0),
        new THREE.Vector3(5, 0, 0),
      ]);
      const lineGeo2 = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, -5, 0),
        new THREE.Vector3(0, 5, 0),
      ]);
      group.add(new THREE.Line(lineGeo, matSoft));
      group.add(new THREE.Line(lineGeo2, matSoft));
    };

    switch (variant) {
      case "torus-knot": buildTorusKnot(); break;
      case "cube-grid": buildCubeGrid(); break;
      case "octahedron-lattice": buildOctaLattice(); break;
      case "dodecahedron": buildDodecahedron(); break;
      case "radar-rings": buildRadarRings(); break;
      case "icosahedron":
      default: buildIcosahedron(); break;
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
        group.rotation.y = t * 0.12 + mouseX;
        group.rotation.x = Math.sin(t * 0.08) * 0.25 + mouseY;
        if (variant === "cube-grid") {
          group.position.z = (Math.sin(t * 0.3) * 0.6);
        }
        if (variant === "radar-rings") {
          group.rotation.z = t * 0.15;
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
      renderer.dispose();
      mat.dispose();
      matSoft.dispose();
      scene.traverse((obj) => {
        const m = obj as THREE.Mesh & { geometry?: THREE.BufferGeometry };
        m.geometry?.dispose?.();
      });
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
