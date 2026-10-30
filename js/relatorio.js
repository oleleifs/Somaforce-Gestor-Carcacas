/* =========================================================
   RELATÓRIO EM PDF
   Janela com os mesmos filtros do site (já preenchida com os filtros da tela),
   escolha das seções e geração do PDF direto no navegador (jsPDF + AutoTable).
   ========================================================= */

const SECOES_RELATORIO = [
    { id: 'resumo',   titulo: 'Resumo e tempo desde a venda', padrao: true },
    { id: 'vendedor', titulo: 'Por vendedor',                 padrao: true },
    { id: 'marca',    titulo: 'Por marca',                    padrao: true },
    { id: 'pecas',    titulo: 'Peças mais vendidas',          padrao: true },
    { id: 'clientes', titulo: 'Principais clientes',          padrao: true },
    { id: 'lista',    titulo: 'Lista de vendas',              padrao: true }
];

const SITUACOES_RELATORIO = [
    ['', 'Todas (sem as excluídas)'],
    ['pendente', 'Pendentes'],
    ['andamento', 'Em andamento'],
    ['concluida', 'Concluídas'],
    ['excluida', 'Excluídas']
];

/* ---------- Janela ---------- */
function opcoesSelect(valores, rotuloTodos, atual) {
    return `<option value="">${rotuloTodos}</option>` +
        valores.map(v => `<option value="${esc(v)}"${v === atual ? ' selected' : ''}>${esc(v)}</option>`).join('');
}

function ordenados(campo) {
    return contarPor(dados, campo).map(e => e[0]).sort((a, b) => String(a).localeCompare(String(b), 'pt-BR'));
}

function abrirRelatorio() {
    if (!dados.length) { toast('Importe a planilha antes de gerar o relatório.', true); return; }
    const f = filtros;
    const sel = (id, html) => { document.getElementById(id).innerHTML = html; };

    document.getElementById('rDe').value = f.de;
    document.getElementById('rAte').value = f.ate;
    sel('rVend', opcoesSelect(ordenados('vendedor'), 'Todos', f.vendedor));
    sel('rMarca', opcoesSelect(ordenados('marca'), 'Todas', f.marca));
    sel('rCliente', opcoesSelect(ordenados('cliente'), 'Todos', f.cliente));
    sel('rStatus', SITUACOES_RELATORIO.map(([k, n]) => `<option value="${k}"${k === f.status ? ' selected' : ''}>${n}</option>`).join(''));
    sel('rFaixa', `<option value="">Todas</option>` + FAIXAS.map(x => `<option value="${x.id}"${x.id === f.faixa ? ' selected' : ''}>${x.label}</option>`).join(''));
    document.getElementById('rBusca').value = f.busca;

    document.getElementById('rSecoes').innerHTML = SECOES_RELATORIO.map(s =>
        `<label class="relChk"><input type="checkbox" value="${s.id}"${s.padrao ? ' checked' : ''}> ${s.titulo}</label>`
    ).join('');

    atualizarContagemRelatorio();
    document.getElementById('relDialog').showModal();
}

function filtrosDoRelatorio() {
    const v = id => document.getElementById(id).value;
    return {
        de: v('rDe'), ate: v('rAte'), vendedor: v('rVend'), marca: v('rMarca'),
        cliente: v('rCliente'), status: v('rStatus'), faixa: v('rFaixa'), busca: v('rBusca').trim()
    };
}

function datasValidas(f) {
    return ['de', 'ate'].every(k => !f[k] || (f[k].length === 10 && paraData(f[k])));
}

function atualizarContagemRelatorio() {
    const f = filtrosDoRelatorio();
    const el = document.getElementById('relContagem');
    if (!datasValidas(f)) { el.textContent = 'Confira as datas (dd/mm/aaaa).'; return; }
    const n = filtrar(f).length;
    el.textContent = `${fmtNum(n)} ${n === 1 ? 'venda entra' : 'vendas entram'} neste relatório.`;
}

function usarFiltrosDaTela() {
    abrirRelatorio();
}

