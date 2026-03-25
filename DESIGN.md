# Design System

This document captures the current visual language, component patterns, and conventions used across the Vernix UI. Use it as the source of truth when building new screens or components.

---

## Color Palette

### Philosophy

All colors are defined as CSS custom properties using the **OKLCH color space** (perceptually uniform, better for accessibility than HSL/HEX). Tailwind utilities map to these tokens via `@theme inline` in `globals.css`. The palette is **intentionally grayscale-first** — the only hued color in the default theme is destructive (red). Status colors (green, yellow, red) are hardcoded by convention since they carry semantic meaning independent of theme.

### Semantic Tokens

Use these tokens everywhere. Never hardcode a hex or rgb value for UI chrome.

| Token                  | Light value                    | Dark value                      | Usage                                  |
| ---------------------- | ------------------------------ | ------------------------------- | -------------------------------------- |
| `background`           | `oklch(1 0 0)` — white         | `oklch(0.145 0 0)` — near black | Page background                        |
| `foreground`           | `oklch(0.145 0 0)`             | `oklch(0.985 0 0)`              | Primary text                           |
| `card`                 | `oklch(1 0 0)`                 | `oklch(0.205 0 0)`              | Card surfaces                          |
| `card-foreground`      | `oklch(0.145 0 0)`             | `oklch(0.985 0 0)`              | Text inside cards                      |
| `primary`              | `oklch(0.205 0 0)` — dark gray | `oklch(0.922 0 0)` — light gray | CTAs, active states                    |
| `primary-foreground`   | `oklch(0.985 0 0)`             | `oklch(0.205 0 0)`              | Text on primary                        |
| `secondary`            | `oklch(0.97 0 0)`              | `oklch(0.269 0 0)`              | Secondary buttons, backgrounds         |
| `secondary-foreground` | `oklch(0.205 0 0)`             | `oklch(0.985 0 0)`              | Text on secondary                      |
| `muted`                | `oklch(0.97 0 0)`              | `oklch(0.269 0 0)`              | Hover states, disabled backgrounds     |
| `muted-foreground`     | `oklch(0.556 0 0)` — mid gray  | `oklch(0.708 0 0)`              | Secondary text, metadata, placeholders |
| `accent`               | `oklch(0.97 0 0)`              | `oklch(0.269 0 0)`              | Focus highlights                       |
| `accent-foreground`    | `oklch(0.205 0 0)`             | `oklch(0.985 0 0)`              | Text on accent                         |
| `destructive`          | `oklch(0.577 0.245 27°)` — red | `oklch(0.704 0.191 22°)`        | Delete actions, errors                 |
| `border`               | `oklch(0.922 0 0)`             | `oklch(1 0 0 / 10%)`            | Dividers, input borders                |
| `input`                | `oklch(0.922 0 0)`             | `oklch(1 0 0 / 15%)`            | Input field borders                    |
| `ring`                 | `oklch(0.708 0 0)`             | `oklch(0.556 0 0)`              | Focus rings                            |

**Sidebar tokens** follow the same pattern with `sidebar-` prefix. In dark mode, `sidebar-primary` picks up a blue tint (`oklch(0.488 0.243 264°)`).

### Base Radius

```
--radius: 0.625rem  (10px)
--radius-sm: calc(var(--radius) * 0.6)   → 6px
--radius-md: calc(var(--radius) * 0.8)   → 8px
--radius-lg: var(--radius)               → 10px
--radius-xl: calc(var(--radius) * 1.4)   → 14px
```

Components use: `rounded-lg` (inputs, buttons), `rounded-xl` (cards, dialogs), `rounded-full` / `rounded-4xl` (badges/pills).

### Status Colors

These are the only intentionally hardcoded colors — they carry semantic meaning that must not shift with the theme:

| State                | Text              | Background     | Usage                                        |
| -------------------- | ----------------- | -------------- | -------------------------------------------- |
| Processing / warning | `text-yellow-600` | `bg-yellow-50` | Document processing, pending states          |
| Success / ready      | `text-green-600`  | `bg-green-50`  | Active meetings, completed tasks, ready docs |
| Error / failed       | `text-red-600`    | `bg-red-50`    | Failed status, error boxes                   |

In dark mode add `dark:border-green-800 dark:bg-green-950` etc. as needed (see `mcp-server-list.tsx` for reference).

---

## Typography

### Fonts

Both fonts are loaded from `next/font/google` in `src/app/layout.tsx` and applied globally:

