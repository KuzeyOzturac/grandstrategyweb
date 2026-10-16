# Design

## Aesthetic direction

Contemporary geopolitical atlas: muted territory colours, charcoal command panels, warm ivory labels and a restrained amber action colour.

## Type stack

Geist variable, bundled locally with @fontsource/geist. Tabular numbers for resources. Labels use small tracked capitals; body text remains sentence case, line-height 1.5.

## Tokens

Background #101b21; panel #15232b; raised #1c2d35; border #34444b; foreground #e8e5d8; muted #a9b8bd; accent #d7b77a; danger #db8d7e; success #95b8a1. Country colours have semantic territorial meaning, not ornamental accents.

## Layout

Viewport strategy shell: top command bar, left navigation, full map, right dossier, lower journal. 4px/8px/12px/20px spacing, restrained 2px corners. No marketing hero or equal feature cards. At narrower widths panels collapse rather than shrinking the map to unreadability. Desktop is supported target; small screens receive explicit layout guidance.

## Components

Country picker; resource ribbon; time controls; overlay selector; zoomable atlas; army counters; army order arrows; dossiers; flat action lists; confirmation dialog for restarting; event journal; tutorial steps; error/status notifications.

## Motion and accessibility

Only short opacity/transform transitions, cubic-bezier(.16,1,.3,1); reduced-motion respected. Explicit labels, focus rings, keyboard shortcuts outside inputs; SVG area title and keyboard selection. No pure black/white, purple gradients, emojis, generic avatars or external font requests.

## Last updated

2026-10-16: established first-build atlas system.

## Country-first revision

Country dossiers and a 380px command panel replace the army command interface. National ribbon: treasury, living standards, construction, legitimacy. Navigation: Situation, Diplomacy, Military fronts, Production, Market, Politics, Journal. Shape-based SVG highlights only; no browser bounding-box focus rectangles. Keyboard focus uses a gold shape stroke. Native tap highlights and text selection disabled on map geometry. Foreign country click immediately opens available interactions. Disabled actions explain their prerequisite below the button.

2026-10-16: added country dossiers, economic/political management, fronts, queues and trend plots.

## Legislation and plays — 1.2

2026-10-16: retained the atlas aesthetic using the frontend-god-mode workflow. Laws use three category buttons, one labeled policy-area selector, a current-policy row and competing alternatives; no wall of 48 buttons. Visible odds distinguish advances, debates and setbacks. Single reform progress display names the stage and cooldown consequences. Diplomatic demands expose concrete treaty effects, both coalitions, primary/counter/secondary terms and maneuver budgets. War switches to a settlement screen with leverage and explicit concession. Existing Geist, dark panels, amber focus, flat rows and explained disabled actions remain.
