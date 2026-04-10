/**
 * KPI 9 — Tasa de discrepancias por responsable (Radar / Spider Chart)
 *
 * JSON shape:
 * interface RadarDataset { label: string; color: string;
 *   values: Record<string, number>; }  // key = area name, value = 0–100
 * interface RadarData { areas: string[]; datasets: RadarDataset[]; }
 *
 * Why: Radar charts excel at comparing multi-dimensional performance
 * profiles. Two overlapping polygons (current vs previous period)
 * make deterioration instantly visible.
 */
import * as d3 from 'd3';

export interface RadarDataset {
  label: string;
  color: string;
  values: Record<string, number>;
}

export interface RadarData {
  areas: string[];
  datasets: RadarDataset[];
}

const PAL = {
  primary: '#1A1A2E', text: '#1E293B', textMuted: '#64748B', border: '#E2E8F0',
};

export function renderChartRadarDiscrepancias(container: string | HTMLElement, data: RadarData | null) {
  const root = typeof container === 'string'
    ? (document.querySelector(container) as HTMLElement) : container;
  if (!root) return;
  root.innerHTML = '';

  if (!data || !data.areas || data.areas.length === 0) {
    root.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:200px;color:${PAL.textMuted};font-family:sans-serif;">Sin datos disponibles</div>`;
    return;
  }

  const W = 560;
  const H = 420;
  const cx = W / 2;
  const cy = H / 2 - 10;
  const maxR = 150;
  const levels = 5;

  const svg = d3.select(root).append('svg')
    .attr('width', '100%')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')
    .style('font-family', 'Inter, sans-serif');

  const g = svg.append('g').attr('transform', `translate(${cx},${cy})`);

  const tooltip = d3.select(root).append('div')
    .style('position', 'absolute').style('pointer-events', 'none')
    .style('background', PAL.primary).style('color', '#fff')
    .style('padding', '8px 12px').style('border-radius', '6px')
    .style('font-size', '12px').style('opacity', '0')
    .style('transition', 'opacity .15s').style('z-index', '100');

  const n = data.areas.length;
  const angleSlice = (Math.PI * 2) / n;
  const rScale = d3.scaleLinear().domain([0, 100]).range([0, maxR]);

  // Grid circles
  for (let lvl = 1; lvl <= levels; lvl++) {
    const r = (maxR / levels) * lvl;
    g.append('circle').attr('r', r)
      .attr('fill', 'none').attr('stroke', PAL.border).attr('stroke-width', 0.8);
    g.append('text').attr('y', -r - 3).attr('text-anchor', 'middle')
      .style('font-size', '9px').style('fill', PAL.textMuted)
      .text(`${(100 / levels) * lvl}%`);
  }

  // Axis lines and labels
  data.areas.forEach((area, i) => {
    const angle = angleSlice * i - Math.PI / 2;
    const lx = Math.cos(angle) * (maxR + 24);
    const ly = Math.sin(angle) * (maxR + 24);
    const ex = Math.cos(angle) * maxR;
    const ey = Math.sin(angle) * maxR;

    g.append('line').attr('x1', 0).attr('y1', 0).attr('x2', ex).attr('y2', ey)
      .attr('stroke', PAL.border).attr('stroke-width', 1);

    const label = area.length > 12 ? area.substring(0, 12) + '…' : area;
    g.append('text').attr('x', lx).attr('y', ly)
      .attr('text-anchor', Math.abs(lx) < 10 ? 'middle' : lx > 0 ? 'start' : 'end')
      .attr('dominant-baseline', 'middle')
      .style('font-size', '11px').style('fill', PAL.text)
      .text(label);
  });

  // Polygons per dataset
  data.datasets.forEach(dataset => {
    const points = data.areas.map((area, i) => {
      const angle = angleSlice * i - Math.PI / 2;
      const val = dataset.values[area] ?? 0;
      const r = rScale(val);
      return [Math.cos(angle) * r, Math.sin(angle) * r] as [number, number];
    });

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ') + 'Z';

    g.append('path').attr('d', pathD)
      .attr('fill', dataset.color).attr('fill-opacity', 0.18)
      .attr('stroke', dataset.color).attr('stroke-width', 2);

    // Dots on vertices
    points.forEach((p, i) => {
      const area = data.areas[i];
      const val = dataset.values[area] ?? 0;
      g.append('circle')
        .attr('cx', p[0]).attr('cy', p[1]).attr('r', 5)
        .attr('fill', dataset.color).attr('stroke', '#fff').attr('stroke-width', 1.5)
        .style('cursor', 'pointer')
        .on('mousemove', (event) => {
          tooltip.style('opacity', '1')
            .html(`<b>${dataset.label}</b><br/>Área: ${area}<br/>Discrepancias: ${val.toFixed(1)}%`)
            .style('left', `${event.offsetX + 12}px`)
            .style('top', `${event.offsetY - 10}px`);
        })
        .on('mouseleave', () => tooltip.style('opacity', '0'));
    });
  });

  // Legend
  const legend = svg.append('g').attr('transform', `translate(16, ${H - 40})`);
  data.datasets.forEach(({ label, color }, i) => {
    legend.append('rect').attr('x', i * 180).attr('y', 0).attr('width', 12).attr('height', 12)
      .attr('fill', color).attr('opacity', 0.8).attr('rx', 2);
    legend.append('text').attr('x', i * 180 + 16).attr('y', 10)
      .style('font-size', '11px').style('fill', PAL.text).text(label);
  });
}
