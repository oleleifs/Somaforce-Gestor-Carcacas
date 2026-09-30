/* =========================================================
   GRÁFICOS
   Configuração e atualização dos gráficos (Chart.js).
   ========================================================= */

function configurarChartJs() {
    Chart.defaults.color = '#9a9a9a';
    Chart.defaults.font.family = "'Libre Franklin', system-ui, sans-serif";
    Chart.defaults.font.size = 12;
    Chart.defaults.borderColor = 'rgba(255,255,255,.06)';
    Chart.defaults.plugins.legend.display = false;
    Chart.defaults.plugins.tooltip.backgroundColor = '#222';
    Chart.defaults.plugins.tooltip.borderColor = '#C8232D';
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.maintainAspectRatio = false;
}

function barraHorizontal(id, labels, valores, campoFiltro) {
    const selecionado = campoFiltro ? filtros[campoFiltro] : '';
    const cores = labels.map(l => !selecionado || l === selecionado ? '#C8232D' : '#4a4a4a');
    const encurtar = s => s.length > 22 ? s.slice(0, 21) + '…' : s;

    if (charts[id]) {
        const c = charts[id];
        c.data.labels = labels;
        c.data.datasets[0].data = valores;
        c.data.datasets[0].backgroundColor = cores;
        c.update();
        return;
    }

    charts[id] = new Chart(document.getElementById(id), {
        type: 'bar',
        data: { labels, datasets: [{ data: valores, backgroundColor: cores, borderRadius: 3, maxBarThickness: 26 }] },
        options: {
            indexAxis: 'y',
            scales: {
                x: { beginAtZero: true, ticks: { precision: 0 } },
                y: { grid: { display: false }, ticks: { callback(v) { return encurtar(this.getLabelForValue(v)); } } }
            },
            onClick: campoFiltro ? (evt, els, chart) => {
                if (els.length) setFiltro(campoFiltro, chart.data.labels[els[0].index]);
            } : undefined,
            onHover: campoFiltro ? (evt, els) => { evt.native.target.style.cursor = els.length ? 'pointer' : 'default'; } : undefined
        }
    });
}

function renderCharts() {
    // Por mês
    const mes = porMes(filtrados);
    if (charts.cMes) {
        charts.cMes.data.labels = mes.labels;
        charts.cMes.data.datasets[0].data = mes.valores;
        charts.cMes.update();
    } else {
        charts.cMes = new Chart(document.getElementById('cMes'), {
            type: 'bar',
            data: { labels: mes.labels, datasets: [{ data: mes.valores, backgroundColor: '#C8232D', hoverBackgroundColor: '#E0444D', borderRadius: 3, maxBarThickness: 48 }] },
            options: { scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { grid: { display: false } } } }
        });
    }

    const vend = contarPor(filtrados, 'vendedor');
    barraHorizontal('cVend', vend.map(e => e[0]), vend.map(e => e[1]), 'vendedor');

    const marca = contarPor(filtrados, 'marca');
    barraHorizontal('cMarca', marca.map(e => e[0]), marca.map(e => e[1]), 'marca');

    const peca = contarPor(filtrados, 'peca').slice(0, 10);
    barraHorizontal('cPeca', peca.map(e => e[0]), peca.map(e => e[1]), null);
}
