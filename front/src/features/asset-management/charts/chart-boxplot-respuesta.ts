/**
 * KPI 11 — Tiempo de respuesta gerencial (Box Plot)
 *
 * JSON shape:
 * interface BoxCategory { tipo: string; valores: number[]; }  // dias
 *
 * Why: Box plots reveal distribution shape (skew, outliers) that
 * mean/median alone hide. A hard SLA line at 5 days makes violations
 * immediately visible without calculation.
 */
import * as d3 from 'd3';

export interface BoxCategory {
  tipo: string;
  valores: number[];
}

const PAL = {
  primary: '#1A1A2E', accent: '#E94560', ok: '#4CAF50',
  warning: '#FF9800', danger: '#F44336', text: '#1E293B', textMuted: '#64748B', border: '#E2E8F0',
};

interface BoxStats {
  tipo: string;
  q1: number; median: number; q3: number;
  min: number; max: number;
  outliers: number[];
  iqr: number;
}

function computeBox(cat: BoxCategory): BoxStats {
  const sorted = [...cat.valores].sort(d3.ascending);
  const q1 = d3.quantile(sorted, 0.25) ?? 0;
  const median = d3.quantile(sorted, 0.5) ?? 0;
  const q3 = d3.quantile(sorted, 0.75) ?? 0;
  const iqr = q3 - q1;
  const lo = q1 - 1.5 * iqr;
  const hi = q3 + 1.5 * iqr;
  const inliers = sorted.filter(v => v >= lo && v <= hi);
  return {
    tipo: cat.tipo,
    q1, median, q3, iqr,
    min: inliers.length ? inliers[0] : q1,
    max: inliers.length ? inliers[inliers.length - 1] : q3,
    outliers: sorted.filter(v => v < lo || v > hi),
  };
}

