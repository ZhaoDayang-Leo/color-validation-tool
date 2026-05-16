# Color Validation Tool

A static color palette validation tool for analyzing OKLCH distribution, color distance, hue spread, and chart readability.

## Online Preview

Open the live site here:

https://zhaodayang-leo.github.io/color-validation-tool/

## Files

- `index.html` - the app entry point
- `style.css` - visual styling
- `app-core.js` - palette parsing, saved palettes, Google Sheet import, and color calculations
- `app-render.js` - charts, distance matrix, controls, and interactions
- D3 and chroma-js are loaded from jsDelivr CDN.

## Local Preview

```bash
python3 -m http.server 4173
```

Then open `http://127.0.0.1:4173/index.html`.
