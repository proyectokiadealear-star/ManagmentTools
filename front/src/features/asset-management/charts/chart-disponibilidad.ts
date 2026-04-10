/**
 * KPI 2 — Disponibilidad real por área (Semicircle Gauge small multiples)
 *
 * JSON shape:
 * interface DisponibilidadArea {
 *   area: string; totalParadaHoras: number; cantidadFallas: number;
 * }
 * // periodoHorasTotal = total horas del período (ej. 720 para 30 días)
 *
 * Why: Gauges comunican instantáneamente si un KPI está en rango objetivo.
 * Small multiples permiten comparar todas las áreas de un vistazo.
 */
import * as d3 from 'd3';

export interface DisponibilidadArea {
  area: string;
  totalParadaHoras: number;
  cantidadFallas: number;
}

const PAL = {
  primary: '#1A1A2E', ok: '#4CAF50', warning: '#FF9800', danger: '#F44336',
  text: '#1E293B', textMuted: '#64748B', bg: '#F8FAFC', border: '#E2E8F0',
};

function gaugeColor(pct: number) {
  if (pct >= 90) return PAL.ok;
  if (pct >= 70) return PAL.warning;
  return PAL.danger;
}

function drawGauge(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  cx: number, cy: number, r: number,
  pct: number, label: string, subLabel: string,
) {
  const arc = d3.arc<d3.DefaultArcObject>();
  const startAngle = -Math.PI / 2;
  const endAngle = Math.PI / 2;

  // Background track
  svg.append('path')
    .datum({ startAngle, endAngle, innerRadius: r * 0.65, outerRadius: r } as d3.DefaultArcObject)
    .attr('d', arc)
    .attr('fill', PAL.border)
    .attr('transform', `translate(${cx},${cy})`);

  // Value arc
  const valueEnd = startAngle + (endAngle - startAngle) * (pct / 100);
  svg.append('path')
    .datum({ startAngle, endAngle: valueEnd, innerRadius: r * 0.65, outerRadius: r } as d3.DefaultArcObject)
    .attr('d', arc)
    .attr('fill', gaugeColor(pct))
    .attr('transform', `translate(${cx},${cy})`);

  // Center text — percentage
  svg.append('text')
    .attr('x', cx).attr('y', cy - r * 0.12)
    .attr('text-anchor', 'middle')
    .style('font-size', `${r * 0.38}px`)
    .style('font-weight', '700')
    .style('fill', gaugeColor(pct))
    .text(`${pct.toFixed(1)}%`);

  // Area label
  svg.append('text')
    .attr('x', cx).attr('y', cy + r * 0.18)
    .attr('text-anchor', 'middle')
    .style('font-size', `${r * 0.18}px`)
    .style('fill', PAL.text)
    .style('font-weight', '600')
    .text(label);

  // Sub label
  svg.append('text')
    .attr('x', cx).attr('y', cy + r * 0.38)
    .attr('text-anchor', 'middle')
    .style('font-size', `${r * 0.15}px`)
    .style('fill', PAL.textMuted)
    .text(subLabel);
}

export function renderChartDisponibilidad(
  container: string | HTMLElement,
  data: DisponibilidadArea[] | null,
  periodoHorasTotal = 720,
) {
  const root = typeof container === 'string'
    ? (document.querySelector(container) as HTMLElement) : container;
  if (!root) return;
  root.innerHTML = '';

  if (!data || data.length === 0) {
    root.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:200px;color:${PAL.textMuted};font-family:sans-serif;">Sin datos disponibles</div>`;
    return;
  }

  const GAUGE_W = 200;
  const GAUGE_H = 160;
  const cols = Math.min(data.length, 4);
  const rows = Math.ceil(data.length / cols);
  const totalW = cols * GAUGE_W;
  const totalH = rows * GAUGE_H;

  const svg = d3.select(root).append('svg')
    .attr('width', '100%')
    .attr('viewBox', `0 0 ${totalW} ${totalH}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')
    .style('font-family', 'Inter, sans-serif');

  // Tooltip
  const tooltip = d3.select(root).append('div')
    .style('position', 'absolute').style('pointer-events', 'none')
    .style('background', PAL.primary).style('color', '#fff')
    .style('padding', '8px 12px').style('border-radius', '6px')
    .style('font-size', '12px').style('opacity', '0')
    .style('transition', 'opacity .15s').style('z-index', '100');

  const r = 60;

  data.forEach((d, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = col * GAUGE_W + GAUGE_W / 2;
    const cy = row * GAUGE_H + GAUGE_H * 0.6;

    const disponibilidadPct = Math.max(0, ((periodoHorasTotal - d.totalParadaHoras) / periodoHorasTotal) * 100);

    drawGauge(
      svg as any,
      cx, cy, r,
      disponibilidadPct,
      d.area.length > 14 ? d.area.substring(0, 14) + '…' : d.area,
      `${d.totalParadaHoras.toFixed(1)}h parada`,
    );

    // Invisible hit area for tooltip
    svg.append('rect')
      .attr('x', col * GAUGE_W)
      .attr('y', row * GAUGE_H)
      .attr('width', GAUGE_W)
      .attr('height', GAUGE_H)
      .attr('fill', 'transparent')
      .on('mousemove', (event) => {
        tooltip.style('opacity', '1')
          .html(`<b>${d.area}</b><br/>Disponibilidad: ${disponibilidadPct.toFixed(1)}%<br/>Horas parada: ${d.totalParadaHoras.toFixed(1)}h<br/>Fallas: ${d.cantidadFallas}`)
          .style('left', `${event.offsetX + 12}px`)
          .style('top', `${event.offsetY - 10}px`);
      })
      .on('mouseleave', () => tooltip.style('opacity', '0'));
  });
}
