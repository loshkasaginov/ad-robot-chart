(function () {
  const NS = "http://www.w3.org/2000/svg";
  const make = (tag, attrs = {}) => {
    const node = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
    return node;
  };

  function smoothPath(points) {
    if (points.length < 2) return "";
    let d = `M ${points[0][0]} ${points[0][1]}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];
      const c1x = p1[0] + (p2[0] - p0[0]) / 6;
      const c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6;
      const c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2[0]} ${p2[1]}`;
    }
    return d;
  }

  function renderTimeSeriesChart(target, config) {
    const { dates, area, spline, line, bar } = config;
    const lengths = [dates, area, spline, line, bar].map((v) => v.length);
    if (!lengths.every((v) => v === lengths[0]) || dates.length < 2) {
      throw new Error("All five arrays must have the same length (at least 2 points).");
    }

    target.replaceChildren();
    const width = 760, height = 378;
    const pad = { top: 30, right: 28, bottom: 30, left: 28 };
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;
    const values = [...area, ...spline, ...line, ...bar, 0];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const x = (i) => pad.left + (i * plotW) / (dates.length - 1);
    const y = (v) => pad.top + plotH - ((v - min) / range) * plotH;
    const points = (series) => series.map((v, i) => [x(i), y(v)]);

    const svg = make("svg", { viewBox: `0 0 ${width} ${height}`, role: "img" });
    for (let i = 0; i <= 4; i++) {
      svg.append(make("line", { x1: pad.left, x2: width - pad.right, y1: pad.top + (i * plotH) / 4, y2: pad.top + (i * plotH) / 4, class: "grid-line" }));
    }

    const bars = points(bar);
    const barWidth = Math.min(18, plotW / dates.length / 3);
    bars.forEach(([bx, by], i) => svg.append(make("rect", { x: bx - barWidth / 2, y: by, width: barWidth, height: Math.max(2, y(0) - by), rx: 1.5, class: "bar", "data-index": i })));

    const areaPts = points(area);
    const areaD = `${smoothPath(areaPts)} L ${x(dates.length - 1)} ${y(0)} L ${x(0)} ${y(0)} Z`;
    svg.append(make("path", { d: areaD, class: "area" }));
    svg.append(make("path", { d: smoothPath(points(spline)), class: "spline" }));
    svg.append(make("path", { d: points(line).map((p, i) => `${i ? "L" : "M"} ${p[0]} ${p[1]}`).join(" "), class: "line" }));
    points(line).forEach(([px, py]) => svg.append(make("rect", { x: px - 3.5, y: py - 3.5, width: 7, height: 7, class: "line-point" })));

    const hover = make("line", { y1: pad.top, y2: height - pad.bottom, class: "hover-line" });
    svg.append(hover);
    const hit = make("rect", { x: pad.left, y: pad.top, width: plotW, height: plotH, fill: "transparent" });
    svg.append(hit);
    target.append(svg);

    const tooltip = document.createElement("div");
    tooltip.className = "tooltip";
    target.append(tooltip);
    const colors = ["#f5df34", "#4590f5", "#188620", "#c132e6"];
    const labels = ["Cost", "CPA", "ROI confirmed", "Conversions"];
    const series = [area, bar, spline, line];
    const format = (v, i) => i < 2 ? Number(v).toFixed(2) : Number(v).toFixed(v % 1 ? 2 : 0);

    hit.addEventListener("pointermove", (event) => {
      const rect = svg.getBoundingClientRect();
      const svgX = ((event.clientX - rect.left) / rect.width) * width;
      const index = Math.max(0, Math.min(dates.length - 1, Math.round(((svgX - pad.left) / plotW) * (dates.length - 1))));
      const px = x(index);
      hover.setAttribute("x1", px); hover.setAttribute("x2", px); hover.style.opacity = "1";
      tooltip.innerHTML = `<div class="tooltip-date">${dates[index]}</div>` + labels.map((label, i) => `<div class="tip-row"><span class="tip-dot" style="background:${colors[i]}"></span><span>${label}:</span><b>${format(series[i][index], i)}</b></div>`).join("");
      tooltip.style.left = `${(px / width) * 100}%`;
      tooltip.style.top = `${Math.max(120, Math.min(...series.map((s) => y(s[index])))) / height * 100}%`;
      tooltip.classList.add("visible");
    });
    hit.addEventListener("pointerleave", () => { tooltip.classList.remove("visible"); hover.style.opacity = "0"; });
  }

  window.renderTimeSeriesChart = renderTimeSeriesChart;
})();
