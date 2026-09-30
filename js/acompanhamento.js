/* =========================================================
   ACOMPANHAMENTO
   Situação (pendente, em andamento, concluída, excluída), ações em massa e observações.
   ========================================================= */

function statusDe(r) { return (acomp[r.id] && acomp[r.id].status) || 'pendente'; }
function obsDe(r) { return (acomp[r.id] && acomp[r.id].obs) || ''; }

function registrar(id, mudancas) {
    const atual = acomp[id] || {};
    const novo = { ...atual, ...mudancas, atualizadoEm: new Date().toISOString() };
    // Não guarda registro "vazio" (pendente e sem observação)
    if ((novo.status || 'pendente') === 'pendente' && !novo.obs) delete acomp[id];
    else acomp[id] = novo;
}

function setStatus(ids, status) {
    ids.forEach(id => registrar(id, { status }));
    salvarAcomp();
    const n = ids.length;
    const txt = { pendente: 'marcada(s) como pendente', andamento: 'marcada(s) como em andamento', concluida: 'marcada(s) como concluída', excluida: 'excluída(s). Veja na aba Excluídas para restaurar' }[status];
    toast(`${n} ${n === 1 ? 'venda' : 'vendas'} ${txt}.`);
    atualizar();
}

// Seleção em massa
function renderBulk() {
    const bar = document.getElementById('bulk');
    const n = selecionados.size;
    bar.classList.toggle('hidden', n === 0);
    if (!n) return;
    document.getElementById('bulkInfo').textContent = `${n} ${n === 1 ? 'selecionada' : 'selecionadas'}`;
    const vendoExcluidas = filtros.status === 'excluida';
    document.querySelectorAll('#bulk [data-bulk]').forEach(b => {
        const acao = b.dataset.bulk;
        b.classList.toggle('hidden', vendoExcluidas ? acao !== 'pendente' && acao !== 'limpar' : false);
    });
    document.querySelector('#bulk [data-bulk="pendente"]').textContent = vendoExcluidas ? 'Restaurar' : 'Pendente';
}

function acaoEmMassa(acao) {
    if (acao === 'limpar') { selecionados.clear(); renderTabela(); return; }
    const ids = [...selecionados];
    if (!ids.length) return;
    if (acao === 'excluida' && !confirm(`Excluir ${ids.length} ${ids.length === 1 ? 'venda' : 'vendas'}? Elas vão para a aba Excluídas e podem ser restauradas.`)) return;
    selecionados.clear();
    setStatus(ids, acao);
}

// Observações
let obsId = null;
function abrirObs(id) {
    const r = dados.find(x => x.id === id);
    if (!r) return;
    obsId = id;
    document.getElementById('obsInfo').textContent =
        `Venda ${r.venda || '(sem nº)'}, ${r.cliente}, ${r.peca}, ${fmtData(r.data)}`;
    document.getElementById('obsTexto').value = obsDe(r);
    const quando = acomp[id] && acomp[id].atualizadoEm;
    document.getElementById('obsQuando').textContent = quando
        ? `Última alteração em ${fmtData(new Date(quando))} às ${new Date(quando).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
        : '';
    document.getElementById('obsDialog').showModal();
    document.getElementById('obsTexto').focus();
}

function salvarObs() {
    if (!obsId) return;
    registrar(obsId, { obs: document.getElementById('obsTexto').value.trim() });
    salvarAcomp();
    document.getElementById('obsDialog').close();
    toast('Observação salva.');
    atualizar();
}

// Eventos da tabela (delegação)
document.getElementById('tbody').addEventListener('change', e => {
    const el = e.target;
    if (el.classList.contains('stSel')) setStatus([el.dataset.id], el.value);
    else if (el.type === 'checkbox' && el.dataset.id) {
        el.checked ? selecionados.add(el.dataset.id) : selecionados.delete(el.dataset.id);
        el.closest('tr').classList.toggle('sel', el.checked);
        const ids = paginaAtual.map(r => r.id);
        const chkTodos = document.getElementById('chkTodos');
        chkTodos.checked = ids.every(i => selecionados.has(i));
        chkTodos.indeterminate = !chkTodos.checked && ids.some(i => selecionados.has(i));
        renderBulk();
    }
});

document.getElementById('tbody').addEventListener('click', e => {
    const b = e.target.closest('[data-acao]');
    if (!b) return;
    const id = b.dataset.id;
    if (b.dataset.acao === 'obs') abrirObs(id);
    else if (b.dataset.acao === 'excluir') setStatus([id], 'excluida');
    else if (b.dataset.acao === 'restaurar') setStatus([id], 'pendente');
});