| Role      | Font         | CSS variable                        |
| --------- | ------------ | ----------------------------------- |
| Body / UI | Geist Sans   | `--font-geist-sans` → `--font-sans` |
| Monospace | Geist Mono   | `--font-geist-mono` → `--font-mono` |
| Headings  | same as body | `--font-heading` → `--font-sans`    |

The `<html>` root carries `antialiased` for smooth rendering.

### Type Scale

| Class                        | Size | Weight | Usage                                                                |
| ---------------------------- | ---- | ------ | -------------------------------------------------------------------- |
| `text-3xl font-bold`         | 30px | 700    | Main page title ("Vernix" dashboard header)                          |
| `text-2xl font-bold`         | 24px | 700    | Dashboard sub-page titles (Knowledge Base, Settings, meeting title)  |
| `text-lg font-semibold`      | 18px | 600    | Section headings within a page (Participants, Transcript, Documents) |
| `text-lg` (inside CardTitle) | 18px | 500    | Card titles (Agenda, Summary, Action Items)                          |
| `text-sm font-medium`        | 14px | 500    | UI labels, item titles, button text, speaker names                   |
| `text-sm`                    | 14px | 400    | Default body text, card content, form values                         |
| `text-xs`                    | 12px | 400    | Timestamps, metadata, badges, file info                              |

**Rule of thumb**: `text-sm` is the default. Use `text-xs` only for metadata/badges. Never use `text-base` for body copy — it's reserved for native input elements (where mobile browsers zoom on smaller sizes).

### Secondary Text

Always pair `text-muted-foreground` with the size class. Common patterns:

```
text-muted-foreground text-xs    — timestamps, file sizes, secondary metadata
text-muted-foreground text-sm    — subtitles, descriptions, empty state body
text-muted-foreground italic     — empty state messages, "no items yet" hints
text-muted-foreground truncate   — long URLs, join links in meeting cards
```

### Markdown Rendering

The codebase renders markdown with `renderMarkdown()` from `src/lib/format.ts` and targets child elements with Tailwind's arbitrary-child syntax. Two flavors:

**Chat messages** (`chat-message.tsx`):

```
text-sm [&_li]:mt-0.5 [&_p]:leading-relaxed [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-4
```

**Meeting summaries** (`dashboard/[id]/page.tsx`):

```
space-y-2 text-sm [&_li]:mt-1 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-5
```

Do not use the `prose` plugin — use the explicit selector pattern above to stay consistent with the design tokens.

---

## Spacing

### Base Unit

`1` = 4px. All spacing follows multiples of this unit.

### Rhythm

| Tailwind step | px   | Use                                                    |
| ------------- | ---- | ------------------------------------------------------ |
| `0.5`         | 2px  | Micro gaps (badge icon padding, row nudges)            |
| `1`           | 4px  | Tight inline gaps (`gap-1` for button icon groups)     |
| `2`           | 8px  | Default small gap (`gap-2`, `px-2`, `py-1`)            |
| `3`           | 12px | List item padding, form element spacing                |
| `4`           | 16px | Standard internal padding, section gap — **most used** |
| `6`           | 24px | Between major sections on a page                       |
| `8`           | 32px | Page-level vertical padding (`py-8`)                   |
| `12`          | 48px | Empty state vertical breathing room (`py-12`)          |

### Page Layout

```tsx
// Standard container
<div className="container mx-auto max-w-6xl px-4 py-8">

// Narrower content (detail pages, settings)
<div className="container mx-auto max-w-4xl px-4 py-8">
```

- `max-w-6xl` — meeting list, wide grids
- `max-w-4xl` — meeting detail, settings, forms

### Grid

Meetings grid (responsive):

```
grid gap-4 sm:grid-cols-2 lg:grid-cols-3
```

- Mobile: 1 column
- 640px+: 2 columns
- 1024px+: 3 columns

### Vertical Spacing in Forms

```
<div className="space-y-2">   ← label + input pair
<div className="space-y-4">   ← between form field groups
<form className="space-y-4">  ← form root
```

---

## Component Patterns

### Foundation

The UI layer is built on **Base-ui** (`@base-ui/react`) with **CVA** (class-variance-authority) for variants. Base-ui uses the `render` prop for composition instead of the Radix `asChild` pattern.

```tsx
// ✅ Correct — render prop
<DialogTrigger render={<Button />}>Open</DialogTrigger>
<Badge render={<a href="/path" />}>Link badge</Badge>

// ❌ Wrong — asChild does not exist in Base-ui
<DialogTrigger asChild><Button>Open</Button></DialogTrigger>
```

