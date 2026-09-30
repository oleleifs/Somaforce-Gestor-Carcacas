/* =========================================================
   FILTROS
   Filtros, abas de situação e etiquetas de filtro ativo.
   ========================================================= */

function resetarFiltros() {
    Object.keys(filtros).forEach(k => filtros[k] = '');
    pagina = 1;
}

function preencherSelect(id, valores, rotuloTodos) {
    const sel = document.getElementById(id);
    sel.innerHTML = `<option value="">${rotuloTodos}</option>` +
        valores.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('');
}

function sincronizarControles() {
    document.getElementById('fDe').value = filtros.de;
    document.getElementById('fAte').value = filtros.ate;
    document.getElementById('fVend').value = filtros.vendedor;
    document.getElementById('fMarca').value = filtros.marca;
    document.getElementById('fBusca').value = filtros.busca;
}

// Aplica um conjunto de filtros e devolve as linhas que passam
function filtrar(f) {
    const q = normalizar(f.busca);
    const de = f.de ? paraData(f.de) : null;
    const ate = f.ate ? paraData(f.ate) : null;

    return dados.filter(r => {
        const st = statusDe(r);
        // "Todas" mostra tudo, menos as excluídas
        if (f.status ? st !== f.status : st === 'excluida') return false;
        if (de && r.data < de) return false;
        if (ate && r.data > ate) return false;
        if (f.vendedor && r.vendedor !== f.vendedor) return false;
        if (f.marca && r.marca !== f.marca) return false;
        if (f.cliente && r.cliente !== f.cliente) return false;
        if (f.faixa && faixaDe(r.dias).id !== f.faixa) return false;
        if (q) {
            const alvo = normalizar(`${r.cliente} ${r.codCliente} ${r.peca} ${r.codPeca} ${r.venda} ${obsDe(r)}`);
            if (!alvo.includes(q)) return false;
        }
        return true;
    });
}

function aplicarFiltros() {
    filtrados = filtrar(filtros);
    // Tira da seleção o que saiu da tela
    const visiveis = new Set(filtrados.map(r => r.id));
    [...selecionados].forEach(id => { if (!visiveis.has(id)) selecionados.delete(id); });
}

// Abas de situação com contagem (respeitam os demais filtros)
function renderTabs() {
    const cont = { '': 0, pendente: 0, andamento: 0, concluida: 0, excluida: 0 };
    STATUS_ORDEM.forEach(k => { cont[k] = filtrar({ ...filtros, status: k }).length; });
    cont[''] = cont.pendente + cont.andamento + cont.concluida;
    const abas = [['', 'Todas'], ['pendente', 'Pendentes'], ['andamento', 'Em andamento'], ['concluida', 'Concluídas'], ['excluida', 'Excluídas']];
    document.getElementById('tabs').innerHTML = abas.map(([k, nome]) =>
        `<button class="tab${filtros.status === k ? ' on' : ''} tab-${k || 'todas'}" role="tab" aria-selected="${filtros.status === k}" onclick="filtros.status='${k}';pagina=1;selecionados.clear();atualizar()">${nome}<b>${fmtNum(cont[k])}</b></button>`
    ).join('');
}

function setFiltro(campo, valor) {
    filtros[campo] = filtros[campo] === valor ? '' : valor; // clicar de novo remove
    pagina = 1;
    sincronizarControles();
    atualizar();
}

function renderChips() {
    const nomes = { vendedor: 'Vendedor', marca: 'Marca', cliente: 'Cliente', faixa: 'Idade' };
    const html = Object.entries(nomes)
        .filter(([k]) => filtros[k])
        .map(([k, n]) => {
            const v = k === 'faixa' ? FAIXAS.find(f => f.id === filtros.faixa).label : filtros[k];
            return `<span class="chip">${n}: ${esc(v)}<button aria-label="Remover filtro" onclick="setFiltro('${k}', filtros['${k}'])">×</button></span>`;
        }).join('');
    const temAlgum = Object.values(filtros).some(Boolean);
    document.getElementById('chips').innerHTML = html +
        (temAlgum ? `<span class="chip" style="background:none;border-color:var(--dark);color:#bbb">Limpar todos<button aria-label="Limpar filtros" style="color:#bbb" onclick="resetarFiltros();sincronizarControles();atualizar()">×</button></span>` : '');
}