export function renderChartBoxplotRespuesta(
  container: string | HTMLElement,
  data: BoxCategory[] | null,
) {
  const root = typeof container === 'string'
    ? (document.querySelector(container) as HTMLElement) : container;
  if (!root) return;
  root.innerHTML = '';

  if (!data || data.length === 0) {
    root.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:200px;color:${PAL.textMuted};font-family:sans-serif;">Sin datos disponibles</div>`;
    return;
  }

  const SLA_DAYS = 5;
  const M = { top: 24, right: 32, bottom: 48, left: 64 };
  const W = 600;
  const H = 320;
  const iW = W - M.left - M.right;
  const iH = H - M.top - M.bottom;
  const boxWidth = Math.min(40, iW / data.length - 20);

  const svg = d3.select(root).append('svg')
    .attr('width', '100%')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')
    .style('font-family', 'Inter, sans-serif');

  const g = svg.append('g').attr('transform', `translate(${M.left},${M.top})`);

  const tooltip = d3.select(root).append('div')
    .style('position', 'absolute').style('pointer-events', 'none')
    .style('background', PAL.primary).style('color', '#fff')
    .style('padding', '8px 12px').style('border-radius', '6px')
    .style('font-size', '12px').style('opacity', '0')
    .style('transition', 'opacity .15s').style('z-index', '100');

  const stats = data.map(computeBox);
  const allVals = stats.flatMap(s => [s.min, s.max, ...s.outliers]);
  const yMax = Math.max(...allVals) * 1.1;

  const xScale = d3.scaleBand()
    .domain(stats.map(s => s.tipo))
    .range([0, iW]).padding(0.4);

  const yScale = d3.scaleLinear().domain([0, yMax]).range([iH, 0]);

  // Grid
  g.append('g').call(d3.axisLeft(yScale).ticks(5).tickSize(-iW).tickFormat(() => ''))
    .select('.domain').remove();
  g.selectAll('.tick line').attr('stroke', PAL.border);

  // SLA line
  g.append('line').attr('x1', 0).attr('x2', iW)
    .attr('y1', yScale(SLA_DAYS)).attr('y2', yScale(SLA_DAYS))
    .attr('stroke', PAL.danger).attr('stroke-width', 1.5).attr('stroke-dasharray', '6,3');
  g.append('text').attr('x', iW + 4).attr('y', yScale(SLA_DAYS) + 4)
    .style('font-size', '10px').style('fill', PAL.danger).text(`SLA ${SLA_DAYS}d`);

  // Boxes
  stats.forEach(s => {
    const cx = (xScale(s.tipo) ?? 0) + xScale.bandwidth() / 2;
    const color = s.median > SLA_DAYS ? PAL.danger : PAL.ok;

    // Whiskers
    g.append('line').attr('x1', cx).attr('x2', cx)
      .attr('y1', yScale(s.min)).attr('y2', yScale(s.q1))
      .attr('stroke', PAL.textMuted).attr('stroke-width', 1.5).attr('stroke-dasharray', '3,2');
    g.append('line').attr('x1', cx).attr('x2', cx)
      .attr('y1', yScale(s.q3)).attr('y2', yScale(s.max))
      .attr('stroke', PAL.textMuted).attr('stroke-width', 1.5).attr('stroke-dasharray', '3,2');
    // Whisker caps
    [s.min, s.max].forEach(v => {
      g.append('line')
        .attr('x1', cx - boxWidth * 0.3).attr('x2', cx + boxWidth * 0.3)
        .attr('y1', yScale(v)).attr('y2', yScale(v))
        .attr('stroke', PAL.textMuted).attr('stroke-width', 1.5);
    });

    // Box rect
    g.append('rect')
      .attr('x', cx - boxWidth / 2).attr('y', yScale(s.q3))
      .attr('width', boxWidth).attr('height', yScale(s.q1) - yScale(s.q3))
      .attr('fill', color).attr('fill-opacity', 0.2)
      .attr('stroke', color).attr('stroke-width', 1.8).attr('rx', 3)
      .style('cursor', 'pointer')
      .on('mousemove', (event) => {
        tooltip.style('opacity', '1')
          .html(`<b>${s.tipo}</b><br/>Min: ${s.min.toFixed(1)}d<br/>Q1: ${s.q1.toFixed(1)}d<br/>Mediana: ${s.median.toFixed(1)}d<br/>Q3: ${s.q3.toFixed(1)}d<br/>Max: ${s.max.toFixed(1)}d`)
          .style('left', `${event.offsetX + 12}px`)
          .style('top', `${event.offsetY - 10}px`);
      })
      .on('mouseleave', () => tooltip.style('opacity', '0'));

    // Median line
    g.append('line')
      .attr('x1', cx - boxWidth / 2).attr('x2', cx + boxWidth / 2)
      .attr('y1', yScale(s.median)).attr('y2', yScale(s.median))
      .attr('stroke', color).attr('stroke-width', 3);

    // Outliers
    s.outliers.forEach(v => {
      g.append('circle').attr('cx', cx).attr('cy', yScale(v)).attr('r', 4)
        .attr('fill', 'none').attr('stroke', PAL.warning).attr('stroke-width', 1.5)
        .style('cursor', 'pointer')
        .on('mousemove', (event) => {
          tooltip.style('opacity', '1')
            .html(`<b>${s.tipo}</b><br/>Outlier: ${v.toFixed(1)} días`)
            .style('left', `${event.offsetX + 12}px`)
            .style('top', `${event.offsetY - 10}px`);
        })
        .on('mouseleave', () => tooltip.style('opacity', '0'));
    });
  });

  // Axes
  g.append('g').attr('transform', `translate(0,${iH})`)
    .call(d3.axisBottom(xScale).tickSize(0))
    .select('.domain').remove();
  g.selectAll('.tick text').style('font-size', '11px').call(wrapText, xScale.bandwidth() + 10);

  g.append('g').call(d3.axisLeft(yScale).ticks(5).tickFormat(v => `${v}d`))
    .selectAll('text').style('font-size', '11px');

  // Y-axis label
  svg.append('text')
    .attr('transform', `translate(14,${M.top + iH / 2}) rotate(-90)`)
    .attr('text-anchor', 'middle').style('font-size', '11px').style('fill', PAL.textMuted)
    .text('Días de respuesta');
}

function wrapText(selection: d3.Selection<d3.BaseType, unknown, d3.BaseType, unknown>, width: number) {
  selection.each(function () {
    const textEl = d3.select(this);
    const words = (textEl.text() as string).split(/[\s_-]+/).reverse();
    let word: string | undefined;
    let line: string[] = [];
    let lineNumber = 0;
    const lineHeight = 1.1;
    const y = textEl.attr('y');
    const dy = parseFloat(textEl.attr('dy') ?? '0');
    textEl.text(null);
    let tspan = textEl.append('tspan').attr('x', 0).attr('y', y).attr('dy', `${dy}em`);
    while ((word = words.pop())) {
      line.push(word);
      tspan.text(line.join(' '));
      if ((tspan.node() as SVGTextContentElement).getComputedTextLength() > width) {
        line.pop();
        tspan.text(line.join(' '));
        line = [word];
        tspan = textEl.append('tspan').attr('x', 0).attr('y', y).attr('dy', `${++lineNumber * lineHeight + dy}em`).text(word);
      }
    }
  });
}
