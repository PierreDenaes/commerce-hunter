# Tasks: Design System — GEN Z Tech Theme

**Input**: Design documents from `/specs/002-design-system-genz-theme/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/ui-components.md, quickstart.md

**Tests**: Not explicitly requested in the specification — tests are omitted. Verification tasks are included inline (WCAG contrast, CLS, reduced motion, visual audits).

**Organization**: Tasks are grouped by user story. US1 (Dark Theme) and US2 (Glassmorphism) are co-located in Phase 3 since they share the same foundational CSS and component files. US3-US5 (P2) can run in parallel once Phase 3 is complete. US6 (P3) depends on US3 animation infrastructure.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Monorepo**: All design system work lives in `apps/web/src/` — components in `components/ui/`, tokens in `app/globals.css`, layout in `app/layout.tsx`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and ensure the Next.js 15 app is ready for design system work.

- [ ] T001 Install animation and chart dependencies in `apps/web/`: `pnpm --filter @commercehunter/web add motion recharts`
- [ ] T002 [P] Verify shadcn/ui is initialized in `apps/web/` — confirm `components.json` exists with `cssVariables: true`, dark theme base
- [ ] T003 [P] Verify TailwindCSS v4 is configured in `apps/web/` — confirm `globals.css` is imported in `app/layout.tsx` and Tailwind processes utility classes
- [ ] T004 Verify: `pnpm dev` in `apps/web` → Next.js 15 app loads successfully at `localhost:3000`

**Checkpoint**: Next.js app running with TailwindCSS v4, shadcn/ui, motion, and recharts installed.

---

## Phase 2: Foundational (Blocking Prerequisites — Design Tokens)

**Purpose**: All design tokens (colors, fonts, gradients, glass, keyframes, layout) defined in CSS. Every subsequent component and page depends on these tokens existing.

**⚠️ CRITICAL**: No component or animation work can begin until this phase is complete.

- [x] T005 Define all OKLCH color tokens in `:root` block of `apps/web/src/app/globals.css` — background (`oklch(0.11 0.01 280)`), card (`oklch(0.14 0.01 280)`), border (`oklch(0.22 0.02 280)`), foreground (`oklch(0.95 0.01 280)`), muted (`oklch(0.18 0.01 280)`), muted-foreground (`oklch(0.60 0.02 280)`), primary/purple (`oklch(0.63 0.2 280)`), accent/cyan (`oklch(0.80 0.15 195)`), destructive/pink (`oklch(0.60 0.22 350)`), success/green (`oklch(0.80 0.25 160)`), warning/amber (`oklch(0.75 0.18 70)`), chart-1 through chart-5 per data-model.md
- [x] T006 Set up `@theme inline` block in `apps/web/src/app/globals.css` — bridge all CSS variables to Tailwind utility classes (colors, fonts, keyframes)
- [x] T007 Configure `@custom-variant dark (&:where(.dark, .dark *));` in `apps/web/src/app/globals.css` for always-on dark mode
- [x] T008 [P] Define gradient utilities in `@layer utilities` of `apps/web/src/app/globals.css` — `.gradient-neon-primary` (135deg purple→cyan), `.gradient-neon-accent` (135deg purple→pink), `.gradient-neon-full` (135deg pink→purple→cyan), `.text-gradient-neon` (background-clip text, transparent text)
- [x] T009 [P] Define glass utilities in `@layer components` of `apps/web/src/app/globals.css` — `.glass` (bg-card/30 backdrop-blur-xl border-white/10 shadow-lg), `.glass-elevated` (bg-card/40 backdrop-blur-xl border-white/15 shadow-xl), `.glass-subtle` (bg-card/20 backdrop-blur-md border-white/5), `.glass-glow-hover` (hover:shadow-[0_0_30px_rgba(139,92,246,0.15)] hover:border-primary/30 transition-all)
- [x] T010 [P] Define custom keyframes in `@theme` block of `apps/web/src/app/globals.css` — `shimmer` (gradient sweep left-to-right, 2s linear infinite), `glow-pulse` (opacity/scale pulse, 2s ease-in-out infinite)
- [x] T011 Define typographic scale tokens in `apps/web/src/app/globals.css` — register in `@theme inline`: `--text-display: 3.5rem`, `--text-h1: 2.25rem`, `--text-h2: 1.875rem`, `--text-h3: 1.5rem`, `--text-body: 1rem`, `--text-caption: 0.875rem` with appropriate font-weight and line-height for each
- [x] T012 Configure `next/font/google` in `apps/web/src/app/layout.tsx` — import Space Grotesk (variable, weights 400-700) as `--font-heading` and Inter (variable, weights 400-600) as `--font-body`, apply CSS variables to `<html>` className
- [x] T013 Register font variables in `@theme inline` of `apps/web/src/app/globals.css` — `--font-heading: var(--font-heading)`, `--font-body: var(--font-body)` for `font-heading` and `font-body` utility classes
- [x] T014 Set permanent dark mode in `apps/web/src/app/layout.tsx` — `class="dark"` on `<html>`, `<body className="font-body bg-background text-foreground antialiased">`
- [x] T015 Add `max-w-screen-2xl mx-auto` container wrapper in `apps/web/src/app/layout.tsx` — wrap main content area to prevent stretching on ultra-wide screens (>2560px)
- [x] T016 Verify WCAG AA contrast for all text/background combinations — foreground on background (#EDEDF0 on #0F0F14), foreground on card (#EDEDF0 on #151520), muted-foreground on background (#8888A0 on #0F0F14), muted-foreground on card (#8888A0 on #151520) — all must pass 4.5:1 for body text, 3:1 for large text (SC-005)
- [x] T017 Verify: any page renders with dark background (#0F0F14), correct fonts (Space Grotesk headings, Inter body), gradient utilities work (apply `.gradient-neon-primary` to a test div), glass utilities render (apply `.glass` to a test card), no light theme colors visible

**Checkpoint**: All design tokens active. Dark theme visible on every page. Gradient, glass, and typographic utilities functional. WCAG AA verified.

---

## Phase 3: User Stories 1 & 2 — Dark Theme + Glassmorphism Components (Priority: P1) 🎯 MVP

**Goal**: Core UI components (glass card, gradient button, priority badge, skeleton) fully styled with dark theme. Interactive hover effects on all elements.

**Independent Test (US1)**: Open any page → dark background (#0F0F14), surfaces (#151520), borders (#26263A), gradient accents on CTAs, Space Grotesk headings, Inter body, WCAG AA contrast.

**Independent Test (US2)**: Hover over cards → glow effect. Hover over buttons → scale + brightness. Hover over table rows → highlight. All surfaces have glass-like translucent appearance.

### Implementation

- [x] T018 [P] [US2] Build `GlassCard` component in `apps/web/src/components/ui/glass-card.tsx` — 3 variants (`default`: glass, `elevated`: glass-elevated, `subtle`: glass-subtle), `hoverable` prop adds `.glass-glow-hover` behavior (border transition to primary/30, glow shadow), accepts `className` + `children` props, renders as `<div>` with rounded-xl padding-6 per contract
- [x] T019 [P] [US1] Build `GradientButton` component in `apps/web/src/components/ui/gradient-button.tsx` — 3 gradient variants (`primary`: purple→cyan, `accent`: purple→pink, `full`: pink→purple→cyan), 3 sizes (`sm`: h-8 px-3 text-sm, `md`: h-10 px-4, `lg`: h-12 px-6 text-lg), `loading` state (gradient preserved, content replaced with spinner), `disabled` state (muted bg, no gradient), hover: scale(1.02) + brightness, active: scale(0.98), reduced motion: brightness only (no scale), extends native `<button>` props per contract
- [x] T020 [P] [US1] Build `PriorityBadge` component in `apps/web/src/components/ui/priority-badge.tsx` — `priority` prop (required: "HIGH" | "MEDIUM" | "LOW"), `size` prop ("sm" | "md"), HIGH: text-success bg-success/15, MEDIUM: text-warning bg-warning/15, LOW: text-destructive bg-destructive/15, pill shape (rounded-full), inline-flex per contract
- [x] T021 [P] [US2] Build `SkeletonLoader` component in `apps/web/src/components/ui/skeleton-loader.tsx` — `variant` prop (`text`: rounded bars with configurable `lines`, `card`: rounded-xl full card shape, `table-row`: full-width row, `chart`: square with rounded corners, `gauge`: circle), background muted color with `animate-shimmer` (2s infinite gradient sweep using shimmer keyframe), reduced motion: static muted block (no animation), accepts `className` per contract
- [x] T022 [US1] Customize all shadcn/ui base components in `apps/web/src/components/ui/` to match dark theme — override default styles for: Button (dark bg, border-border), Input (bg-card/50, border-border, focus:border-primary), Select (bg-card/50, dark dropdown), Dialog (glass-elevated background, border-border), Sheet (glass-elevated), Table (transparent bg, border-border/50 rows), Tabs (bg-muted indicator, text-foreground active), Tooltip (glass bg, text-foreground), DropdownMenu (glass-elevated, hover:bg-primary/10) — no default light shadcn styling remaining (FR-029)
- [x] T023 [US1] Verify: all CTA buttons across the app use `GradientButton` or gradient styling — no flat/unstyled buttons exist (SC-004). Verify priority colors are consistent in badge, no color mismatches.

**Checkpoint**: MVP visual layer complete. Dark theme, glassmorphism cards, gradient buttons, priority badges, skeleton loaders all rendering. Hover effects working on all interactive elements. US1 and US2 independently verifiable.

---

## Phase 4: User Story 3 — Animated Dashboard Metrics (Priority: P2)

**Goal**: KPI numbers count up on load, page content enters with staggered animations, loading states show dark shimmer skeletons.

**Independent Test**: Load the dashboard → KPI numbers animate from 0 to final value (~1.5s). Cards appear with staggered entrance (fade + translate up). While loading, shimmer skeletons display. Charts animate into position.

### Implementation

- [x] T024 [US3] Add `<MotionConfig reducedMotion="user">` wrapper around body children in `apps/web/src/app/layout.tsx` — wraps all page content so Framer Motion respects `prefers-reduced-motion` globally
- [x] T025 [P] [US3] Build `AnimatedCounter` component in `apps/web/src/components/ui/animated-counter.tsx` — `value` prop (required number), `duration` (default 1500ms), `prefix`/`suffix` strings, `decimals` (default 0), animates from 0 to value using `motion.useSpring` or `motion.animate` with cubic-bezier(0.16, 1, 0.3, 1) easing, triggers on mount and when value changes, `useReducedMotion()` hook → instantly displays final value when reduced motion enabled per contract
- [x] T026 [P] [US3] Build `StaggerContainer` + `StaggerItem` in `apps/web/src/components/ui/stagger.tsx` — `StaggerContainer`: `delay` (default 0.1s), `staggerDelay` (default 0.08s), uses `motion.div` with `containerVariants` (staggerChildren), `StaggerItem`: `motion.div` with `itemVariants` (fade in opacity 0→1 + translate y: 20→0, duration 400ms, cubic-bezier(0.16, 1, 0.3, 1)), reduced motion: all children appear immediately, both accept `className` per contract
- [x] T027 [US3] Add hover effects to existing components:
  - `GlassCard` (`apps/web/src/components/ui/glass-card.tsx`): when `hoverable`, add `motion.div` wrapper with `whileHover` scale(1.01) or keep CSS-only `.glass-glow-hover`
  - `GradientButton` (`apps/web/src/components/ui/gradient-button.tsx`): add `motion.button` with `whileHover={{ scale: 1.02, filter: "brightness(1.1)" }}`, `whileTap={{ scale: 0.98 }}`
  - Table rows: add `hover:bg-card/20` and `cursor-pointer` classes to themed shadcn Table Row component
- [x] T028 [US3] Verify: staggered entrance works on dashboard KPI cards, counter animates from 0 to value, skeleton loaders display during loading, all animations respect `prefers-reduced-motion` (SC-006), no layout shifts from any animation (measure CLS < 0.1, SC-003)

**Checkpoint**: Dashboard loads with animated KPI counters, staggered card entrance, and shimmer loading states. Reduced motion fully respected. US3 independently verifiable.

---

## Phase 5: User Story 4 — Scan Progress Radar Animation (Priority: P2)

**Goal**: Active scans display animated radar pulse + gradient progress bar showing completion percentage.

**Independent Test**: View a scan in progress → radar/pulse animation plays, gradient progress bar shows current % with smooth fill. Scan completes → animation transitions to static state.

### Implementation

- [x] T029 [P] [US4] Build `ScanRadar` component in `apps/web/src/components/ui/scan-radar.tsx` — `active` prop (required boolean), `progress` prop (0-100), when active: render 3-4 concentric `motion.circle` elements with gradient stroke, animate with `glow-pulse` keyframe (2s ease-in-out infinite) at staggered delays, include `GradientProgressBar` below showing progress %, when not active: static concentric circles (no animation), reduced motion: static circles (no pulse), progress bar still updates per contract
- [x] T030 [P] [US4] Build `GradientProgressBar` component in `apps/web/src/components/ui/gradient-progress-bar.tsx` — `value` prop (required 0-100), `showLabel` (boolean, show percentage text), `size` ("sm": h-1, "md": h-2, "lg": h-3), track: bg-border/50 rounded-full, fill: gradient-neon-primary rounded-full, width transitions with `transition-all duration-300 ease-out`, reduced motion: width jumps to target (no transition, use `motion-safe:` prefix) per contract
- [x] T031 [US4] Verify: scan radar pulses when active, progress bar fills smoothly, animation stops gracefully on completion (not abrupt), reduced motion shows static state with updating progress bar

**Checkpoint**: Scan visualization components complete. US4 independently verifiable with mock scan data.

---

## Phase 6: User Story 5 — SEO Audit Visual Scoring (Priority: P2)

**Goal**: Circular animated gauge for scores, radar chart for SEO dimensions, split layout for audit page.

**Independent Test**: Open business audit page → circular gauge animates from 0 to score (1.5s), radar chart shows 4 dimensions (Technical, On-Page, Mobile, Local SEO), page uses split layout on desktop.

### Implementation

- [x] T032 [US5] Build `ScoreGauge` component in `apps/web/src/components/ui/score-gauge.tsx` — SVG-based 270-degree arc gauge:
  - Props: `score` (required 0-100), `size` (default 200), `strokeWidth` (default 16), `label` (optional), `showScore` (default true)
  - Background track circle: full 270-degree arc in border color
  - Active arc: `motion.circle` with `strokeDasharray` = arcLength, `strokeDashoffset` animated from arcLength to target offset (1.5s, ease-out)
  - Gradient stroke via `<linearGradient>` (purple → cyan → green), unique ID per instance with `React.useId()`
  - `strokeLinecap="round"`, `transform="rotate(135 cx cy)"` to center gap at bottom
  - Score 0: empty ring (track visible, no active stroke), Score 100: complete 270-degree arc
  - Values clamped: `Math.min(Math.max(score, 0), 100)`
  - Center: score number (animated with counter if showScore), label text below
  - Reduced motion: gauge appears at final state immediately (no animation)
  - Per contract and research.md section 5
- [x] T033 [US5] Build `SEORadarChart` component in `apps/web/src/components/ui/seo-radar-chart.tsx` — Recharts RadarChart wrapped in shadcn `ChartContainer`:
  - Props: `data` (required array of `{ dimension: string; score: number }`), `maxScore` (default 100), `size` (default 300)
  - Expected dimensions: ["Technical", "On-Page", "Mobile", "Local SEO"]
  - `PolarGrid` stroke: `var(--color-border)` at 50% opacity
  - `PolarAngleAxis` labels: `fill: var(--color-muted-foreground)`, font-size caption
  - `Radar` fill: `var(--color-chart-1)` at 25% opacity, stroke: solid `var(--color-chart-1)`
  - `animationDuration={1200}`, conditionally disabled with `isAnimationActive={!shouldReduceMotion}` using `useReducedMotion()` hook
  - Dynamic import for Recharts components to manage bundle size (~150KB)
  - Per contract and research.md section 4
- [x] T034 [P] [US5] Build `SplitLayout` component in `apps/web/src/components/ui/split-layout.tsx` — `left`/`right` ReactNode props, `ratio` prop ("equal": grid-cols-2, "left-heavy": 7/5, "right-heavy": 5/7), desktop (>=1024px): side-by-side with gap-8, mobile (<1024px): stacked vertically (left on top), responsive via Tailwind `lg:grid-cols-*` per contract
- [x] T035 [US5] Verify: score gauge animates 0→score correctly, handles edge cases (0 = empty ring visible, 100 = complete arc), multiple gauges on same page don't conflict (unique gradient IDs), radar chart shows 4 SEO dimensions with dark styling, split layout responsive (side-by-side on desktop, stacked on mobile), reduced motion works for both components

**Checkpoint**: All data visualization components complete. Audit page layout ready. US5 independently verifiable with mock score data.

---

## Phase 7: User Story 6 — Smooth Page Transitions (Priority: P3)

**Goal**: Smooth entrance animations on route change, animated drawers/modals, no layout shifts.

**Independent Test**: Navigate between pages → fade + translate entrance animation plays. Open filter drawer → slides in smoothly. Close drawer → slides out. No CLS.

### Implementation

- [x] T036 [US6] Build `PageTransition` component in `apps/web/src/components/ui/page-transition.tsx` — `motion.div` wrapper with entrance animation: opacity 0→1, y: 20→0, duration 400ms, cubic-bezier(0.16, 1, 0.3, 1), reduced motion: instant appear (opacity only, no transform), no exit animation by default per contract
- [x] T037 [US6] Create `apps/web/src/app/template.tsx` — import `PageTransition`, wrap `{children}` in `<PageTransition>` so every route change triggers entrance animation. template.tsx re-renders on navigation, providing natural entrance trigger.
- [x] T038 [US6] Build `DrawerPanel` component in `apps/web/src/components/ui/drawer-panel.tsx` — `open` (required boolean), `onClose` (required callback), `side` ("left" | "right", default "right"), `children`:
  - Backdrop: `motion.div` with opacity 0→0.5 (dark overlay), onClick → onClose
  - Panel: `motion.div` with `initial={{ x: side === "right" ? "100%" : "-100%" }}`, `animate={{ x: 0 }}`, `exit={{ x: side === "right" ? "100%" : "-100%" }}`, duration 300ms ease-out
  - Wrap in `AnimatePresence` for exit animation
  - Reduced motion: fade only (no slide), x stays at 0
  - Per contract
- [x] T039 [US6] Build `FrozenRouter` + `LayoutTransition` utility in `apps/web/src/lib/layout-transition.tsx` — `FrozenRouter` context provider that freezes Next.js router during exit animations, `LayoutTransition` component using `AnimatePresence` + `FrozenRouter` for pages that need exit animations (per research.md section 3, FrozenRouter pattern)
- [x] T040 [US6] Verify: page transitions play on navigation (fade + translate up), drawer slides in/out smoothly, no layout shifts from any animation (CLS < 0.1, SC-003), all transitions respect `prefers-reduced-motion`, exit animations work via FrozenRouter where applied

**Checkpoint**: All navigation and transition animations complete. US6 independently verifiable by navigating between pages and opening/closing drawers.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Apply design system to all application pages, verify consistency, cross-browser testing.

- [x] T041 [P] Apply dark theme to dashboard page — glass KPI cards with `StaggerContainer` entrance, `AnimatedCounter` for metrics, `ScoreGauge` or distribution chart, `SkeletonLoader variant="card"` while loading
- [x] T042 [P] Apply dark theme to scan list/creation pages — `GlassCard` containers, `GradientButton` CTAs, `ScanRadar` animation for active scans, `GradientProgressBar` for progress, `SkeletonLoader` during loads
- [x] T043 [P] Apply dark theme to business list page — themed `Table` with `PriorityBadge` in priority column, row hover highlight (`hover:bg-card/20`), `SkeletonLoader variant="table-row"` while loading, `DrawerPanel` for filters on mobile
- [x] T044 [P] Apply dark theme to business detail/audit page — `SplitLayout` (left: `ScoreGauge` + `SEORadarChart`, right: business data + analysis breakdown in `GlassCard` sections), grouped recommendations by category (technical, on-page, mobile, local) with visual separation, re-analyze `GradientButton`
- [x] T045 [P] Apply dark theme to auth pages (login, register) — centered `GlassCard` container, `GradientButton` submit, themed `Input` fields, dark background
- [x] T046 [P] Apply dark theme to settings/billing pages — `GlassCard` sections for org info, plan details, team members, `GradientProgressBar` for usage stats, `GradientButton` for upgrade/manage actions
- [x] T047 Add branding tone to all UI copy — punchy, confident, tech-forward headlines (e.g., "Scan. Analyze. Convert.", "Digital Intelligence at Your Fingertips"), minimal body text, action-oriented labels (FR-028)
- [x] T048 Final verification pass: no unstyled components remain on any screen (FR-029, SC-004) — check every page for default shadcn/Tailwind styling that doesn't match the design system
- [x] T049 Visual audit: verify color palette discipline — count distinct color values outside defined tokens across the entire application, must be ≤ 5 (SC-008)
- [x] T050 Cross-browser testing: verify dark theme, glassmorphism (backdrop-blur), animations, and gradients render correctly in Chrome, Firefox, Safari, and Edge — note any browser-specific fallbacks needed for `backdrop-filter`
- [x] T051 Run quickstart.md validation — follow all setup steps from `specs/002-design-system-genz-theme/quickstart.md` on a fresh environment, verify every component example renders correctly

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all component work
- **US1+US2 (Phase 3)**: Depends on Phase 2 (tokens must exist for components to use them)
- **US3 (Phase 4)**: Depends on Phase 3 (needs GlassCard, GradientButton, SkeletonLoader for hover effects and animation wrappers)
- **US4 (Phase 5)**: Depends on Phase 2 only (ScanRadar + GradientProgressBar are standalone) — can run in parallel with Phase 4
- **US5 (Phase 6)**: Depends on Phase 2 only (ScoreGauge, RadarChart, SplitLayout are standalone) — can run in parallel with Phase 4
- **US6 (Phase 7)**: Depends on Phase 2 (tokens), but PageTransition + DrawerPanel are standalone — can run in parallel with Phases 4-6
- **Polish (Phase 8)**: Depends on ALL user stories being complete (applies components to pages)

### User Story Dependencies

- **US1+US2 (P1)**: Foundation only — no cross-story dependencies
- **US3 (P2)**: Needs US2 components (GlassCard hover, GradientButton hover) for hover effect integration
- **US4 (P2)**: Independent after Foundation — standalone ScanRadar + GradientProgressBar components
- **US5 (P2)**: Independent after Foundation — standalone ScoreGauge + SEORadarChart + SplitLayout components
- **US6 (P3)**: Independent after Foundation — standalone PageTransition + DrawerPanel + FrozenRouter

### Within Each User Story

- Tokens before components
- Components before page integration
- Core rendering before hover/animation effects
- Verification after implementation

### Parallel Opportunities

Within Phase 2 (Foundational):
- T008, T009, T010 (gradients, glass, keyframes) can all run in parallel — different `@layer` blocks in same file but independent content

Within Phase 3 (US1+US2):
- T018, T019, T020, T021 (GlassCard, GradientButton, PriorityBadge, SkeletonLoader) — 4 different component files, all run in parallel

Within Phases 4-7 (US3-US6):
- **T025 + T026** (AnimatedCounter + Stagger) in parallel — different files
- **T029 + T030** (ScanRadar + GradientProgressBar) in parallel — different files
- **Phase 5 + Phase 6 + Phase 7** can all run in parallel after Phase 3 completes — independent component files

Within Phase 8 (Polish):
- T041-T046 (page theming) — 6 different page files, all run in parallel

---

## Parallel Execution Examples

```bash
# Phase 3 — all 4 core components in parallel:
Task: "Build GlassCard in apps/web/src/components/ui/glass-card.tsx"
Task: "Build GradientButton in apps/web/src/components/ui/gradient-button.tsx"
Task: "Build PriorityBadge in apps/web/src/components/ui/priority-badge.tsx"
Task: "Build SkeletonLoader in apps/web/src/components/ui/skeleton-loader.tsx"

