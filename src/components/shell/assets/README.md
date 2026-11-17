# Shell assets

`svg/` holds the Figma exports used by the shell: `olvar-mark.svg` (Logo/Olvar mark
`140:1189`), `avatar-circle.svg` (Auth brand panel avatar `140:1182`) and
`live-dot.svg` (Sidebar gateway live dot). The components were generated with:

```bash
npx svgr --native --typescript --no-index --filename-case pascal \
  --svgo-config '{"plugins":[{"name":"preset-default","params":{"overrides":{"removeViewBox":false,"cleanupIds":false}}},"removeXMLNS"]}' \
  --out-dir src/components/shell/assets src/components/shell/assets/svg
```

SVGR drops `<filter>`, so the Figma drop-shadow and blur filters were copied back
into `AvatarCircle.tsx` and `LiveDot.tsx` by hand; keep them when regenerating.
