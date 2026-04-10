/**
 * KPI 4 — Ratio preventivo vs correctivo por área (100% Stacked Bar)
 *
 * JSON shape:
 * interface RatioAreaItem {
 *   area: string;
 *   preventivo: { count: number; costoTotal: number };
 *   correctivo: { count: number; costoTotal: number };
 *   calibracion: { count: number; costoTotal: number };
 * }
 *
 * Why: 100% stacked bars highlight the composition ratio (not absolute volume).
 * The 70% benchmark line anchors the industrial maintenance standard (preventive-first).
 */
import * as d3 from 'd3';

export interface RatioAreaItem {
  area: string;
  preventivo: { count: number; costoTotal: number };
  correctivo: { count: number; costoTotal: number };
  calibracion: { count: number; costoTotal: number };
}

const PAL = {
  primary: '#1A1A2E', ok: '#4CAF50', warning: '#FF9800', danger: '#F44336',
  calibracion: '#3B82F6', text: '#1E293B', textMuted: '#64748B', border: '#E2E8F0',
};

export function renderChartRatioMantenimiento(container: string | HTMLElement, data: RatioAreaItem[] | null) {
  const root = typeof container === 'string'
    ? (document.querySelector(container) as HTMLElement) : container;
  if (!root) return;
  root.innerHTML = '';

  if (!data || data.length === 0) {
    root.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:200px;color:${PAL.textMuted};font-family:sans-serif;">Sin datos disponibles</div>`;
    return;
  }

  const margin = { top: 20, right: 160, bottom: 40, left: 180 };
  const ROW_H = 42;
  const height = data.length * ROW_H + margin.top + margin.bottom;

  const svg = d3.select(root).append('svg')
    .attr('width', '100%')
    .attr('viewBox', `0 0 820 ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')
    .style('font-family', 'Inter, sans-serif');

  const innerW = 820 - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const tooltip = d3.select(root).append('div')
    .style('position', 'absolute').style('pointer-events', 'none')
    .style('background', PAL.primary).style('color', '#fff')
    .style('padding', '8px 12px').style('border-radius', '6px')
    .style('font-size', '12px').style('opacity', '0')
    .style('transition', 'opacity .15s').style('z-index', '100');

  const xScale = d3.scaleLinear().domain([0, 100]).range([0, innerW]);
  const yScale = d3.scaleBand().domain(data.map(d => d.area)).range([0, innerH]).padding(0.3);
  const bandwidth = yScale.bandwidth();

  // Bars
  data.forEach(d => {
    const total = d.preventivo.count + d.correctivo.count + d.calibracion.count;
    if (total === 0) return;

    const pPct = (d.preventivo.count / total) * 100;
    const cPct = (d.correctivo.count / total) * 100;
    const calPct = (d.calibracion.count / total) * 100;
    const y0 = yScale(d.area) ?? 0;

    const segments = [
      { label: 'Preventivo', pct: pPct, cost: d.preventivo.costoTotal, color: PAL.ok, x: 0 },
      { label: 'Correctivo', pct: cPct, cost: d.correctivo.costoTotal, color: PAL.danger, x: pPct },
      { label: 'Calibración', pct: calPct, cost: d.calibracion.costoTotal, color: PAL.calibracion, x: pPct + cPct },
    ];

    segments.forEach(seg => {
      if (seg.pct === 0) return;
      g.append('rect')
        .attr('x', xScale(seg.x))
        .attr('y', y0)
        .attr('width', xScale(seg.pct))
        .attr('height', bandwidth)
        .attr('fill', seg.color)
        .attr('rx', 2)
        .on('mousemove', (event) => {
          tooltip.style('opacity', '1')
            .html(`<b>${d.area}</b><br/>${seg.label}: ${seg.pct.toFixed(1)}% (${seg.cost === 0 ? '—' : '$' + seg.cost.toLocaleString('es-EC')})`)
            .style('left', `${event.offsetX + 12}px`)
            .style('top', `${event.offsetY - 10}px`);
        })
        .on('mouseleave', () => tooltip.style('opacity', '0'));

      // Label inside bar if big enough
      if (seg.pct > 10) {
        g.append('text')
          .attr('x', xScale(seg.x) + xScale(seg.pct) / 2)
          .attr('y', y0 + bandwidth / 2 + 4)
          .attr('text-anchor', 'middle')
          .style('font-size', '11px').style('fill', '#fff').style('pointer-events', 'none')
          .text(`${seg.pct.toFixed(0)}%`);
      }
    });
  });

  // 70% benchmark line
  g.append('line')
    .attr('x1', xScale(70)).attr('x2', xScale(70))
    .attr('y1', -10).attr('y2', innerH + 6)
    .attr('stroke', PAL.warning)
    .attr('stroke-width', 2)
    .attr('stroke-dasharray', '5,3');

  g.append('text')
    .attr('x', xScale(70) + 4).attr('y', -14)
    .style('font-size', '10px').style('fill', PAL.warning).style('font-weight', '600')
    .text('70% benchmark');

  // Axes
  g.append('g').call(d3.axisLeft(yScale).tickSize(0)).select('.domain').remove();
  g.selectAll('.tick text').style('font-size', '11px').style('fill', PAL.text);

  g.append('g').attr('transform', `translate(0,${innerH})`)
    .call(d3.axisBottom(xScale).ticks(5).tickFormat(d => `${d}%`))
    .select('.domain').remove();

  // Legend
  const legend = svg.append('g').attr('transform', `translate(${820 - margin.right + 10}, ${margin.top})`);
  [
    { label: 'Preventivo', color: PAL.ok },
    { label: 'Correctivo', color: PAL.danger },
    { label: 'Calibración', color: PAL.calibracion },
  ].forEach(({ label, color }, i) => {
    legend.append('rect').attr('x', 0).attr('y', i * 22).attr('width', 12).attr('height', 12).attr('fill', color).attr('rx', 2);
    legend.append('text').attr('x', 16).attr('y', i * 22 + 10).text(label).style('font-size', '11px').style('fill', PAL.text);
  });
}
