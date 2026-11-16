# Icons

`svg/` holds the 36 line icons from the Figma component section `138:622`
(`Icon/<name>`), exported as SVG with the canvas background removed. Each keeps
its Figma frame size and padding. `generated/` is produced from them with:

```bash
npx svgr --native --typescript --no-index --filename-case pascal \
  --replace-attr-values "#646A5C=currentColor,#000=currentColor,black=currentColor" \
  --svgo-config '{"plugins":[{"name":"preset-default","params":{"overrides":{"removeViewBox":false}}},"removeXMLNS"]}' \
  --out-dir src/components/icons/generated src/components/icons/svg
```

`#646A5C` (text/secondary) and the black strokes some Figma icons use become
`currentColor`, so `<Icon name="home" color={…} />`
tints the stroke. `lock` keeps its olive (`#3B4630`) body fill from Figma.
After adding an SVG, add it to `registry.ts`.