---

### Button

Defined in `src/components/ui/button.tsx` via CVA.

**Variants**

| Variant       | Style                                                        | When to use                       |
| ------------- | ------------------------------------------------------------ | --------------------------------- |
| `default`     | `bg-primary text-primary-foreground`                         | Primary CTA                       |
| `outline`     | `border-border bg-background hover:bg-muted`                 | Secondary action                  |
| `secondary`   | `bg-secondary text-secondary-foreground`                     | Alternative secondary             |
| `ghost`       | `hover:bg-muted hover:text-foreground`                       | Icon-only or low-emphasis actions |
| `destructive` | `bg-destructive/10 text-destructive hover:bg-destructive/20` | Delete, remove                    |
| `link`        | `text-primary underline-offset-4 hover:underline`            | Inline navigational               |

**Sizes**

| Size      | Height   | Use                           |
| --------- | -------- | ----------------------------- |
| `default` | `h-8`    | Standard button               |
| `sm`      | `h-7`    | Compact rows, toolbars        |
| `xs`      | `h-6`    | Badges, inline actions        |
| `lg`      | `h-9`    | Hero / primary call-to-action |
| `icon`    | `size-8` | Square icon-only              |
| `icon-sm` | `size-7` | Small icon-only (table rows)  |
| `icon-xs` | `size-6` | Tight icon-only               |

**Always-present states**:

```
active:translate-y-px                        — press feedback
disabled:pointer-events-none disabled:opacity-50
focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50
```

---

### Badge

Defined in `src/components/ui/badge.tsx`. Always `text-xs font-medium`, pill shape (`rounded-4xl`).

| Variant       | Style                                    | Use                                    |
| ------------- | ---------------------------------------- | -------------------------------------- |
| `default`     | `bg-primary text-primary-foreground`     | Active, selected                       |
| `secondary`   | `bg-secondary text-secondary-foreground` | Neutral labels (Disabled server, etc.) |
| `destructive` | `bg-destructive/10 text-destructive`     | Errors, failed state                   |
| `outline`     | `border-border text-foreground`          | Subtle label                           |

---

### Card

Defined in `src/components/ui/card.tsx`. Multi-part:

```
Card             root container          ring-1, rounded-xl, flex-col gap-4, py-4
├── CardHeader   grid layout for title/action   px-4, gap-1
│   ├── CardTitle                        text-base leading-snug font-medium
│   ├── CardDescription                  text-sm text-muted-foreground
│   └── CardAction                       auto-positioned top-right via grid
├── CardContent  main body               px-4
└── CardFooter   bottom strip            bg-muted/50 border-t p-4 rounded-b-xl
```

Override `CardTitle` size when needed: `<CardTitle className="text-lg">`.

**Small variant**: `<Card data-size="sm">` reduces padding and gap (`py-3 px-3 gap-3`).

---

### Dialog

Defined in `src/components/ui/dialog.tsx`, wraps Base-ui Dialog.

**Overlay**: `bg-black/10` backdrop with `backdrop-blur-xs` (when supported).

**Content**: `rounded-xl p-4 gap-4 sm:max-w-sm` with enter/exit animations via `data-open`/`data-closed` classes.

Built-in close button (top-right X) — hide with `showCloseButton={false}` for confirmation dialogs.

**Animation classes**:

```
data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95
data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95
duration-100
```

---

### Input & Form Fields

Input is `h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm`.

Standard form field pattern:

```tsx
<div className="space-y-2">
  <Label htmlFor="fieldId">Label text</Label>
  <Input id="fieldId" placeholder="..." value={state} onChange={handler} />
</div>
```

Textarea (no dedicated component — use inline styles):

```
border-input bg-background placeholder:text-muted-foreground
w-full rounded-md border px-3 py-2 text-sm
```

---

### Table

Use for settings lists (API keys, MCP servers — less common than Card lists).

```
TableRow:   hover:bg-muted/50 border-b transition-colors
TableHead:  h-10 px-2 font-medium text-left text-foreground
TableCell:  p-2 align-middle
```

---

## Recurring Patterns

### List Item (Card-based)

Most list views use Cards instead of `<ul>`. The standard item layout:

