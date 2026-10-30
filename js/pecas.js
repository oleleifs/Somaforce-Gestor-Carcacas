/* =========================================================
   CADASTRO DE PEÇAS
   Dados técnicos memorizados por código de peça (ex.: MM do casco, Nm de referência).
   Preenchendo uma vez, toda venda com o mesmo código mostra os dados — inclusive
   nas próximas importações. Os campos ficam em CAMPOS_PECA (config.js).
   ========================================================= */

let pecas = {}; // { chaveDaPeca: { campo: valor, ..., atualizadoEm } }

// Chave da peça: o código; sem código, o nome da peça (sem acento/espaços)
function chavePeca(r) {
    if (r.codPeca) return 'c:' + r.codPeca;
    const n = normalizar(r.peca || '');
    return n ? 'n:' + n : '';
}

function specsDe(r) { return pecas[chavePeca(r)] || {}; }

function temSpecs(spec) { return CAMPOS_PECA.some(c => spec[c.campo]); }

// Valor com unidade, sem repetir quando a planilha já traz ("380MM" fica "380MM", "120" vira "120 mm")
function comUnidade(v, unidade) {
    if (!unidade) return String(v);
    return normalizar(v).endsWith(normalizar(unidade)) ? String(v) : `${v} ${unidade}`;
}

// Resumo curto para a tabela: "120 mm · 45 Nm"
function resumoSpecs(r) {
    const s = specsDe(r);
    return CAMPOS_PECA
        .filter(c => s[c.campo])
        .map(c => comUnidade(s[c.campo], c.unidade))
        .join(' · ');
}

function gravarSpecs(chave, valores) {
    if (!chave) return;
    const novo = { ...(pecas[chave] || {}), ...valores, atualizadoEm: new Date().toISOString() };
    CAMPOS_PECA.forEach(c => { if (!novo[c.campo]) delete novo[c.campo]; });
    if (temSpecs(novo)) pecas[chave] = novo;
    else delete pecas[chave];
}

function salvarPecas() {
    try { localStorage.setItem(PECAS_KEY, JSON.stringify(pecas)); }
    catch (e) { toast('Não foi possível salvar o cadastro de peças no navegador.', true); }
}

function carregarPecas() {
    try { pecas = JSON.parse(localStorage.getItem(PECAS_KEY)) || {}; }
    catch (e) { pecas = {}; }
}

// Descobre quais colunas da planilha trazem dados da peça
function mapearColunasPeca(cabecalhos) {
    const mapa = {};
    CAMPOS_PECA.forEach(c => {
        for (const h of cabecalhos) {
            if (c.aliases.includes(normalizar(h))) { mapa[c.campo] = h; break; }
        }
    });
    return mapa;
}

// Número vindo da planilha volta com vírgula decimal (45.5 -> "45,5")
function textoSpec(v) {
    if (typeof v === 'number') return String(v).replace('.', ',');
    return texto(v);
}

// Planilha preenchida atualiza o cadastro; célula vazia mantém o que já está salvo
function aplicarPecasDaPlanilha(linhas) {
    let n = 0;
    linhas.forEach(r => {
        const v = r._specs;
        delete r._specs;
        if (!v) return;
        const mud = {};
        CAMPOS_PECA.forEach(c => { if (v[c.campo]) mud[c.campo] = v[c.campo]; });
        if (Object.keys(mud).length) { gravarSpecs(chavePeca(r), mud); n++; }
    });
    if (n) salvarPecas();
}

// Valor para a exportação: número de verdade quando for só número, texto caso contrário
function valorSpecCelula(v) {
    if (!v) return { t: 's', v: '' };
    const s = String(v).trim();
    if (/^-?\d+([.,]\d+)?$/.test(s)) return { t: 'n', v: parseFloat(s.replace(',', '.')) };
    return { t: 's', v: s };
}

/* ---------- Janela de edição ---------- */
let pecaChave = null;

function montarCamposPeca() {
    document.getElementById('pecaCampos').innerHTML = CAMPOS_PECA.map(c => `
        <label class="pecaCampo">
            <span>${esc(c.titulo)}${c.unidade ? ` <em>(${esc(c.unidade)})</em>` : ''}</span>
            <input type="text" data-campo="${c.campo}" autocomplete="off" placeholder="${esc(c.exemplo || '')}">
        </label>`).join('');
}

function abrirPeca(id) {
    const r = dados.find(x => x.id === id);
    if (!r) return;
    const chave = chavePeca(r);
    if (!chave) { toast('Esta venda não tem código nem nome de peça.', true); return; }
    pecaChave = chave;

    const qtd = dados.filter(x => chavePeca(x) === chave).length;
    document.getElementById('pecaInfo').textContent =
        `${r.codPeca ? `Cód. ${r.codPeca} — ` : ''}${r.peca}. ` +
        `Vale para ${qtd} ${qtd === 1 ? 'venda' : 'vendas'} desta peça, e para as próximas importações.`;

    const s = specsDe(r);
    document.querySelectorAll('#pecaCampos input').forEach(i => { i.value = s[i.dataset.campo] || ''; });
    document.getElementById('pecaQuando').textContent = s.atualizadoEm
        ? `Última alteração em ${fmtData(new Date(s.atualizadoEm))} às ${new Date(s.atualizadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
        : '';
    document.getElementById('pecaDialog').showModal();
    document.querySelector('#pecaCampos input').focus();
}

function salvarPeca() {
    if (!pecaChave) return;
    const valores = {};
    document.querySelectorAll('#pecaCampos input').forEach(i => { valores[i.dataset.campo] = i.value.trim(); });
    gravarSpecs(pecaChave, valores);
    salvarPecas();
    document.getElementById('pecaDialog').close();
    toast('Dados da peça salvos.');
    atualizar();
}
