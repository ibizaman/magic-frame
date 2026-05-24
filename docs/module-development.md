# Magic Frame — Building modules

A **module** is a widget type that can be added in the editor and placed on a
view (clock, weather, timer, …). This document covers **everything**
that goes into a module — from the React component to every place where
it needs to be registered.

> TL;DR: write a `.tsx` component under `src/components/widgets/` and hook it into
> **7 places**. After that it shows up in the editor, can be saved, and renders
> live on the display.

---

## 1. Anatomy of a module

A module consists of these parts:

| Part | File | Required? |
|------|-------|----------|
| Widget component | `src/components/widgets/<Name>Widget.tsx` | ✅ |
| Live registry (display) | `src/app/view/[id]/page.tsx` | ✅ |
| Editor catalog (add-widget list, color, icon, default) | `src/app/editor/(app)/views/[id]/page.tsx` | ✅ |
| Schema (save validation) | `src/lib/widgets/schemas.ts` | ✅ |
| Inspector (settings on the right) | `src/app/editor/_inspectors/<Name>Inspector.tsx` + `InspectorPanel.tsx` | recommended |
| Views-list thumbnail | `src/app/editor/(app)/views/page.tsx` (`WIDGET_META`) | optional |
| Module list (this page) | `src/app/editor/(app)/modules/page.tsx` (`INSTALLED`) | optional |

The **type ID** is always the filename including extension, e.g. `"ClockWidget.tsx"`.
It is stored as `type` on every layout item and used everywhere for routing.

---

## 2. The component

```tsx
// src/components/widgets/HelloWidget.tsx
"use client";

import { useEffect, useState } from "react";

export default function HelloWidget({
  config,
  dashboardId,
}: {
  config?: any;
  dashboardId?: string;
}) {
  const name = config?.name || "World";

  return (
    // Sizes in `em` → inherits the font size set in the editor,
    // automatically scales with `responsiveText` (cqmin).
    <div className="w-full h-full flex flex-col items-center justify-center gap-[0.3em]">
      <div className="text-[1.4em] font-bold">Hello, {name}!</div>
      <div className="text-[0.7em] opacity-60">My first Magic Frame module</div>
    </div>
  );
}
```

### Props contract

- **`config`** — the `config` object from the layout item. Holds all
  module-specific settings the inspector writes (`config.name`, …).
- **`dashboardId`** — the ID of the view the widget runs on. Only needed if
  the module loads view-specific data (e.g. timers/messages per board).
- Some widgets additionally receive **`onVisibilityChange(visible: boolean)`**
  (calendar, HA, HA notifications) so they can softly hide themselves
  when there's nothing to show. Optional.

### Sizing convention (important)

The view renderer wraps the module in a box with:

- `containerType: 'size'` (container queries active) and
- a `fontSize` the user sets in the inspector — either fixed in `px`
  or responsive as `cqmin`/`cqw` (toggle "Responsive Auto-Scale").

**So: express all sizes in the module in `em`** (`text-[1.4em]`, `gap-[0.3em]`,
`p-[0.6em]`). That way your module scales with the configured font size instead
of forcing fixed pixels. `fontFamily`, `color`, `fontWeight`, and `textShadow`
are inherited from the wrapper too — don't hard-set them yourself unless you
explicitly want to override.

### Background / glass

The outer box (opacity + blur) is provided by the renderer from `bgOpacity`. For
"card modules" with their own card look (like HA entities) there's an opt-out via
`isCardBased` in the renderer — not needed for regular modules.

### Live sync (optional)

Data modules that should update instantly open a Socket.IO connection
and listen for server events (see Timer/Messages):

```tsx
import io from "socket.io-client";
const socket = io();
socket.on("YOUR_EVENT", (payload) => { /* setState */ });
// in cleanup: socket.disconnect();
```

The server (`server.js`) broadcasts via `(global as any).LIVE_SYNC_IO.emit(...)`.

---

## 3. Registration (the 7 points)

### 3.1 Live registry — `src/app/view/[id]/page.tsx`

Import + one line in `renderWidgetContent`:

```tsx
import HelloWidget from "@/components/widgets/HelloWidget";
// …
if (type === 'HelloWidget.tsx') return <HelloWidget config={config} dashboardId={dashboardId} />;
```

### 3.2 Editor catalog — `src/app/editor/(app)/views/[id]/page.tsx`

Four small spots:

```tsx
// a) WIDGET_CATALOG (the "Add widget" list)
{ type: "HelloWidget.tsx", label: "Hello", icon: <Smile size={16} /> },

// b) WIDGET_ACCENT (accent color of the canvas tile)
"HelloWidget.tsx": { hex: "#22d3ee", glow: "rgba(34,211,238,0.2)", tint: "rgba(34,211,238,0.1)" },

// c) widgetIconFor() — icon in the canvas header
if (type === "HelloWidget.tsx") return <Smile size={size} />;

// d) addWidget() — nicer default name (optional)
if (type === "HelloWidget.tsx") label = "Hello";
```