# Phases 5+6+7 — all three story phases in parallel:
Task: "Build ScanRadar in apps/web/src/components/ui/scan-radar.tsx"        # US4
Task: "Build ScoreGauge in apps/web/src/components/ui/score-gauge.tsx"      # US5
Task: "Build PageTransition in apps/web/src/components/ui/page-transition.tsx" # US6

# Phase 8 — all page integrations in parallel:
Task: "Apply dark theme to dashboard page"
Task: "Apply dark theme to scan pages"
Task: "Apply dark theme to business list page"
Task: "Apply dark theme to audit page"
Task: "Apply dark theme to auth pages"
Task: "Apply dark theme to settings pages"
```

---

## Implementation Strategy

### MVP First (US1 + US2 Only)

1. Complete Phase 1: Setup → dependencies installed
2. Complete Phase 2: Foundational → all design tokens defined
3. Complete Phase 3: US1+US2 → dark theme + glassmorphism components
4. **STOP and VALIDATE**: Open any page → dark background, glass cards, gradient buttons, hover effects
5. This delivers the foundational visual layer that all other stories build upon

### Incremental Delivery

1. Setup + Foundational → Tokens ready
2. US1+US2 → Dark theme + components (MVP!)
3. US3 → Animated metrics + stagger → Dashboard feels alive
4. US4 + US5 (parallel) → Scan radar + audit visuals → Data visualization complete
5. US6 → Page transitions → Premium polish
6. Polish → Apply to all pages → Consistent experience across app

### Parallel Developer Strategy

With 2 developers after Phase 3 is complete:
- **Dev A**: US3 (animations) → US6 (transitions) → Polish (dashboard, scan, auth pages)
- **Dev B**: US4 (scan radar) → US5 (audit visuals) → Polish (business, audit, settings pages)

---

## Notes

- [P] tasks = different files, no dependencies between them
- [Story] label maps task to specific user story for traceability
- US1 and US2 are co-located in Phase 3 because they share the same component files (GlassCard serves both glassmorphism [US2] and dark theme surface [US1])
- All animation components MUST check `useReducedMotion()` and degrade gracefully (SC-006)
- Only animate `transform` and `opacity` properties — never `width`, `height`, or layout geometry (CLS prevention, SC-003)
- Dynamic import Recharts components (`SEORadarChart`) to manage bundle size (~150KB gzipped)
- Max 10-15 simultaneous `backdrop-blur` elements per page (performance cap from risk register)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
