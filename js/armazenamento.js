/* =========================================================
   ARMAZENAMENTO
   Salva e carrega vendas e acompanhamento no navegador (localStorage).
   ========================================================= */

function salvar() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            meta,
            linhas: dados.map(r => ({ ...r, data: isoDia(r.data) }))
        }));
    } catch (e) { console.warn('Não foi possível salvar no navegador:', e); }
}

// Id estável de cada linha: mesma venda/cliente/peça/data = mesmo id,
// assim situação e observação se mantêm quando a planilha é reimportada.
function gerarIds(linhas) {
    const vistos = {};
    linhas.forEach(r => {
        const base = [r.venda, r.codCliente || r.cliente, r.codPeca || r.peca, isoDia(r.data)].join('|');
        vistos[base] = (vistos[base] || 0) + 1;
        r.id = vistos[base] > 1 ? `${base}#${vistos[base]}` : base;
    });
}

// Converte o texto da planilha para a situação interna
function statusDaPlanilha(v) {
    const n = normalizar(v);
    if (!n) return null;
    if (n.startsWith('conclu')) return 'concluida';
    if (n.includes('andamento')) return 'andamento';
    if (n.startsWith('exclu')) return 'excluida';
    if (n.startsWith('pend')) return 'pendente';
    return null;
}

// Planilha preenchida sobrescreve o que está salvo; célula vazia mantém o que já existe
function aplicarAcompDaPlanilha(linhas) {
    let n = 0;
    linhas.forEach(r => {
        const mud = {};
        const st = statusDaPlanilha(r._status);
        if (st) mud.status = st;
        if (r._obs) mud.obs = r._obs;
        if (Object.keys(mud).length) { registrar(r.id, mud); n++; }
        delete r._status;
        delete r._obs;
    });
    if (n) salvarAcomp();
}

function salvarAcomp() {
    try { localStorage.setItem(ACOMP_KEY, JSON.stringify(acomp)); }
    catch (e) { toast('Não foi possível salvar no navegador.', true); }
}

function carregarAcomp() {
    try { acomp = JSON.parse(localStorage.getItem(ACOMP_KEY)) || {}; }
    catch (e) { acomp = {}; }
}

function carregar() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return false;
        const obj = JSON.parse(raw);
        const hoje = inicioDoDia(new Date());
        meta = obj.meta;
        dados = (obj.linhas || []).map(r => {
            const data = paraData(r.data);
            return { ...r, data, dias: Math.max(0, Math.round((hoje - data) / 864e5)) };
        });
        if (dados.some(r => !r.id)) gerarIds(dados);
        return dados.length > 0;
    } catch (e) { return false; }
}

function limparDados() {
    if (!confirm('Remover as vendas importadas deste navegador? Situações e observações ficam guardadas e voltam ao reimportar a mesma planilha.')) return;
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    dados = []; filtrados = []; meta = null;
    document.getElementById('dash').classList.add('hidden');
    document.getElementById('empty').classList.remove('hidden');
    document.getElementById('btnLimpar').classList.add('hidden');
    document.getElementById('metaImport').textContent = '';
}