### 3.3 Schema — `src/lib/widgets/schemas.ts` (REQUIRED!)

Without a schema entry, **saving fails** (`/api/layout/sync` validates
strictly). Config object + union member:

```ts
const helloConfig = baseConfig
  .extend({ name: z.string().optional() })
  .passthrough();
// … in the union:
z.object({ type: z.literal("HelloWidget.tsx"), config: helloConfig })
  .merge(commonWidgetFields()),
```

`baseConfig` already contains the shared fields (fontSize, fontFamily, color,
responsiveText, offsetX/Y, textShadow…). `.passthrough()` lets extra fields through.

### 3.4 Inspector — `src/app/editor/_inspectors/HelloInspector.tsx`

```tsx
"use client";
import type { WidgetLayoutItem } from "../_types";

export default function HelloInspector({
  widget, updateConfig,
}: {
  widget: WidgetLayoutItem;
  updateConfig: (i: string, key: string, value: any) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-white/80 block mb-2">Name</label>
        <input
          type="text"
          value={(widget.config as any)?.name ?? ""}
          onChange={(e) => updateConfig(widget.i, "name", e.target.value)}
          className="w-full bg-black border border-white/10 text-white text-sm rounded-lg p-3 focus:outline-none focus:border-blue-500"
        />
      </div>
    </div>
  );
}
```

Then route it in `src/app/editor/_components/InspectorPanel.tsx` inside `ContentTab`:

```tsx
{activeWidget.type === "HelloWidget.tsx" && (
  <HelloInspector widget={activeWidget} updateConfig={updateConfig} />
)}
```

Optional: `TYPE_LABELS` (inspector header label) and — if your inspector
renders dynamic **card lists** (like rules/entities) — add the type to
`NO_MULTICOL_CONTENT` so the modal doesn't reflow into 2 columns.

### 3.5 Views-list thumbnail — `src/app/editor/(app)/views/page.tsx`

```tsx
// WIDGET_META
"HelloWidget.tsx": { color: "#22d3ee", Icon: Smile },
```

### 3.6 Module list — `src/app/editor/(app)/modules/page.tsx`

Entry in the `INSTALLED` array so the module shows up here as "Installed".

### 3.7 Done

`npm run build`, deploy. The module is selectable in the editor, saveable, and runs
live on the display.

---

## 4. Checklist

- [ ] `src/components/widgets/<Name>Widget.tsx` — `"use client"`, props `{ config, dashboardId? }`, sizes in `em`
- [ ] Live registry line in `view/[id]/page.tsx`
- [ ] `WIDGET_CATALOG` + `WIDGET_ACCENT` + `widgetIconFor` + `addWidget` in `views/[id]/page.tsx`
- [ ] Config + union member in `schemas.ts` (otherwise no saving!)
- [ ] Inspector + routing in `InspectorPanel.tsx`
- [ ] `WIDGET_META` in `views/page.tsx`
- [ ] `INSTALLED` in `modules/page.tsx`
- [ ] `npm run build` green

---

## 5. Planned: Module Market & Manifest

In the future community modules should be installable without a code edit. The
target format is a **`module.json` manifest** per module:

```jsonc
{
  "id": "hello-world",
  "type": "HelloWidget.tsx",
  "name": "Hello",
  "version": "1.0.0",
  "author": "you",
  "description": "Greets a person.",
  "accent": "#22d3ee",
  "icon": "smile",                  // lucide name
  "entry": "HelloWidget.js",        // bundled component
  "configSchema": { "name": { "type": "string", "label": "Name" } },
  "defaultSize": { "w": 8, "h": 4 }
}
```

The market would load the manifest + bundle, auto-render the `configSchema` into an
inspector, and derive the registration points (catalog/schema/meta) at runtime
from the manifest — no server restart needed.

Magic Frame goes with its **own module format** (`module.json` + bundle). No
foreign format, no adapter zoo — a curated market with a clear spec
that we tailor inspector generation, versioning, and auto-updates to.

> Until the market is live, the path above (code + 7 points) is the supported way
> to build your own modules.

---

## 6. References in the code

- Simplest example: `src/components/widgets/ClockWidget.tsx`
- Data module with socket live-sync: `src/components/widgets/TimerWidget.tsx`
- Card-list inspector: `src/app/editor/_inspectors/HANotificationInspector.tsx`
- Schema union: `src/lib/widgets/schemas.ts`
- Renderer (sizing/glass/container-query): `src/app/view/[id]/page.tsx`
