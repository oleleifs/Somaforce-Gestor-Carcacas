/* =========================================================
   PAINEL
   Montagem do dashboard, indicadores, faixa de idade e ranking de clientes.
   ========================================================= */

function contarPor(linhas, campo) {
    const m = new Map();
    linhas.forEach(r => m.set(r[campo], (m.get(r[campo]) || 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

function porMes(linhas) {
    const m = new Map();
    linhas.forEach(r => {
        const k = `${r.data.getFullYear()}-${String(r.data.getMonth() + 1).padStart(2, '0')}`;
        m.set(k, (m.get(k) || 0) + 1);
    });
    const chaves = [...m.keys()].sort();
    if (!chaves.length) return { labels: [], valores: [] };

    // Preenche meses sem venda com zero para a linha do tempo não "pular"
    const [a0, m0] = chaves[0].split('-').map(Number);
    const [a1, m1] = chaves[chaves.length - 1].split('-').map(Number);
    const labels = [], valores = [];
    for (let a = a0, mm = m0; a < a1 || (a === a1 && mm <= m1); mm === 12 ? (a++, mm = 1) : mm++) {
        const k = `${a}-${String(mm).padStart(2, '0')}`;
        const nome = new Date(a, mm - 1, 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
        labels.push(`${nome}/${String(a).slice(2)}`);
        valores.push(m.get(k) || 0);
    }
    return { labels, valores };
}

function montarDashboard() {
    document.getElementById('empty').classList.add('hidden');
    document.getElementById('dash').classList.remove('hidden');
    document.getElementById('btnLimpar').classList.remove('hidden');

    if (meta) {
        const quando = new Date(meta.importadoEm);
        document.getElementById('metaImport').textContent =
            `Importado de ${meta.arquivo} em ${fmtData(quando)} às ${quando.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    }

    preencherSelect('fVend', contarPor(dados, 'vendedor').map(e => e[0]).sort((a, b) => a.localeCompare(b, 'pt-BR')), 'Todos');
    preencherSelect('fMarca', contarPor(dados, 'marca').map(e => e[0]).sort((a, b) => a.localeCompare(b, 'pt-BR')), 'Todas');
    sincronizarControles();
    atualizar();
}

function atualizar() {
    aplicarFiltros();
    renderChips();
    renderTabs();
    renderKPIs();
    renderAging();
    renderCharts();
    renderRankClientes();
    renderTabela();
}

function renderKPIs() {
    document.getElementById('kCarc').textContent = fmtNum(filtrados.length);
    document.getElementById('kVendas').textContent = fmtNum(new Set(filtrados.map(r => r.venda || Math.random())).size);
    document.getElementById('kClientes').textContent = fmtNum(new Set(filtrados.map(r => r.codCliente || r.cliente)).size);
    document.getElementById('kVelhas').textContent = fmtNum(filtrados.filter(r => r.dias > 90 && statusDe(r) !== 'concluida').length);
}

function renderAging() {
    // A faixa ignora o próprio filtro de idade, para sempre mostrar o quadro completo
    const faixaAtual = filtros.faixa;
    const base = filtrar({ ...filtros, faixa: '' });

    const total = base.length || 1;
    const cont = FAIXAS.map(f => base.filter(r => r.dias >= f.min && r.dias <= f.max).length);

    document.getElementById('ageBar').innerHTML = FAIXAS.map((f, i) => {
        if (!cont[i]) return '';
        const pct = cont[i] / total * 100;
        const dim = faixaAtual && faixaAtual !== f.id ? ' dim' : '';
        return `<button class="ageSeg${dim}" style="width:${pct}%;background:${f.cor}" title="${f.label}: ${cont[i]}" aria-label="Filtrar ${f.label}" onclick="setFiltro('faixa','${f.id}')">${pct >= 7 ? fmtNum(cont[i]) : ''}</button>`;
    }).join('') || '<div style="padding:16px;color:#666;font-size:.85rem">Sem vendas no filtro atual</div>';

    document.getElementById('ageLegend').innerHTML = FAIXAS.map((f, i) =>
        `<div><i style="background:${f.cor}"></i>${f.label}: <b>${fmtNum(cont[i])}</b></div>`
    ).join('');

    const media = base.length ? Math.round(base.reduce((s, r) => s + r.dias, 0) / base.length) : 0;
    document.getElementById('agingInfo').textContent = base.length
        ? `Média de ${media} dias desde a venda. Clique numa faixa para filtrar.`
        : '';
}


function renderRankClientes() {
    const top = contarPor(filtrados, 'cliente').slice(0, 10);
    document.getElementById('rankCli').innerHTML = top.length
        ? top.map(([nome, n]) => `<li><button class="n" title="${esc(nome)}" onclick="setFiltro('cliente', ${esc(JSON.stringify(nome))})">${esc(nome)}</button><span class="c">${fmtNum(n)}</span></li>`).join('')
        : '<li style="color:#666">Sem clientes no filtro atual</li>';
}
