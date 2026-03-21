````markdown
# Design System Specification: The Intelligent Layer

## 1. Overview & Creative North Star

**The Creative North Star: "The Digital Architect"**
This design system moves beyond the standard SaaS "box-and-line" template to create an environment that feels like a high-end architectural workspace. KiviKova is not just a tool; it is an intelligent partner. The aesthetic is defined by **Atmospheric Depth** and **Editorial Precision**.

We achieve "Reliable and Intelligent" through intentional asymmetry, massive headers that command attention, and a refusal to use traditional borders. By relying on tonal shifts and layered surfaces, the UI feels like a series of sophisticated, stacked planes rather than a flat digital screen.

---

## 2. Colors & Surface Logic

The palette is rooted in high-contrast neutrals and deep, authoritative primary tones, punctuated by "AI-active" vibrance.

### The "No-Line" Rule

**Strict Mandate:** Designers are prohibited from using 1px solid borders for sectioning or layout containment. Structural boundaries must be defined solely through background color shifts.

- **Example:** A side-bar using `surface-container-low` (#f2f4f7) sitting against a main content area of `surface` (#f7f9fc).

### Surface Hierarchy & Nesting

Treat the UI as a physical desk. Each layer of depth is achieved by nesting container tokens:

- **Base Layer:** `surface` (#f7f9fc)
- **Secondary Sectioning:** `surface-container-low` (#f2f4f7)
- **Interactive Cards:** `surface-container-lowest` (#ffffff)
- **Overlays/Modals:** `surface-container-highest` (#e0e3e6)

### The "Glass & Gradient" Rule

To signify "AI Intelligence," use glassmorphism for floating utility panels. Use `surface-container-lowest` at 70% opacity with a `24px` backdrop blur.

- **Signature Textures:** Main Action buttons or Hero highlights should utilize a subtle linear gradient: `primary` (#000101) to `primary_container` (#1a1c1e) at a 135-degree angle. This adds a "weighted" feel that flat hex codes lack.

---

## 3. Typography

We utilize a dual-font strategy to balance technical reliability with editorial authority.

- **Display & Headline (Manrope):** Use these for high-level data summaries and page titles. The wide geometric stance of Manrope suggests stability.
  - _Application:_ Use `display-lg` (3.5rem) with `-0.02em` letter spacing for hero moments to create a "Premium Editorial" look.
- **Title & Body (Inter):** The workhorse. Inter provides maximum legibility for dense productivity tasks.
  - _Application:_ Use `body-md` (0.875rem) for the majority of UI text to maintain a spacious, tech-forward feel.
- **Hierarchy Note:** Always maintain a minimum 2:1 scale ratio between headlines and body text to ensure a clear "reading path" for the user.

---

## 4. Elevation & Depth

In this system, elevation is a feeling, not a line.

- **The Layering Principle:** Avoid shadows for static elements. Instead, place a `surface-container-lowest` card on a `surface-container-low` background. The subtle shift from #ffffff to #f2f4f7 creates a "Soft Lift."
- **Ambient Shadows:** For high-priority floating elements (Modals, Popovers), use an extra-diffused shadow:
  - `Box-shadow: 0 20px 50px rgba(25, 28, 30, 0.06);`
  - The shadow color must be a derivative of `on-surface` (#191c1e), never pure black.
- **The "Ghost Border" Fallback:** If a container sits on an identical color and requires definition, use `outline-variant` (#c5c6ca) at **15% opacity**. Anything more is considered "Visual Noise."

---

## 5. Components

### Buttons & Interaction

- **Primary:** Solid `primary` (#000101) with `on_primary` (#ffffff) text. Use `xl` (0.75rem) roundedness.
- **AI-Enhanced Action:** Use the `tertiary_container` (#200060) background with a subtle inner glow (1px white at 10% opacity) to signify "Intelligence."
- **Tertiary:** No background. Use `primary` text. Interaction state is a subtle shift to `surface-container-high`.

### Input Fields

- **Structure:** No bottom line. Fields are `surface-container-lowest` with a `md` (0.375rem) corner radius.
- **State:** On focus, do not change the border. Instead, shift the background to `surface-container-highest` and add a 2px "Ghost Border" using `surface_tint`.

### Cards & Intelligence Lists

- **The "Anti-Divider" Rule:** Forbid the use of horizontal rules (`<hr>`).
- **Content Separation:** Use the Spacing Scale `6` (2rem) to separate list items, or alternating background tints between `surface` and `surface-container-low`.

### Specialized Components: The AI Insight Panel

- A specialized floating container using `tertiary_fixed` (#e8deff) as a very subtle background tint (5% opacity) to denote where the AI is "thinking" or providing suggestions.

---

## 6. Do's and Don'ts

### Do

- **Use Asymmetry:** Place primary CTA groups off-center to create a modern, custom feel.
- **Embrace White Space:** Use the `16` (5.5rem) and `20` (7rem) spacing tokens for page margins.
- **Layer Surfaces:** Think of the UI in Z-space. Lowest is closest to the user.

### Don't

- **Don't Use Opaque Borders:** Never use a 100% opaque `outline`. It breaks the "Architectural" flow.
- **Don't Default to Shadows:** If a background color shift can define a region, use that instead of a shadow.
- **Don't Over-Color:** Keep the UI strictly `surface` and `primary`. Save the `tertiary` (Indigo/Purple) tones exclusively for AI-driven insights to keep their "signal" high.

---

**Director's Closing Note:**
Junior designers often try to solve clarity issues by adding lines. In this system, we solve clarity through **Spacing** and **Tonal Contrast**. If a layout feels messy, add more white space; do not add a border. Keep it intelligent, keep it light, and let the typography do the heavy lifting.```
````
