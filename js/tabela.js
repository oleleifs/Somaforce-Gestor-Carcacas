/* =========================================================
   TABELA
   Listagem de vendas, ordenação, paginação e exportação CSV.
   ========================================================= */

const COLS_TABELA = [
    { campo: 'data',     titulo: 'Data' },
    { campo: 'venda',    titulo: 'Nº venda' },
    { campo: 'cliente',  titulo: 'Cliente' },
    { campo: 'peca',     titulo: 'Peça' },
    { campo: 'marca',    titulo: 'Marca' },
    { campo: 'vendedor', titulo: 'Vendedor' },
    { campo: 'dias',     titulo: 'Dias' },
    { campo: 'status',   titulo: 'Situação' },
    { campo: 'obs',      titulo: 'Observação' }
];

function valorOrdem(r, campo) {
    if (campo === 'status') return STATUS_ORDEM.indexOf(statusDe(r));
    if (campo === 'obs') return obsDe(r);
    return r[campo];
}

let paginaAtual = []; // linhas visíveis na página (para "selecionar todas")

function renderTabela() {
    const idsPagina = () => paginaAtual.map(r => r.id);
    document.getElementById('thead').innerHTML =
        `<th class="chk"><input type="checkbox" id="chkTodos" aria-label="Selecionar todas desta página"></th>` +
        COLS_TABELA.map(c => {
            const on = ordem.campo === c.campo ? ` on${ordem.dir === 'desc' ? ' desc' : ''}` : '';
            return `<th><button class="${on.trim()}" onclick="ordenar('${c.campo}')">${c.titulo}</button></th>`;
        }).join('') + '<th></th>';

    const dir = ordem.dir === 'asc' ? 1 : -1;
    const ordenados = [...filtrados].sort((a, b) => {
        const x = valorOrdem(a, ordem.campo), y = valorOrdem(b, ordem.campo);
        if (x instanceof Date || typeof x === 'number') return (x - y) * dir;
        return String(x).localeCompare(String(y), 'pt-BR', { numeric: true }) * dir;
    });

    const totalPag = Math.max(1, Math.ceil(ordenados.length / PAGE_SIZE));
    pagina = Math.min(pagina, totalPag);
    paginaAtual = ordenados.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE);

    document.getElementById('tbody').innerHTML = paginaAtual.length ? paginaAtual.map(r => {
        const f = faixaDe(r.dias);
        const st = statusDe(r);
        const obs = obsDe(r);
        const id = esc(r.id);
        const sel = selecionados.has(r.id) ? ' checked' : '';
        const controleStatus = st === 'excluida'
            ? `<span class="stBadge st-excluida">Excluída</span>`
            : `<select class="stSel st-${st}" data-id="${id}" aria-label="Situação da venda">
                    ${['pendente', 'andamento', 'concluida'].map(k => `<option value="${k}"${k === st ? ' selected' : ''}>${STATUS[k].label}</option>`).join('')}
               </select>`;
        const acao = st === 'excluida'
            ? `<button class="ic" data-acao="restaurar" data-id="${id}" title="Restaurar venda">Restaurar</button>`
            : `<button class="ic danger" data-acao="excluir" data-id="${id}" title="Excluir venda" aria-label="Excluir venda">✕</button>`;
        return `<tr class="row-${st}${sel ? ' sel' : ''}">
            <td class="chk"><input type="checkbox" data-id="${id}" aria-label="Selecionar venda"${sel}></td>
            <td class="num">${fmtData(r.data)}</td>
            <td class="num">${esc(r.venda)}</td>
            <td>${esc(r.cliente)}${r.codCliente ? `<span class="sub">Cód. ${esc(r.codCliente)}</span>` : ''}</td>
            <td>${esc(r.peca)}${r.codPeca ? `<span class="sub">Cód. ${esc(r.codPeca)}</span>` : ''}</td>
            <td>${esc(r.marca)}</td>
            <td>${esc(r.vendedor)}</td>
            <td class="num"><span class="days" style="background:${f.hex}33;color:${f.id === 'f1' ? '#ccc' : '#fff'};border:1px solid ${f.hex}">${r.dias}</span></td>
            <td>${controleStatus}</td>
            <td class="obsCell"><button class="obsBtn${obs ? '' : ' vazio'}" data-acao="obs" data-id="${id}" title="${obs ? esc(obs) : 'Adicionar observação'}">${obs ? esc(obs) : '+ Adicionar'}</button></td>
            <td class="acts">${acao}</td>
        </tr>`;
    }).join('') : `<tr><td colspan="11" style="text-align:center;color:#666;padding:28px">Nenhuma venda encontrada com esses filtros.</td></tr>`;

    const chkTodos = document.getElementById('chkTodos');
    const ids = idsPagina();
    chkTodos.checked = ids.length > 0 && ids.every(i => selecionados.has(i));
    chkTodos.indeterminate = !chkTodos.checked && ids.some(i => selecionados.has(i));
    chkTodos.onchange = () => {
        ids.forEach(i => chkTodos.checked ? selecionados.add(i) : selecionados.delete(i));
        renderTabela();
    };

    document.getElementById('tblTitle').textContent = `Vendas (${fmtNum(filtrados.length)})`;
    document.getElementById('pgInfo').textContent = `Página ${pagina} de ${totalPag}`;
    document.getElementById('pgPrev').disabled = pagina <= 1;
    document.getElementById('pgNext').disabled = pagina >= totalPag;
    renderBulk();
}

function ordenar(campo) {
    if (ordem.campo === campo) ordem.dir = ordem.dir === 'asc' ? 'desc' : 'asc';
    else { ordem.campo = campo; ordem.dir = (campo === 'data' || campo === 'dias') ? 'desc' : 'asc'; }
    renderTabela();
}

/* ---------- Exportar CSV do filtro atual ---------- */
function exportarCSV() {
    const cab = ['Data', 'Num Venda', 'Cod Cliente', 'Nome Cliente', 'Cod Peca', 'Nome Peca', 'Marca', 'Vendedor', 'Dias desde a venda', 'Situacao', 'Observacao'];
    const q = v => `"${String(v).replace(/"/g, '""')}"`;
    const linhas = filtrados.map(r => [fmtData(r.data), r.venda, r.codCliente, r.cliente, r.codPeca, r.peca, r.marca, r.vendedor, r.dias, STATUS[statusDe(r)].label, obsDe(r)].map(q).join(';'));
    const blob = new Blob(['\uFEFF' + [cab.map(q).join(';'), ...linhas].join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `carcacas_${isoDia(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
}
