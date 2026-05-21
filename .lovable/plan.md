## Visual cleanup pass

Tighten the neon redesign: remove color transitions, kill rounded corners, drop landing-page glow, pure black background, and make the 3D shapes fewer/bigger/thicker with complexity decreasing from landing → deeper pages.

### 1. Background & color transitions (`src/styles.css`)
- Replace `.bg-neon-base` gradient with solid `#000000`.
- Remove all `transition-colors` / `transition: background/color` rules from utility classes (`.panel-neon`, `.panel-neon-magenta`, buttons, cards, portal tiles). Hover states switch instantly (border/opacity only, no tweened color).
- Remove the animated gradient on `.text-neon-shine` → static neon-green fill, no keyframe animation.

### 2. Square corners everywhere
- Override Tailwind radius: set `--radius: 0` and force `rounded-*` utilities used in our components to `border-radius: 0` via global rule on `.panel-neon`, `.panel-neon-magenta`, `button`, `input`, `[role="dialog"]`, `.card`.
- Audit and strip `rounded-*` classes on landing portal tiles, auth card, admin/play/sponsor panels, header logo container.

### 3. Landing page: no glow on boxes
- In `src/routes/index.tsx`, remove `shadow-[0_0_...]`, `drop-shadow`, and `.panel-neon` glow from the portal cards. Keep hairline 1px neon border only, no box-shadow.
- Header logo container loses its glow halo on `/` (keep border).

### 4. Three.js shapes: thicker, fewer, complexity gradient
Update `src/components/three-bg.tsx`:
- Replace `LineBasicMaterial` (1px lines) with **tube geometries** wrapping each wireframe edge, so line thickness is real (≈3–5px equivalent). Use `MeshBasicMaterial` on the tubes.
- Cap shape count per scene to **2–3 large objects** (currently clusters/grids spawn many). Scale each ~2× larger than current.
- Complexity ladder (most → least complex):
  - `/` Landing → dodecahedron + icosahedron (most facets, most complex)
  - `/play` → octahedron + torus knot
  - `/auth` + `/join` → torus knot (single, large)
  - `/admin` → octahedron lattice reduced to 2 octahedra
  - `/sponsor` → cube + tetrahedron
  - `/sponsor-radar` → 2 concentric rings (simplest)
- Remove cube-grid tunnel and lattice arrays — they violate the 2–3 cap.

### 5. Out of scope
- `/recap` and `/wrapped` untouched.
- No business logic, routing, auth, or data changes.
- Neon green + magenta palette stays; only the transitions/gradient on the base background are removed.

### Technical notes
- Tube radius ≈ `0.04` world units, `radialSegments: 8`, built once per edge using `THREE.TubeGeometry` along `LineCurve3` segments extracted from each shape's `EdgesGeometry`.
- Rotation animation stays (it's transform, not color), respects `prefers-reduced-motion`.
- All color tokens remain in `src/styles.css`; only values/animations change.
