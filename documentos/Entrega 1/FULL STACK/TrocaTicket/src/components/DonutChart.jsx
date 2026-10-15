import React, { useEffect, useRef } from 'react';
import { Chart, ArcElement, DoughnutController, Tooltip } from 'chart.js';

Chart.register(ArcElement, DoughnutController, Tooltip);

/**
 * Gráfico de rosca (Chart.js). `items` = [{ label, value, color }].
 * Os filhos aparecem centralizados sobre o furo do gráfico.
 */
export default function DonutChart({ items, unit = 'un.', ariaLabel, children }) {
  const canvas = useRef(null);
  const chart = useRef(null);
  const total = items.reduce((sum, item) => sum + item.value, 0);

  // Cria o gráfico uma única vez e o destrói ao sair da tela.
  useEffect(() => {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    chart.current = new Chart(canvas.current, {
      type: 'doughnut',
      data: {
        labels: items.map((item) => item.label),
        datasets: [
          {
            data: items.map((item) => item.value),
            backgroundColor: items.map((item) => item.color),
            borderColor: '#fff',
            borderWidth: 2,
            hoverOffset: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        animation: reduceMotion ? false : undefined,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const value = ctx.parsed;
                const share = total ? Math.round((value / total) * 100) : 0;
                return ` ${ctx.label}: ${value.toLocaleString('pt-BR')} ${unit} (${share}%)`;
              },
            },
          },
        },
      },
    });
    return () => chart.current.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Atualiza os dados quando o usuário troca de aba (Setor / Canal / Idade).
  useEffect(() => {
    const instance = chart.current;
    if (!instance) return;
    instance.data.labels = items.map((item) => item.label);
    instance.data.datasets[0].data = items.map((item) => item.value);
    instance.data.datasets[0].backgroundColor = items.map((item) => item.color);
    instance.update();
  }, [items]);

  return (
    <div className="donut-chart">
      <canvas ref={canvas} role="img" aria-label={ariaLabel} />
      <div className="donut-chart-center">{children}</div>
    </div>
  );
}