```tsx
<Card>
  <CardContent className="flex items-center gap-3 py-2.5">
    <SomeIcon className="text-muted-foreground h-5 w-5 shrink-0" />
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-medium">Item title</p>
      <p className="text-muted-foreground text-xs">Secondary metadata</p>
    </div>
    <Badge className="shrink-0" variant="secondary">
      Label
    </Badge>
    <Button variant="ghost" size="icon-sm">
      <Trash2 className="h-4 w-4" />
    </Button>
  </CardContent>
</Card>
```

Use `py-3` instead of `py-2.5` for slightly more breathable rows.

### Empty State

```tsx
<div className="text-muted-foreground py-12 text-center">
  <SomeIcon className="mx-auto mb-3 h-12 w-12 opacity-40" />
  <p className="text-lg font-medium">Nothing here yet</p>
  <p className="text-sm">Helpful hint about how to add items.</p>
</div>
```

Always: `py-12 text-center`, icon at `h-12 w-12 opacity-40`, heading `text-lg font-medium`, body `text-sm`.

### Page Header

```tsx
<div className="mb-8 flex items-center justify-between">
  <div>
    <h1 className="text-2xl font-bold">Page Title</h1>
    <p className="text-muted-foreground text-sm">Optional subtitle</p>
  </div>
  <div className="flex items-center gap-2">
    <Button variant="outline" size="sm">
      Secondary action
    </Button>
    <Button size="sm">Primary action</Button>
  </div>
</div>
```

### Loading / Async State

Track async operations with a local `loading` boolean:

```tsx
const [loading, setLoading] = useState(false);

const handle = async () => {
  setLoading(true);
  try {
    await action();
  } finally {
    setLoading(false);
  }
};

// In JSX:
<Button disabled={loading} onClick={handle}>
  {loading ? "Saving..." : "Save"}
</Button>;
```

For spinners: `<Loader2 className="h-4 w-4 animate-spin" />`. For search: `<Search className="h-3 w-3 animate-pulse" />`.

### Confirmation Dialog

Use `ConfirmDialog` from `src/components/confirm-dialog.tsx`:

```tsx
<ConfirmDialog
  open={confirmOpen}
  onOpenChange={setConfirmOpen}
  title="Delete meeting?"
  description="This action cannot be undone."
  confirmLabel="Delete"
  variant="destructive"
  onConfirm={handleDelete}
/>
```

### Toast Notifications

Import from sonner: `import { toast } from "sonner"`.

```tsx
toast.success("Meeting created");
toast.error("Something went wrong");
```

Pass `id` to deduplicate: `toast.error(message, { id: queryHash })`. TanStack Query errors are toasted automatically via `QueryCache.onError` in `QueryProvider`.

---

## Icons

Source: `lucide-react`. Sizing conventions:

| Context                  | Class                                |
| ------------------------ | ------------------------------------ |
| Inside buttons (default) | `h-4 w-4` or `size-4`                |
| Inside small/xs buttons  | `h-3 w-3` or `size-3`                |
| List item leading icon   | `h-5 w-5`                            |
| Badge icon               | `size-3` (forced by Badge component) |
| Empty state illustration | `h-12 w-12 opacity-40`               |

Common icons by category:

- **Actions**: `Plus`, `Trash2`, `Download`, `Upload`, `Copy`, `Check`, `Send`, `Search`, `Square`, `Play`
- **Status**: `CheckCircle2`, `Circle`, `Loader2`, `AlertCircle`, `XCircle`
- **Navigation**: `ChevronDown`, `ChevronUp`
- **Semantic**: `FileText`, `MessageSquare`, `Server`, `Key`, `Zap`, `User`, `Clock`

---

## Accessibility

- All icon-only buttons have `<span className="sr-only">Label</span>` or `aria-label`.
- Live regions on chat: `role="log" aria-live="polite"`.
- Invalid form fields use `aria-invalid` — all input/button primitives respond to `aria-invalid:` variants already.
- Focus rings are always visible: `focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50` on all interactive elements.

---

## File Locations

| Concern                                             | Path                                |
| --------------------------------------------------- | ----------------------------------- |
| CSS variables & `@theme`                            | `src/app/globals.css`               |
| Button, Badge, Card, Dialog, Input, Label, Table    | `src/components/ui/`                |
| Meeting card, chat, task list, knowledge list, etc. | `src/components/`                   |
| Meeting status → badge variant map                  | `src/lib/meetings/constants.ts`     |
| Query client setup                                  | `src/components/query-provider.tsx` |
| Query key factory                                   | `src/lib/query-keys.ts`             |
| Markdown renderer                                   | `src/lib/format.ts`                 |
