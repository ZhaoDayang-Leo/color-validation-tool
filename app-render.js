    function render() {
      updatePoints();
      el("weightLVal").textContent = trimNum(+controls.weightL.value);
      el("weightCVal").textContent = trimNum(+controls.weightC.value);
      el("weightHVal").textContent = trimNum(+controls.weightH.value);
      el("donutInnerVal").textContent = trimNum(+controls.donutInner.value);
      el("donutOuterVal").textContent = trimNum(+controls.donutOuter.value);
      el("lineWidthVal").textContent = trimNum(+controls.lineWidth.value);
      app.dataset.theme = controls.themeSelect.value;

      renderSummary();
      renderSwatches();
      renderScatter();
      renderRadar();
      renderMatrix();
      renderSampleCharts();
      resetCoolorsPaint();
    }

    function trimNum(n) {
      return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
    }

    function pairDistances() {
      const rows = [];
      for (let i = 0; i < state.points.length; i++) {
        for (let j = i + 1; j < state.points.length; j++) {
          rows.push({ a: state.points[i], b: state.points[j], value: distance(state.points[i], state.points[j]) });
        }
      }
      return rows;
    }

    function renderSummary() {
      const pairs = pairDistances();
      const min = pairs.length ? d3.min(pairs, d => d.value) : null;
      const avg = pairs.length ? d3.mean(pairs, d => d.value) : null;
      el("activeTitle").textContent = controls.paletteName.value.trim() || "未命名色板";
      el("activeSubtitle").textContent = `${state.colors.length} 个有效颜色，${pairs.length} 个两两组合`;
      el("metricCount").textContent = state.colors.length;
      el("metricMin").textContent = min == null ? "-" : min.toFixed(3);
      el("metricRisk").textContent = pairs.filter(d => d.value <= .125).length;
      el("metricAvg").textContent = avg == null ? "-" : avg.toFixed(3);
    }

    function renderSwatches() {
      el("swatches").innerHTML = state.points.map(d => `
        <div class="swatch">
          <div class="chip" style="background:${d.hex}"></div>
          <div class="swatch-meta">
            <strong>${d.index}. ${d.hex}</strong>
            <span class="muted">L ${d.lightness.toFixed(2)} C ${d.chroma.toFixed(2)}</span>
            <span class="muted">H ${d.hue.toFixed(0)}°</span>
          </div>
        </div>
      `).join("");
    }

    function clearChart(id) {
      const node = el(id);
      node.innerHTML = "";
      return d3.select(node).append("svg");
    }

    function renderScatter() {
      const svg = clearChart("scatterChart");
      const box = el("scatterChart").getBoundingClientRect();
      const width = Math.max(560, box.width || 620);
      const height = 760;
      const margin = { top: 64, right: 70, bottom: 78, left: 74 };
      const innerW = width - margin.left - margin.right;
      const innerH = height - margin.top - margin.bottom;
      svg.attr("viewBox", [0, 0, width, height]);
      const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
      const xField = controls.xField.value;
      const yField = controls.yField.value;
      const scales = {
        lightness: d3.scaleLinear().domain([0, 1]),
        chroma: d3.scaleLinear().domain([0, .3]),
        hue: d3.scaleLinear().domain([0, 360])
      };
      const x = scales[xField].copy().range([0, innerW]);
      const y = scales[yField].copy().range([innerH, 0]);
      const xTicks = xField === "chroma" ? d3.range(0, .301, .05) : x.ticks(6);
      const yTicks = yField === "lightness" ? d3.range(0, 1.01, .2) : y.ticks(6);
      g.append("g").attr("transform", `translate(0,${innerH})`).call(d3.axisBottom(x).tickValues(xTicks).tickFormat(d3.format(".2f"))).call(styleAxis);
      g.append("g").call(d3.axisLeft(y).tickValues(yTicks).tickFormat(yField === "lightness" ? d3.format(".1f") : d3.format(".2f"))).call(styleAxis);
      g.append("g").selectAll("line").data(x.ticks(6)).join("line")
        .attr("x1", d => x(d)).attr("x2", d => x(d)).attr("y1", 0).attr("y2", innerH)
        .attr("stroke", "#d2d2d2").attr("stroke-width", .8).attr("opacity", .7);
      g.append("g").selectAll("line").data(y.ticks(6)).join("line")
        .attr("x1", 0).attr("x2", innerW).attr("y1", d => y(d)).attr("y2", d => y(d))
        .attr("stroke", "#d2d2d2").attr("stroke-width", .8).attr("opacity", .7);

      if (xField === "chroma" && yField === "lightness") {
        const xMin = x(.10), xMax = x(.20), yTop = y(.90), yBottom = y(.50);
        g.append("rect")
          .attr("x", xMin).attr("y", yTop)
          .attr("width", xMax - xMin).attr("height", yBottom - yTop)
          .attr("fill", "#6078ff").attr("opacity", .10);
        [
          { x1: xMin, x2: xMin, y1: y(.93), y2: y(.47), color: "#2f5bff" },
          { x1: xMax, x2: xMax, y1: y(.93), y2: y(.47), color: "#2f5bff" },
          { x1: x(.087), x2: x(.30), y1: y(.90), y2: y(.90), color: "#13920f" },
          { x1: x(.087), x2: x(.30), y1: y(.50), y2: y(.50), color: "#13920f" }
        ].forEach(line => {
          g.append("line")
            .attr("x1", line.x1).attr("x2", line.x2).attr("y1", line.y1).attr("y2", line.y2)
            .attr("stroke", line.color).attr("stroke-width", 1.6).attr("stroke-dasharray", "3 4");
        });
        g.append("text").attr("x", x(.307)).attr("y", y(.90) + 6).text("0.90 ↑").attr("fill", "#13920f").attr("font-size", 22);
        g.append("text").attr("x", x(.307)).attr("y", y(.50) + 6).text("0.50 ↓").attr("fill", "#13920f").attr("font-size", 22);
        g.append("text").attr("x", x(.10)).attr("y", innerH + 56).attr("text-anchor", "middle").text("0.10 ↓").attr("fill", "#2f5bff").attr("font-size", 22);
        g.append("text").attr("x", x(.20)).attr("y", innerH + 56).attr("text-anchor", "middle").text("0.20 ↑").attr("fill", "#2f5bff").attr("font-size", 22);
      }

      g.append("text").attr("x", -10).attr("y", -30).text(`↑ ${fieldLabel(yField)}`).attr("fill", "#111").attr("font-weight", 700).attr("font-size", 20);
      g.append("text").attr("x", innerW + 6).attr("y", innerH + 62).attr("text-anchor", "end").text(`${fieldLabel(xField)} →`).attr("fill", "#111").attr("font-weight", 700).attr("font-size", 20);
      const dots = g.append("g").selectAll("g").data(state.points).join("g")
        .attr("transform", d => `translate(${x(d[xField])},${y(d[yField])})`);
      dots.append("circle").attr("r", 8).attr("fill", d => d.hex).attr("stroke", "none").attr("opacity", .96);
      dots.append("text").attr("y", 28).attr("text-anchor", "middle").attr("font-size", 18).attr("fill", "#8b929d").attr("font-weight", 700).text(d => d.index);
    }

    function renderRadar() {
      const svg = clearChart("radarChart");
      const box = el("radarChart").getBoundingClientRect();
      const width = Math.max(560, box.width || 620);
      const height = 760;
      const radius = Math.min(width, height) / 2 - 74;
      const inner = 116;
      svg.attr("viewBox", [0, 0, width, height]);
      const g = svg.append("g").attr("transform", `translate(${width / 2},${height / 2})`);
      const rField = controls.rField.value;
      const rScale = d3.scaleLinear().domain(rField === "chroma" ? [0, .3] : [0, 1]).range([inner, radius]);
      d3.range(0, 1.01, .125).forEach((t, i) => {
        const rr = inner + (radius - inner) * t;
        g.append("circle")
          .attr("r", rr)
          .attr("fill", "none")
          .attr("stroke", i === 0 || t === 1 ? "#111" : "#111")
          .attr("stroke-width", i === 0 || t === 1 ? .85 : .7)
          .attr("stroke-dasharray", i === 0 || t === 1 ? null : "3 5")
          .attr("opacity", i === 0 || t === 1 ? .8 : .7);
      });
      d3.range(0, 360, 30).forEach(angle => {
        const a = (angle - 90) * Math.PI / 180;
        g.append("line")
          .attr("x1", Math.cos(a) * (inner - 4)).attr("y1", Math.sin(a) * (inner - 4))
          .attr("x2", Math.cos(a) * (radius + 24)).attr("y2", Math.sin(a) * (radius + 24))
          .attr("stroke", "#111").attr("stroke-width", .7).attr("stroke-dasharray", "5 6").attr("opacity", .35);
      });
      const dots = g.append("g").selectAll("g").data(state.points).join("g")
        .attr("transform", d => {
          const a = (d.hue - 90) * Math.PI / 180;
          return `translate(${Math.cos(a) * rScale(d[rField])},${Math.sin(a) * rScale(d[rField])})`;
        });
      dots.append("circle").attr("r", 8).attr("fill", d => d.hex).attr("stroke", "none").attr("opacity", .96);
      dots.append("text").attr("y", 30).attr("text-anchor", "middle").attr("font-size", 18).attr("fill", "#8b929d").attr("font-weight", 700).text(d => d.index);
    }

    function styleAxis(g) {
      g.selectAll("path").attr("stroke", "#111").attr("stroke-width", 1.1);
      g.selectAll(".tick line").attr("stroke", "#111").attr("stroke-width", 1);
      g.selectAll("text").attr("fill", "#3f454d").attr("font-size", 14);
    }

    function renderMatrix() {
      const points = state.points;
      let html = "<table><thead><tr><th>颜色</th>";
      points.forEach(p => html += `<th>${p.index}</th>`);
      html += "</tr></thead><tbody>";
      points.forEach((row, i) => {
        html += `<tr><td><span class="pair"><span class="dot" style="background:${row.hex}"></span>${row.index}. ${row.hex}</span></td>`;
        points.forEach((col, j) => {
          if (j <= i) {
            html += `<td>·</td>`;
          } else {
            const value = distance(row, col);
            const klass = value <= .085 ? "bad" : value <= .125 ? "warn" : "good";
            html += `
              <td>
                <div class="matrix-pair-cell">
                  <div class="mini-pair">
                    <span style="background:${row.hex}"></span>
                    <span style="background:${col.hex}"></span>
                  </div>
                  <div class="mini-pair-indexes">${row.index}&nbsp;&nbsp;${col.index}</div>
                  <div class="matrix-distance ${klass}">${value.toFixed(2)}</div>
                </div>
              </td>
            `;
          }
        });
        html += "</tr>";
      });
      html += "</tbody></table>";
      el("distanceMatrix").innerHTML = html;
    }

    function renderSampleCharts() {
      renderDonut();
      renderBars();
      renderLines();
      renderStacked();
    }

    function colorAt(i) {
      return state.colors[i % Math.max(1, state.colors.length)] || "#999999";
    }

    function chartGroupCount() {
      return Math.max(1, Math.min(+controls.barOuter.value || 14, sample.length));
    }

    function chartSeriesCount() {
      return Math.max(1, Math.min(state.colors.length || +controls.firstN.value || 14, 80));
    }

    function chartSeries() {
      return Array.from({ length: chartSeriesCount() }, (_, index) => ({
        key: `series-${index + 1}`,
        index,
        color: colorAt(index)
      }));
    }

    function sampleValue(groupIndex, seriesIndex) {
      const wave = Math.sin(groupIndex * .85 + seriesIndex * .52) * 7;
      const lift = Math.cos(seriesIndex * .37) * 4;
      const trend = groupIndex * (1.2 + (seriesIndex % 4) * .18);
      return Math.max(4, Math.round(12 + (seriesIndex % 6) * 2.4 + wave + lift + trend));
    }

    function renderDonut() {
      const svg = clearChart("donutChart");
      const width = 460, height = 330;
      svg.attr("viewBox", [0, 0, width, height]);
      const n = Math.max(1, Math.min(+controls.firstN.value || 14, sample.length));
      const data = sample.slice(0, n).map((d, i) => ({ name: d.name, value: d.a + d.b + d.c, color: colorAt(i) }));
      const g = svg.append("g").attr("transform", `translate(${width / 2 - 70},${height / 2})`);
      const pie = d3.pie().value(d => d.value).sort(null)(data);
      const outerR = 140 * (+controls.donutOuter.value || .8);
      const innerR = outerR * (+controls.donutInner.value || .3);
      const arc = d3.arc().innerRadius(innerR).outerRadius(outerR).cornerRadius(2);
      g.selectAll("path").data(pie).join("path").attr("d", arc).attr("fill", d => d.data.color).attr("stroke", "var(--panel)").attr("stroke-width", 2);
      svg.append("g").attr("transform", `translate(${width - 145},40)`).selectAll("g").data(data.slice(0, 14)).join("g")
        .attr("transform", (_, i) => `translate(0,${i * 20})`)
        .call(item => {
          item.append("rect").attr("width", 12).attr("height", 12).attr("rx", 2).attr("fill", d => d.color);
          item.append("text").attr("x", 20).attr("y", 10).attr("fill", "var(--muted)").attr("font-size", 12).text(d => d.name);
        });
    }

    function renderBars() {
      const svg = clearChart("barChart");
      const width = 560, height = 330, margin = { top: 20, right: 24, bottom: 48, left: 54 };
      svg.attr("viewBox", [0, 0, width, height]);
      const n = chartGroupCount();
      const data = sample.slice(0, n);
      const series = chartSeries();
      const x0 = d3.scaleBand().domain(data.map(d => d.name)).range([margin.left, width - margin.right]).paddingInner(.24);
      const x1 = d3.scaleBand().domain(series.map(d => d.key)).range([0, x0.bandwidth()]).padding(.12);
      const y = d3.scaleLinear().domain([0, d3.max(data, (_, groupIndex) => d3.max(series, item => sampleValue(groupIndex, item.index)))]).nice().range([height - margin.bottom, margin.top]);
      svg.append("g").attr("transform", `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x0).tickSizeOuter(0)).call(styleAxis);
      svg.append("g").attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y).ticks(4)).call(styleAxis);
      svg.append("g").selectAll("g").data(data).join("g").attr("transform", d => `translate(${x0(d.name)},0)`)
        .selectAll("rect").data((_, groupIndex) => series.map(item => ({ key: item.key, value: sampleValue(groupIndex, item.index), color: item.color }))).join("rect")
        .attr("x", d => x1(d.key)).attr("y", d => y(d.value)).attr("width", x1.bandwidth()).attr("height", d => y(0) - y(d.value)).attr("fill", d => d.color).attr("rx", 2);
    }

    function renderLines() {
      const svg = clearChart("lineChart");
      const width = 560, height = 330, margin = { top: 22, right: 30, bottom: 48, left: 54 };
      svg.attr("viewBox", [0, 0, width, height]);
      const n = chartGroupCount();
      const data = sample.slice(0, n);
      const series = chartSeries();
      const x = d3.scalePoint().domain(data.map(d => d.name)).range([margin.left, width - margin.right]).padding(.35);
      const y = d3.scaleLinear().domain([0, d3.max(data, (_, groupIndex) => d3.max(series, item => sampleValue(groupIndex, item.index)))]).nice().range([height - margin.bottom, margin.top]);
      svg.append("g").attr("transform", `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x).tickSizeOuter(0)).call(styleAxis);
      svg.append("g").attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y).ticks(4)).call(styleAxis);
      const line = d3.line().x(d => x(d.name)).y(d => y(d.value)).curve(d3.curveMonotoneX);
      series.forEach(item => {
        const lineData = data.map((d, groupIndex) => ({ name: d.name, value: sampleValue(groupIndex, item.index) }));
        svg.append("path").datum(lineData).attr("d", line).attr("fill", "none").attr("stroke", item.color).attr("stroke-width", +controls.lineWidth.value || 2).attr("opacity", .9);
        svg.append("g").selectAll("circle").data(lineData).join("circle").attr("cx", d => x(d.name)).attr("cy", d => y(d.value)).attr("r", 2.6).attr("fill", item.color);
      });
    }

    function renderStacked() {
      const svg = clearChart("stackChart");
      const width = 560, height = 330, margin = { top: 22, right: 30, bottom: 48, left: 54 };
      svg.attr("viewBox", [0, 0, width, height]);
      const n = chartGroupCount();
      const series = chartSeries();
      const keys = series.map(item => item.key);
      const data = sample.slice(0, n).map((d, groupIndex) => ({
        name: d.name,
        ...Object.fromEntries(series.map(item => [item.key, sampleValue(groupIndex, item.index)]))
      }));
      const stack = d3.stack().keys(keys)(data);
      const x = d3.scaleBand().domain(data.map(d => d.name)).range([margin.left, width - margin.right]).padding(.28);
      const y = d3.scaleLinear().domain([0, d3.max(stack.at(-1), d => d[1])]).nice().range([height - margin.bottom, margin.top]);
      svg.append("g").attr("transform", `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x).tickSizeOuter(0)).call(styleAxis);
      svg.append("g").attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y).ticks(4)).call(styleAxis);
      svg.append("g").selectAll("g").data(stack).join("g").attr("fill", (_, i) => colorAt(i))
        .selectAll("rect").data(d => d).join("rect")
        .attr("x", d => x(d.data.name)).attr("y", d => y(d[1])).attr("height", d => y(d[0]) - y(d[1])).attr("width", x.bandwidth()).attr("rx", 1.5);
    }

    controls.paletteSelect.addEventListener("change", e => selectPalette(e.target.value));
    Object.values(controls).forEach(control => {
      if (control.id !== "paletteSelect") control.addEventListener("input", render);
    });
    window.addEventListener("resize", () => render());

    el("saveBtn").addEventListener("click", () => {
      const parsed = parseColors(controls.colorInput.value);
      if (!parsed.colors.length || parsed.invalid.length) {
        render();
        return;
      }
      const name = controls.paletteName.value.trim() || "未命名色板";
      const existing = state.palettes.find(p => p.id === state.selectedId);
      if (existing) {
        existing.name = name;
        existing.colors = parsed.colors;
      } else {
        state.selectedId = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
        state.palettes.push({ id: state.selectedId, name, colors: parsed.colors });
      }
      persistPalettes();
      refreshPaletteSelect();
      render();
    });

    el("newBtn").addEventListener("click", () => {
      state.selectedId = "";
      controls.paletteSelect.value = "";
      controls.paletteName.value = `新色板 ${new Date().toLocaleDateString("zh-CN")}`;
      controls.colorInput.value = "";
      render();
    });

    el("deleteBtn").addEventListener("click", () => {
      if (!state.selectedId) return;
      state.palettes = state.palettes.filter(p => p.id !== state.selectedId);
      if (!state.palettes.length) state.palettes = DEFAULT_PALETTES.map(p => ({ ...p, id: `${p.id}-${Date.now()}` }));
      persistPalettes();
      selectPalette(state.palettes[0].id);
    });

    initCoolorsInteraction();
    loadPalettes();
    refreshPaletteSelect();
    selectPalette(state.selectedId);
    loadGoogleSheetPalettes().catch(() => {});