function limparFiltrosRelatorio() {
    ['rDe', 'rAte', 'rBusca'].forEach(id => { document.getElementById(id).value = ''; });
    ['rVend', 'rMarca', 'rCliente', 'rStatus', 'rFaixa'].forEach(id => { document.getElementById(id).value = ''; });
    atualizarContagemRelatorio();
}

/* ---------- Dados do relatório ---------- */
function descreverFiltros(f) {
    const partes = [];
    if (f.de || f.ate) partes.push(`Período: ${f.de || 'início'} a ${f.ate || 'hoje'}`);
    if (f.vendedor) partes.push(`Vendedor: ${f.vendedor}`);
    if (f.marca) partes.push(`Marca: ${f.marca}`);
    if (f.cliente) partes.push(`Cliente: ${f.cliente}`);
    partes.push(`Situação: ${SITUACOES_RELATORIO.find(s => s[0] === f.status)[1]}`);
    if (f.faixa) partes.push(`Idade: ${FAIXAS.find(x => x.id === f.faixa).label}`);
    if (f.busca) partes.push(`Busca: "${f.busca}"`);
    return partes.join('   |   ');
}

// Agrupa por um campo, com contagem por situação e +90 dias em aberto
function agrupar(linhas, chave, rotulo) {
    const m = new Map();
    linhas.forEach(r => {
        const k = chave(r);
        if (!m.has(k)) m.set(k, { nome: rotulo(r), total: 0, pendente: 0, andamento: 0, concluida: 0, excluida: 0, velhas: 0, linha: r });
        const g = m.get(k);
        const st = statusDe(r);
        g.total++; g[st]++;
        if (r.dias > 90 && st !== 'concluida' && st !== 'excluida') g.velhas++;
    });
    return [...m.values()].sort((a, b) => b.total - a.total || String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
}

/* ---------- PDF ---------- */
const COR = {
    escuro: [20, 20, 20], vermelho: [200, 35, 45], texto: [40, 40, 40],
    suave: [110, 110, 110], linha: [225, 225, 225], fundo: [246, 246, 246]
};
const COR_FAIXA = { f1: [90, 90, 90], f2: [154, 106, 46], f3: [200, 35, 45], f4: [122, 15, 20] };

function gerarRelatorioPDF() {
    if (!window.jspdf) { toast('Não foi possível carregar o gerador de PDF. Confira a internet e recarregue a página.', true); return; }
    const f = filtrosDoRelatorio();
    if (!datasValidas(f)) { toast('Confira as datas do relatório (dd/mm/aaaa).', true); return; }
    const secoes = new Set([...document.querySelectorAll('#rSecoes input:checked')].map(i => i.value));
    if (!secoes.size) { toast('Marque pelo menos uma seção para o relatório.', true); return; }

    const linhas = filtrar(f);
    if (!linhas.length) { toast('Nenhuma venda com esses filtros.', true); return; }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = 12;
    const agora = new Date();
    const geradoEm = `${fmtData(agora)} às ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

    // Cabeçalho da primeira página
    doc.setFillColor(...COR.escuro); doc.rect(0, 0, W, 26, 'F');
    doc.setFillColor(...COR.vermelho); doc.rect(0, 26, W, 1.6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(17);
    doc.text('Relatório de Carcaças', M, 12);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(200, 200, 200);
    doc.text('Somaforce Distribuidora de Autopeças - Gestor de Carcaças', M, 19);
    doc.text(`Gerado em ${geradoEm}`, W - M, 12, { align: 'right' });
    if (meta && meta.arquivo) doc.text(`Base: ${meta.arquivo}`, W - M, 19, { align: 'right' });

    doc.setTextColor(...COR.suave); doc.setFontSize(8.5);
    const filtrosTxt = doc.splitTextToSize('Filtros: ' + descreverFiltros(f), W - 2 * M);
    doc.text(filtrosTxt, M, 34);
    let y = 34 + filtrosTxt.length * 4 + 3;

    const titulo = txt => {
        if (y > H - 30) { doc.addPage(); y = 16; }
        doc.setFont('helvetica', 'bold'); doc.setFontSize(11.5); doc.setTextColor(...COR.escuro);
        doc.text(txt, M, y);
        doc.setFillColor(...COR.vermelho); doc.rect(M, y + 1.6, 14, 0.8, 'F');
        y += 5;
    };
    const tabela = (head, body, extra = {}) => {
        doc.autoTable({
            startY: y, head: [head], body, margin: { left: M, right: M, top: 14, bottom: 14 },
            theme: 'grid',
            styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 1.8, textColor: COR.texto, lineColor: COR.linha, lineWidth: 0.2, overflow: 'linebreak' },
            headStyles: { fillColor: COR.escuro, textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: COR.fundo },
            ...extra
        });
        y = doc.lastAutoTable.finalY + 8;
    };
    const n = v => fmtNum(v);
    const colsNum = (de, ate) => Object.fromEntries(Array.from({ length: ate - de + 1 }, (_, i) => [de + i, { halign: 'right' }]));

    // Resumo
    if (secoes.has('resumo')) {
        const abertas = linhas.filter(r => !['concluida', 'excluida'].includes(statusDe(r)));
        const kpis = [
            ['Carcaças (itens)', linhas.length],
            ['Vendas distintas', new Set(linhas.map((r, i) => r.venda || 'sem' + i)).size],
            ['Clientes', new Set(linhas.map(r => r.codCliente || r.cliente)).size],
            ['Em aberto', abertas.length],
            ['Em aberto há +90 dias', abertas.filter(r => r.dias > 90).length]
        ];
        titulo('Resumo');
        const gap = 4, bw = (W - 2 * M - gap * (kpis.length - 1)) / kpis.length;
        kpis.forEach(([rot, val], i) => {
            const x = M + i * (bw + gap);
            doc.setFillColor(...COR.fundo); doc.rect(x, y, bw, 17, 'F');
            doc.setFillColor(...(i === kpis.length - 1 ? COR.vermelho : COR.escuro)); doc.rect(x, y, 1.2, 17, 'F');
            doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(...(i === kpis.length - 1 ? COR.vermelho : COR.escuro));
            doc.text(n(val), x + 5, y + 8.5);
            doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...COR.suave);
            doc.text(rot, x + 5, y + 13.8);
        });
        y += 25;

        // Barra de tempo desde a venda
        titulo('Tempo desde a venda');
        const cont = FAIXAS.map(fx => linhas.filter(r => r.dias >= fx.min && r.dias <= fx.max).length);
        const total = linhas.length, larg = W - 2 * M;
        let x = M;
        FAIXAS.forEach((fx, i) => {
            if (!cont[i]) return;
            const w = cont[i] / total * larg;
            doc.setFillColor(...COR_FAIXA[fx.id]); doc.rect(x, y, w, 8, 'F');
            if (w > 14) {
                doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(255, 255, 255);
                doc.text(`${Math.round(cont[i] / total * 100)}%`, x + w / 2, y + 5.4, { align: 'center' });
            }
            x += w;
        });
        y += 13;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
        let lx = M;
        FAIXAS.forEach((fx, i) => {
            doc.setFillColor(...COR_FAIXA[fx.id]); doc.rect(lx, y - 2.6, 3, 3, 'F');
            doc.setTextColor(...COR.texto);
            const t = `${fx.label}: ${n(cont[i])}`;
            doc.text(t, lx + 4.5, y);
            lx += doc.getTextWidth(t) + 12;
        });
        const media = Math.round(linhas.reduce((s, r) => s + r.dias, 0) / total);
        doc.setTextColor(...COR.suave);
        doc.text(`Média de ${media} dias desde a venda`, W - M, y, { align: 'right' });
        y += 9;
    }

    const cabGrupo = ['Total', 'Pendentes', 'Em andamento', 'Concluídas', 'Abertas +90 dias'];
    const linhaGrupo = g => [n(g.total), n(g.pendente), n(g.andamento), n(g.concluida), n(g.velhas)];
    const destaque90 = col => ({
        didParseCell: d => { if (d.section === 'body' && d.column.index === col && d.cell.raw !== '0') { d.cell.styles.textColor = COR.vermelho; d.cell.styles.fontStyle = 'bold'; } }
    });

    if (secoes.has('vendedor')) {
        titulo('Por vendedor');
        tabela(['Vendedor', ...cabGrupo], agrupar(linhas, r => r.vendedor, r => r.vendedor).map(g => [g.nome, ...linhaGrupo(g)]),
            { columnStyles: colsNum(1, 5), ...destaque90(5) });
    }
    if (secoes.has('marca')) {
        titulo('Por marca');
        tabela(['Marca', ...cabGrupo], agrupar(linhas, r => r.marca, r => r.marca).map(g => [g.nome, ...linhaGrupo(g)]),
            { columnStyles: colsNum(1, 5), ...destaque90(5) });
    }
    if (secoes.has('pecas')) {
        titulo('Peças mais vendidas (top 15)');
        const grupos = agrupar(linhas, chavePeca, r => r.peca).slice(0, 15);
        const nSpec = CAMPOS_PECA.length;
        tabela(['Cód.', 'Peça', ...CAMPOS_PECA.map(c => c.titulo), 'Total', 'Em aberto', 'Abertas +90 dias'],
            grupos.map(g => [g.linha.codPeca || '-', g.nome,
                ...CAMPOS_PECA.map(c => { const v = specsDe(g.linha)[c.campo]; return v ? `${v}${c.unidade ? ' ' + c.unidade : ''}` : '-'; }),
                n(g.total), n(g.pendente + g.andamento), n(g.velhas)]),
            { columnStyles: { 0: { cellWidth: 24 }, ...colsNum(2 + nSpec, 4 + nSpec) }, ...destaque90(4 + nSpec) });
    }
    if (secoes.has('clientes')) {
        titulo('Principais clientes (top 15)');
        tabela(['Cód.', 'Cliente', 'Telefone', ...cabGrupo],
            agrupar(linhas, r => r.codCliente || r.cliente, r => r.cliente).slice(0, 15).map(g => [g.linha.codCliente || '-', g.nome, numerosDe(g.linha).map(formatarTelefone).join('\n') || '-', ...linhaGrupo(g)]),
            { columnStyles: { 0: { cellWidth: 20 }, 2: { cellWidth: 42 }, ...colsNum(3, 7) }, ...destaque90(7) });
    }
    if (secoes.has('lista')) {
        titulo(`Lista de vendas (${n(linhas.length)})`);
        const lista = [...linhas].sort((a, b) => b.dias - a.dias);
        tabela(['Data', 'Nº venda', 'Cliente', 'Peça', 'Medidas', 'Marca', 'Vendedor', 'Dias', 'Situação', 'Observação'],
            lista.map(r => [fmtData(r.data), r.venda || '-', r.cliente, `${r.peca}${r.codPeca ? ` (${r.codPeca})` : ''}`,
                resumoSpecs(r).replace(/·/g, '|') || '-', r.marca, r.vendedor, String(r.dias), STATUS[statusDe(r)].label, obsDe(r)]),
            {
                styles: { font: 'helvetica', fontSize: 7.5, cellPadding: 1.4, textColor: COR.texto, lineColor: COR.linha, lineWidth: 0.2, overflow: 'linebreak' },
                columnStyles: { 0: { cellWidth: 18 }, 1: { cellWidth: 17 }, 7: { halign: 'right', cellWidth: 11 }, 8: { cellWidth: 21 } },
                didParseCell: d => {
                    if (d.section === 'body' && d.column.index === 7 && +d.cell.raw > 90) { d.cell.styles.textColor = COR.vermelho; d.cell.styles.fontStyle = 'bold'; }
                }
            });
    }

    // Rodapé com número de página
    const paginas = doc.getNumberOfPages();
    for (let p = 1; p <= paginas; p++) {
        doc.setPage(p);
        doc.setDrawColor(...COR.linha); doc.setLineWidth(0.2); doc.line(M, H - 9, W - M, H - 9);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...COR.suave);
        doc.text(`Relatório de Carcaças - gerado em ${geradoEm}`, M, H - 5);
        doc.text(`Página ${p} de ${paginas}`, W - M, H - 5, { align: 'right' });
    }

    doc.save(`relatorio_carcacas_${isoDia(agora)}.pdf`);
    document.getElementById('relDialog').close();
    toast('Relatório gerado.');
}
