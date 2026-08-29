---
name: frontend-design
description: Create distinctive, production-grade frontend interfaces with high design quality. Use this skill when the user asks to build web components, pages, artifacts, posters, or applications (examples include websites, landing pages, dashboards, React components, HTML/CSS layouts, or when styling/beautifying any web UI). Generates creative, polished code and UI design that avoids generic AI aesthetics.
license: Complete terms in LICENSE.txt
---

# Frontend Design Playbook & Guidelines

Use this skill when designing, building, or modifying any user interface, landing page, dashboard, or component layout. This playbook guides the creation of distinctive, production-grade frontend interfaces that reject generic "AI slop" aesthetics through intentional design and creative choices.

---

## 1. Design Thinking & Concept Commitment

Before writing any code, understand the context and commit to a **BOLD** aesthetic direction:
- **Purpose**: What problem does this interface solve? Who uses it?
- **Tone**: Pick an extreme: brutally minimal, maximalist chaos, retro-futuristic, organic/natural, luxury/refined, playful/toy-like, editorial/magazine, brutalist/raw, art deco/geometric, soft/pastel, industrial/utilitarian, etc. There are so many flavors to choose from. Use these for inspiration but design one that is true to the aesthetic direction.
- **Constraints**: Technical requirements (framework, performance, accessibility).
- **Differentiation**: What makes this UNFORGETTABLE? What's the one thing someone will remember?

> [!IMPORTANT]
> Choose a clear conceptual direction and execute it with precision. Bold maximalism and refined minimalism both work - the key is intentionality, not intensity. Match implementation complexity to the aesthetic vision.

---

## 2. Core Frontend Aesthetics Guidelines

### Typography
- **Unique Typographic Voice**: Avoid generic, overused font families (like Inter, Roboto, Arial, or default system stacks). Opt instead for characterful display fonts paired with a clean, readable body font (e.g., Outfit, Plus Jakarta Sans, Playfair Display for editorial).
- **Visual Scale**: Establish a clear typographic scale with proportional line heights (e.g., `leading-tight` for titles, `leading-relaxed` for body text).

### Color & Theme
- **Dynamic Palette**: Define colors using CSS custom properties with HSL or OKLCH to allow dynamic manipulation (such as opacity transitions or light/dark theme switching).
- **Avoid Flat Colors**: Avoid raw or basic hex values (e.g., `#FF0000`, `rgb(0,0,255)`). Create harmonious, sophisticated color palettes. Dominant colors with sharp accents outperform timid, evenly-distributed palettes.
- **Layered Contrasts**: Ensure AAA/AA contrast compliance. Use rich, slightly tinted dark backgrounds (e.g., `hsl(240, 10%, 4%)` instead of pure `#000`) and layered cards/elevations (`bg-card` or custom transparencies).

### Spatial Composition
- **Unexpected Layouts**: Prioritize asymmetry, element overlaps, diagonal flows, and grid-breaking elements over predictable, blocky alignments. Use generous negative space or controlled, intentional density.
- **Responsive Sizing**: Rely on CSS Grid for page layouts and Flexbox for component alignment. Use relative sizing (container queries, percentages) rather than hardcoded widths.

### Backgrounds & Visual Details
- **Atmosphere & Depth**: Avoid flat solid backgrounds. Apply creative visual textures: gradient meshes, noise overlays, geometric patterns, layered transparencies, dramatic shadows, custom cursors, or decorative borders.
- **Glassmorphism Spec**: Use for modern headers, overlays, and floating cards:
  ```css
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  ```

### Motion & Micro-interactions
- **CSS Transitions**: Every interactive element (button, link, card) must have hover styles with a smooth transition (e.g., `transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:shadow-lg`).
- **High-Impact Motion**: Content should animate in gently (fade-in, slide-up) as the page loads. Focus on one well-orchestrated page load with staggered delays (`animation-delay`) rather than scattered micro-interactions.
- **Skeleton Loaders**: Use pulsing translucent skeletons during asynchronous loading states.

---

## 3. Production Layout Patterns

### Landing Page Patterns
- **Hero Section Visual Anchor**: Place a high-quality visual element on the right (mockup, inline SVG graphic, interactive widget) and the copy on the left.
- **Clear CTA Hierarchy**: A prominent primary button with bold branding/hover effects, followed by a secondary ghost/outline button.
- **Feature Grids**: Use 3-column layouts on desktop collapsing to 1-column on mobile. Cards should feature rounded corners (`rounded-xl` or `rounded-2xl`), custom inline SVG icons, and hover shadow shifts.

### Dashboard Patterns
- **Collapsible Sidebar**: Implement a sidebar that collapses smoothly (e.g., transitions to `w-16` or `w-0` on mobile). Active states must have a prominent background fill, accent border, or contrast text, and a micro-animation.
- **Card Widgets & Groupings**: Group related data into cohesive visual cards with consistent padding (`p-5` or `p-6`).
- **Interactive Switchers**: Use JavaScript/DOM listeners to enable tab-switching and sidebar navigation dynamically, avoiding full-page refreshes.
- **Empty States**: Present clean empty states with custom artwork/illustrations and direct inline actions (e.g., a "Create New" button).

---

## 4. Aesthetics Enforcement (Anti-Patterns)
- **NEVER** default to a purple-to-white gradient on a plain white page.
- **NEVER** use emojis in the production UI or documentation; use custom-configured SVG icon systems instead.
- **NEVER** let text overflow its container; utilize robust flexbox scaling and text truncation (`truncate`).
- **NEVER** serve static placeholder images; generate contextual visual demonstrations.
