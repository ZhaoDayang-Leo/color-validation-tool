const STORE_KEY = "color-validation-palettes-v1";
    const DEFAULT_PALETTES = [
      {
        id: "serenity-default",
        name: "Serenity",
        colors: ["#5B8FF9", "#61DDAA", "#65789B", "#F6BD16", "#7262FD", "#78D3F8", "#9661BC", "#F6903D", "#008685", "#F08BB4", "#1E9493", "#FF99C3", "#9FB40F", "#BFBFBF"]
      },
      {
        id: "dashboard-bright",
        name: "Dashboard Bright",
        colors: ["#3366CC", "#DC3912", "#FF9900", "#109618", "#990099", "#0099C6", "#DD4477", "#66AA00", "#B82E2E", "#316395", "#994499", "#22AA99"]
      }
    ];
    const GOOGLE_SHEET_SOURCES = [
      {
        id: "google-sheet-1",
        name: "Google Sheet 1",
        spreadsheetId: "1oJWHA1ZvyU5AuH3WMr9EcoV8MEPLKsNM-a-4B9S6opY",
        gid: "0"
      },
      {
        id: "google-sheet-2",
        name: "Google Sheet 2",
        spreadsheetId: "1jZALYcCDNNb6fandol4HKHeMEsgyQ1gNUmU5LFcKzDw",
        gid: "0"
      }
    ];

    const sample = Array.from({ length: 40 }, (_, i) => ({
      name: `Group ${i + 1}`,
      a: Math.round(20 + Math.sin(i * .8) * 9 + i * 2.5),
      b: Math.round(18 + Math.cos(i * .6) * 8 + i * 1.7),
      c: Math.round(15 + Math.sin(i * .45 + 1) * 7 + i * 1.2),
      d: Math.round(12 + Math.cos(i * .35 + 2) * 6 + i)
    }));

    const state = {
      palettes: [],
      selectedId: "",
      colors: [],
      points: []
    };

    const coolorsState = {
      letters: [],
      frame: 0,
      pointer: null,
      fallback: ["#5B5FF4", "#9B45F2", "#D83EE6", "#EE3476", "#F24438", "#FF6B14", "#F7A900", "#66C20F", "#20BF55", "#159CD8", "#2F6DF6", "#7D55F2"]
    };

    const el = id => document.getElementById(id);
    const app = document.querySelector(".app-root");
    const controls = [
      "paletteSelect", "paletteName", "colorInput", "themeSelect", "firstN",
      "donutInner", "donutOuter", "barOuter", "lineWidth",
      "xField", "yField", "rField", "weightL", "weightC", "weightH"
    ].reduce((acc, id) => (acc[id] = el(id), acc), {});

    function initCoolorsInteraction() {
      const container = el("coolorsText");
      const hero = el("coolorsHero");
      if (!container || !hero) return;
      const lines = ["Make something", "colorful!"];
      container.innerHTML = lines.map(line => {
        const parts = line.split(" ");
        return `<div class="coolors-line">${parts.map((word, wordIndex) => {
          const letters = [...word].map(ch => `<span class="coolors-letter">${ch}</span>`).join("");
          const gap = wordIndex < parts.length - 1 ? `<span class="coolors-word-gap" aria-hidden="true"></span>` : "";
          return letters + gap;
        }).join("")}</div>`;
      }).join("");
      coolorsState.letters = [...container.querySelectorAll(".coolors-letter")];
      coolorsState.letters.forEach((letter, index) => {
        letter.dataset.index = index;
      });
      const move = event => {
        const point = event.touches ? event.touches[0] : event;
        coolorsState.pointer = { x: point.clientX, y: point.clientY };
        scheduleCoolorsPaint();
      };
      hero.addEventListener("pointermove", move);
      hero.addEventListener("touchmove", move, { passive: true });
      hero.addEventListener("pointerleave", resetCoolorsPaint);
      hero.addEventListener("touchend", resetCoolorsPaint);
      resetCoolorsPaint();
    }

    function getCoolorsPalette() {
      return state.colors.length ? state.colors : coolorsState.fallback;
    }

    function scheduleCoolorsPaint() {
      if (coolorsState.frame) return;
      coolorsState.frame = requestAnimationFrame(() => {
        coolorsState.frame = 0;
        paintCoolorsLetters();
      });
    }

    function paintCoolorsLetters() {
      if (!coolorsState.pointer) return;
      const palette = getCoolorsPalette();
      const radius = Math.min(340, Math.max(190, window.innerWidth * .22));
      coolorsState.letters.forEach(letter => {
        const rect = letter.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const distanceToPointer = Math.hypot(cx - coolorsState.pointer.x, cy - coolorsState.pointer.y);
        const influence = Math.max(0, 1 - distanceToPointer / radius);
        if (influence <= .02) {
          letter.classList.remove("is-active");
          letter.style.color = "";
          return;
        }
        const index = Number(letter.dataset.index) || 0;
        const color = palette[index % palette.length];
        letter.classList.add("is-active");
        letter.style.color = chroma.mix("#f3f3f3", color, Math.min(1, influence * 1.35), "rgb").hex();
      });
    }

    function resetCoolorsPaint() {
      coolorsState.pointer = null;
      coolorsState.letters.forEach(letter => {
        letter.classList.remove("is-active");
        letter.style.color = "";
      });
    }

    function normalizeHex(value) {
      const raw = value.trim();
      if (!raw) return null;
      const prefixed = raw.startsWith("#") ? raw : `#${raw}`;
      if (/^#[0-9a-fA-F]{3}$/.test(prefixed)) {
        return "#" + prefixed.slice(1).split("").map(x => x + x).join("").toUpperCase();
      }
      if (/^#[0-9a-fA-F]{6}$/.test(prefixed)) return prefixed.toUpperCase();
      return undefined;
    }

    function slug(value) {
      return String(value || "palette").toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-").replace(/^-|-$/g, "") || "palette";
    }

    function mergePalettes(...groups) {
      const seen = new Set();
      const merged = [];
      groups.flat().filter(Boolean).forEach(palette => {
        const colors = (palette.colors || []).map(normalizeHex).filter(hex => hex && hex !== undefined);
        if (!colors.length) return;
        const cleanedName = String(palette.name || "").replace(/#?[0-9a-fA-F]{6}\b/g, "").trim();
        const name = cleanedName && !/^(hex|color|colour|色值)$/i.test(cleanedName) ? cleanedName : (palette.fallbackName || "导入色板");
        const id = palette.id || slug(name);
        if (seen.has(id)) return;
        seen.add(id);
        merged.push({ ...palette, id, name, colors });
      });
      return merged;
    }

    function splitLargePalettes(palettes, size = 14) {
      return palettes.flatMap(palette => {
        if (!palette.colors || palette.colors.length <= size + 4) return palette;
        const chunks = [];
        for (let i = 0; i < palette.colors.length; i += size) {
          chunks.push({
            ...palette,
            id: `${palette.id}-part-${chunks.length + 1}`,
            name: `${palette.name} ${chunks.length + 1}`,
            fallbackName: palette.fallbackName || palette.name,
            colors: palette.colors.slice(i, i + size)
          });
        }
        return chunks;
      });
    }

    function rowValue(row, keys) {
      const normalized = Object.fromEntries(Object.entries(row).map(([key, value]) => [key.trim().toLowerCase(), value]));
      for (const key of keys) {
        const value = normalized[key.toLowerCase()];
        if (value != null && String(value).trim()) return String(value).trim();
      }
      return "";
    }

    function extractHexesFromText(value) {
      return [...String(value || "").matchAll(/#?[0-9a-fA-F]{6}\b/g)]
        .map(match => normalizeHex(match[0]))
        .filter(hex => hex && hex !== undefined);
    }

    function palettesFromFirstColumnGroups(rows, cols, source) {
      const nameCol = cols[0];
      if (!nameCol) return [];
      const groups = new Map();
      rows.forEach((row, rowIndex) => {
        const name = String(row[nameCol] || "").trim();
        if (!name || /#?[0-9a-fA-F]{6}\b/.test(name)) return;
        const colors = cols.slice(1).flatMap(col => extractHexesFromText(row[col]));
        if (!colors.length) return;
        if (!groups.has(name)) groups.set(name, []);
        groups.get(name).push(...colors.map((hex, colorIndex) => ({ hex, order: rowIndex * 100 + colorIndex })));
      });
      return [...groups.entries()].map(([name, entries], index) => ({
        id: `${source.id}-${slug(name)}-${index}`,
        name,
        colors: entries
          .sort((a, b) => a.order - b.order)
          .map(entry => entry.hex)
      }));
    }

    function palettesFromRows(rows, source) {
      const groups = new Map();
      rows.forEach((row, index) => {
        const rawHex = rowValue(row, ["Hex", "HEX", "Color", "Colour", "色值", "颜色"]);
        const inferredHexes = rawHex ? extractHexesFromText(rawHex) : Object.values(row).flatMap(extractHexesFromText);
        const hex = inferredHexes[0];
        if (!hex || hex === undefined) return;
        const sourceName = rowValue(row, ["Source", "Palette", "Theme", "Name", "Scheme", "色板", "来源"]) || source.name;
        if (!groups.has(sourceName)) groups.set(sourceName, []);
        groups.get(sourceName).push({ hex, order: Number(rowValue(row, ["Serise", "Series", "Index", "Order", "序号"])) || index });
      });
      return [...groups.entries()].map(([name, entries], index) => ({
        id: `${source.id}-${slug(name)}-${index}`,
        name,
        colors: entries.sort((a, b) => a.order - b.order).map(entry => entry.hex)
      }));
    }

    function palettesFromWideColumns(rows, cols, source) {
      return cols.map((col, index) => {
        if (/#?[0-9a-fA-F]{6}\b/.test(String(col))) return null;
        const colors = rows.map(row => normalizeHex(String(row[col] || ""))).filter(hex => hex && hex !== undefined);
        return colors.length ? {
          id: `${source.id}-${slug(col)}-${index}`,
          name: /^(hex|color|colour|色值)$/i.test(String(col).trim()) ? `${source.name} ${index + 1}` : (col || `${source.name} ${index + 1}`),
          fallbackName: source.name,
          colors
        } : null;
      }).filter(Boolean);
    }

    function palettesFromTextBlobs(rows, cols, source) {
      const blobs = [
        ...cols.map((col, index) => ({ text: String(col || ""), index })),
        ...rows.map((row, index) => ({ text: Object.values(row).map(value => String(value || "")).join(" "), index: index + cols.length }))
      ];
      return blobs.map(({ text, index }) => {
        const matches = [...text.matchAll(/#?[0-9a-fA-F]{6}\b/g)];
        const colors = extractHexesFromText(text);
        if (colors.length < 2) return null;
        const firstHexAt = matches[0].index ?? 0;
        let name = text.slice(0, firstHexAt).replace(/^(source|serise|series|hex|palette|theme|name|color|colour|色值|色板|来源)\s*/i, "").trim();
        name = name || `${source.name} ${index + 1}`;
        return {
          id: `${source.id}-${slug(name)}-${index}`,
          name,
          fallbackName: source.name,
          colors
        };
      }).filter(Boolean);
    }

    function loadSheetViaGviz(source) {
      return new Promise((resolve, reject) => {
        const callbackName = `__sheetCallback_${source.id.replace(/[^a-z0-9]/gi, "_")}_${Date.now()}`;
        const script = document.createElement("script");
        const timer = setTimeout(() => {
          cleanup();
          reject(new Error(`Timeout loading ${source.name}`));
        }, 12000);
        function cleanup() {
          clearTimeout(timer);
          delete window[callbackName];
          script.remove();
        }
        window[callbackName] = response => {
          try {
            let cols = response.table.cols.map((col, index) => col.label || col.id || `Column ${index + 1}`);
            let rawRows = response.table.rows.map(row => row.c.map(cell => cell?.v ?? ""));
            const firstRow = rawRows[0] || [];
            const firstRowLooksLikeHeader = firstRow.some(value => /^(source|serise|series|hex|palette|theme|name|color|colour|色值|色板|来源)$/i.test(String(value).trim()));
            const colsLookGeneric = cols.every(col => /^([a-z]|\w?column\s+\d+)$/i.test(String(col).trim()));
            if (firstRowLooksLikeHeader && colsLookGeneric) {
              cols = firstRow.map((value, index) => String(value || `Column ${index + 1}`).trim());
              rawRows = rawRows.slice(1);
            }
            const rows = rawRows.map(row => Object.fromEntries(cols.map((col, index) => [col, row[index] ?? ""])));
            const firstColumnPalettes = palettesFromFirstColumnGroups(rows, cols, source);
            const longPalettes = palettesFromRows(rows, source);
            const widePalettes = palettesFromWideColumns(rows, cols, source);
            const textPalettes = palettesFromTextBlobs(rows, cols, source);
            const fallbackPalettes = mergePalettes(longPalettes.length > 1 ? longPalettes : [], widePalettes, textPalettes, longPalettes)
              .filter(palette => !new RegExp(`^${source.name}\\s+\\d+(\\s+\\d+)*$`, "i").test(palette.name));
            cleanup();
            resolve(firstColumnPalettes.length > 1 ? firstColumnPalettes : splitLargePalettes(fallbackPalettes));
          } catch (error) {
            cleanup();
            reject(error);
          }
        };
        script.onerror = () => {
          cleanup();
          reject(new Error(`Failed loading ${source.name}`));
        };
        script.src = `https://docs.google.com/spreadsheets/d/${source.spreadsheetId}/gviz/tq?gid=${source.gid}&tqx=responseHandler:${callbackName}`;
        document.head.appendChild(script);
      });
    }

    async function loadGoogleSheetPalettes() {
      const results = await Promise.allSettled(GOOGLE_SHEET_SOURCES.map(loadSheetViaGviz));
      const sheetPalettes = results.flatMap(result => result.status === "fulfilled" ? result.value : []);
      if (!sheetPalettes.length) return;
      const currentId = state.selectedId;
      const shouldPromoteSheetDefault = currentId === DEFAULT_PALETTES[0]?.id;
      state.palettes = mergePalettes(sheetPalettes, state.palettes);
      state.selectedId = shouldPromoteSheetDefault ? sheetPalettes[0].id : (state.palettes.some(p => p.id === currentId) ? currentId : state.palettes[0].id);
      refreshPaletteSelect();
      if (shouldPromoteSheetDefault || !currentId || !state.colors.length) selectPalette(state.selectedId);
    }

    function parseColors(input) {
      const tokens = input.split(/[\s,;，；]+/).map(normalizeHex).filter(v => v !== null);
      const invalid = input.split(/[\s,;，；]+/).filter(Boolean).filter(v => normalizeHex(v) === undefined);
      const unique = [];
      tokens.forEach(hex => {
        if (hex && !unique.includes(hex)) unique.push(hex);
      });
      return { colors: unique, invalid };
    }

    function oklch(hex) {
      const [lightness, chromaValue, hueValue] = chroma(hex).oklch();
      return {
        lightness,
        chroma: chromaValue,
        hue: Number.isFinite(hueValue) ? hueValue : 0
      };
    }

    function distance(a, b) {
      const l = +controls.weightL.value;
      const c = +controls.weightC.value;
      const h = +controls.weightH.value;
      const hueDelta = Math.abs(a.hue - b.hue);
      const hueCircular = Math.min(hueDelta, 360 - hueDelta);
      return Math.sqrt(
        Math.pow(a.lightness - b.lightness, 2) * l +
        Math.pow(a.chroma - b.chroma, 2) * c +
        Math.pow(hueCircular / 360, 2) * h
      );
    }

    function loadPalettes() {
      try {
        const stored = JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
        state.palettes = mergePalettes(DEFAULT_PALETTES, stored);
      } catch {
        state.palettes = mergePalettes(DEFAULT_PALETTES);
      }
      state.selectedId = state.palettes[0]?.id || "";
    }

    function persistPalettes() {
      localStorage.setItem(STORE_KEY, JSON.stringify(state.palettes));
    }

    function refreshPaletteSelect() {
      controls.paletteSelect.innerHTML = "";
      state.palettes.forEach(p => {
        const option = document.createElement("option");
        option.value = p.id;
        option.textContent = p.name;
        controls.paletteSelect.appendChild(option);
      });
      controls.paletteSelect.value = state.selectedId;
    }

    function selectPalette(id) {
      const palette = state.palettes.find(p => p.id === id) || state.palettes[0];
      if (!palette) return;
      state.selectedId = palette.id;
      controls.paletteName.value = palette.name;
      controls.colorInput.value = palette.colors.join("\n");
      refreshPaletteSelect();
      render();
    }

    function updatePoints() {
      const parsed = parseColors(controls.colorInput.value);
      const error = el("inputError");
      error.textContent = parsed.invalid.length ? `无法识别的色值：${parsed.invalid.join("、")}` : "";
      error.classList.toggle("show", parsed.invalid.length > 0);
      const limit = Math.max(1, Math.min(+controls.firstN.value || 1, 80));
      state.colors = parsed.colors.slice(0, limit);
      state.points = state.colors.map((hex, index) => ({ hex, index: index + 1, ...oklch(hex) }));
    }

    function fieldLabel(field) {
      return field.charAt(0).toUpperCase() + field.slice(1);
    }

