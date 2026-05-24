# Uploading custom modules

Magic Frame can load custom widget modules at runtime — **without**
a source-tree patch and without a container rebuild. A module is a single
JS bundle that loads in the live view via a `<script>` tag and
registers itself against `window.MagicFrame.registerWidget(...)`.

## Module structure

A module is a single `.js`/`.ts`/`.tsx` file with:

```js
export const manifest = {
  type: "hello",              // automatically becomes "custom:hello"
  label: "Hello World",
  description: "short description",
  iconEmoji: "👋",
  version: "1.0.0",
  fields: [
    { key: "name", label: "Name", type: "text", default: "World" },
    { key: "showEmoji", label: "Emoji?", type: "boolean", default: true },
  ],
};

export default function render(ctx) {
  // ctx.createElement = React.createElement
  // ctx.config = the fields set in the inspector
  // ctx.useState/useEffect/useRef/useMemo/useCallback = React hooks
  // ctx.fetch = window.fetch (API calls allowed)
  const h = ctx.createElement;
  const name = ctx.config.name || "World";
  return h("div", { className: "w-full h-full flex items-center justify-center" },
    `Hello, ${name}!`);
}
```

### Field types in the manifest

| `type`     | UI                       |
|------------|--------------------------|
| `text`     | single-line input        |
| `textarea` | multi-line text field    |
| `number`   | number input             |
| `boolean`  | checkbox                 |
| `color`    | color picker (#rrggbb)   |
| `url`      | URL input + validation   |

Each field can additionally set `default`, `placeholder`, `help`, `required`.

## Build

Produces `module.json` + `bundle.js` in an output directory:

```bash
node scripts/build-module.mjs examples/modules/hello/hello-widget.js examples/modules/hello/dist
```

Output:

```
examples/modules/hello/dist/
  module.json   # manifest
  bundle.js     # IIFE bundle, ~1-5 KB for a Hello World
```

The script uses `esbuild` and bundles the JS file plus all of its
relative imports into a single IIFE string. React hooks and
`createElement` are NOT pulled into the bundle — they come via
`ctx` from the host.

## Upload

**UI:** Settings → Modules → "Upload module" → pick both files
(`module.json` + `bundle.js`) → Upload. The module is immediately
available in the editor's widget catalog.

**API:**

```bash
curl -X POST https://dashboard.example.com/api/admin/modules \
  -H "Content-Type: application/json" \
  --cookie "magic_session=..." \
  -d @<(jq -n \
       --argjson m "$(cat dist/module.json)" \
       --arg js "$(cat dist/bundle.js)" \
       '{manifest:$m, bundleJs:$js}')
```

## Using it in the editor

1. **Settings → Modules:** lists all uploaded custom modules with
   enable/disable/delete.
2. **Editor → Edit view:** custom modules appear in the
   widget list to the left of the core widgets (with `iconEmoji`).
3. **Inspector:** renders the manifest's `fields` as
   dynamic input controls.
4. **Live view:** when the view loads, the bundle is fetched once per type
   (cached), and the custom widget renders directly.

## Limits & security

- **Bundle size:** max 2 MB (CDN- and cache-friendly).
- **Code runs in the browser** — anyone who can upload modules can
  execute arbitrary JS in the editor context. Only install modules
  from trusted sources.
- **Module type IDs** are automatically prefixed with `custom:`
  so they don't collide with core widget IDs.
- **Hot replace:** uploading a module with the same `type`
  overwrites the previous one. Active views fetch the new bundle on
  the next render (clear the browser cache if necessary).
- **Reactivity:** modules use the React hooks from `ctx`. A direct
  import of React isn't needed (and would end up in the bundle +
  cause duplicate React instances — avoid).

## Example

`examples/modules/hello/` contains a complete Hello World module
with manifest, config fields (text/boolean/color), and build instructions.
