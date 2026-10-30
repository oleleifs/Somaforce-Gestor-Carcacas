/* =========================================================
   PLANILHA GOOGLE
   Liga o site a uma planilha do Google Sheets pelo Apps Script (apps-script/Codigo.gs).
   - Lê a planilha ao abrir e a cada INTERVALO_SYNC (e ao voltar para a aba do navegador).
   - Situação, observação e medidas alteradas no site são gravadas na hora na planilha.
   O link do script e a chave ficam só neste navegador (não vão para o GitHub).
   ========================================================= */

let conexao = null;          // { url, chave }
let mapaPlanilha = {};       // campo interno -> cabeçalho da planilha (para gravar)
let infoPlanilha = null;     // { planilha, aba }
let ultimaSync = null;
let erroSync = '';
let ultimoHash = '';
let sincronizando = false;
let escritasPendentes = 0;
let fimUltimaEscrita = 0;
let timerSync = null;

/* ---------- Conexão guardada ---------- */
function carregarConexao() {
    try { conexao = JSON.parse(localStorage.getItem(PLANILHA_KEY)); }
    catch (e) { conexao = null; }
    if (!conexao || !conexao.url) conexao = null;
    return conexao;
}

function guardarConexao(c) {
    try { localStorage.setItem(PLANILHA_KEY, JSON.stringify(c)); }
    catch (e) { toast('Não foi possível guardar a conexão neste navegador.', true); }
}

// Link de acesso para a equipe: ...index.html#planilha=URL&chave=CHAVE
function lerConexaoDoLink() {
    const h = new URLSearchParams(location.hash.slice(1));
    const url = h.get('planilha');
    if (!url) return;
    guardarConexao({ url, chave: h.get('chave') || '' });
    history.replaceState(null, '', location.pathname + location.search);
}

function linkParaEquipe() {
    if (!conexao) return '';
    const p = new URLSearchParams({ planilha: conexao.url, chave: conexao.chave || '' });
    return `${location.origin}${location.pathname}#${p.toString()}`;
}

/* ---------- Comunicação com o Apps Script ---------- */
async function chamarPlanilha(metodo, corpo, c = conexao) {
    let resp;
    try {
        if (metodo === 'GET') {
            const sep = c.url.includes('?') ? '&' : '?';
            resp = await fetch(`${c.url}${sep}chave=${encodeURIComponent(c.chave || '')}&t=${Date.now()}`);
        } else {
            // Sem cabeçalho Content-Type: o navegador manda como texto e o Apps Script aceita sem bloqueio (CORS)
            resp = await fetch(c.url, { method: 'POST', body: JSON.stringify({ chave: c.chave || '', ...corpo }) });
        }
    } catch (e) {
        throw new Error('sem resposta do script. Confira a internet, o link e se ele foi publicado para "Qualquer pessoa"');
    }
    let j;
    try { j = await resp.json(); }
    catch (e) { throw new Error('o link não respondeu como o script do Gestor. Confira se é o link do "App da Web" (termina em /exec)'); }
    if (!j.ok) throw new Error(String(j.erro || 'erro desconhecido na planilha').replace(/\.+$/, ''));
    return j;
}

/* ---------- Leitura ---------- */
function aplicarDadosDaPlanilha(r) {
    const bruto = r.linhas.map(l => Object.fromEntries(r.cabecalhos.map((h, i) => [h, l[i] === '' ? null : l[i]])));
    if (!bruto.length) { toast('A aba da planilha está sem vendas.', true); return false; }

    // Planilha é a fonte da verdade: cadastros recomeçam a cada leitura
    numeros = {};
    pecas = {};
    const res = lerLinhasVendas(bruto);
    if (res.erro) { toast(res.erro, true); return false; }

    dados = res.linhas;
    dados.forEach(x => { x.id = x._idPlanilha; delete x._idPlanilha; });
    const semId = dados.filter(x => !x.id);
    if (semId.length) gerarIds(semId);

    acomp = {};
    aplicarAcompDaPlanilha(dados);
    aplicarPecasDaPlanilha(dados);
    Object.values(acomp).forEach(a => delete a.atualizadoEm);
    Object.values(pecas).forEach(p => delete p.atualizadoEm);

    mapaPlanilha = { ...res.mapa, ...res.mapaPeca };
    infoPlanilha = { planilha: r.planilha, aba: r.aba };
    meta = { arquivo: `Planilha Google "${r.planilha}"`, importadoEm: new Date().toISOString() };
    montarDashboard();
    return true;
}

async function sincronizar(manual = false) {
    if (!conexao || sincronizando || escritasPendentes) return;
    sincronizando = true;
    const inicio = Date.now();
    renderStatusPlanilha();
    try {
        const r = await chamarPlanilha('GET');
        // Se algo foi gravado enquanto a leitura estava em andamento, ela pode estar desatualizada
        if (escritasPendentes || inicio < fimUltimaEscrita) return;
        erroSync = '';
        ultimaSync = new Date();
        const hash = JSON.stringify([r.cabecalhos, r.linhas]);
        if (hash !== ultimoHash) {
            if (aplicarDadosDaPlanilha(r)) ultimoHash = hash;
        }
        if (manual) toast('Planilha atualizada.');
    } catch (e) {
        erroSync = e.message;
        if (manual || !ultimaSync) toast('Não foi possível ler a planilha: ' + e.message + '.', true);
    } finally {
        sincronizando = false;
        renderStatusPlanilha();
    }
}

// Não atualiza a tela no meio de uma digitação ou com uma janela aberta
function podeSincronizarSozinho() {
    if (document.hidden || document.querySelector('dialog[open]')) return false;
    const a = document.activeElement;
    return !(a && a.matches && a.matches('.filters input, .filters select'));
}

function iniciarSync() {
    clearInterval(timerSync);
    timerSync = setInterval(() => { if (podeSincronizarSozinho()) sincronizar(); }, INTERVALO_SYNC);
}
document.addEventListener('visibilitychange', () => {
    if (modoPlanilha && !document.hidden && ultimaSync && Date.now() - ultimaSync > 5000) sincronizar();
});

/* ---------- Gravação ---------- */
function enviarParaPlanilha(corpo) {
    escritasPendentes++;
    renderStatusPlanilha();
    let falhou = false;
    chamarPlanilha('POST', corpo)
        .catch(e => {
            falhou = true;
            toast('Não foi possível gravar na planilha: ' + e.message + '. A tela volta a mostrar o que está na planilha.', true);
        })
        .finally(() => {
            escritasPendentes--;
            fimUltimaEscrita = Date.now();
            if (falhou) ultimoHash = ''; // força redesenhar com o que está na planilha
            renderStatusPlanilha();
            if (!escritasPendentes) setTimeout(() => sincronizar(), falhou ? 0 : 1500);
        });
}

function colunaOuAviso(campo, nome) {
    const col = mapaPlanilha[campo];
    if (!col) toast(`A planilha não tem a coluna "${nome}". A alteração ficou só nesta tela.`, true);
    return col;
}

function planilhaStatus(ids, status) {
    if (!modoPlanilha) return;
    const col = colunaOuAviso('status', 'Situação');
    if (!col) return;
    enviarParaPlanilha({ acao: 'linhas', alteracoes: ids.map(id => ({ id, campos: { [col]: STATUS[status].label } })) });
}

function planilhaObs(id, texto) {
    if (!modoPlanilha) return;
    const col = colunaOuAviso('obs', 'Observação');
    if (!col) return;
    enviarParaPlanilha({ acao: 'linhas', alteracoes: [{ id, campos: { [col]: texto } }] });
}

function planilhaPeca(chave, valores) {
    if (!modoPlanilha) return;
    if (!chave.startsWith('c:') || !mapaPlanilha.codPeca) {
        toast('Peça sem código: as medidas ficaram só nesta tela.', true);
        return;
    }
    const campos = {};
    CAMPOS_PECA.forEach(c => { if (mapaPlanilha[c.campo]) campos[mapaPlanilha[c.campo]] = valores[c.campo] || ''; });
    if (!Object.keys(campos).length) {
        toast('A planilha não tem colunas de medidas. As medidas ficaram só nesta tela.', true);
        return;
    }
    enviarParaPlanilha({ acao: 'peca', colCodigo: mapaPlanilha.codPeca, codigo: chave.slice(2), campos });
}

/* ---------- Tela ---------- */
function horaCurta(d) { return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }

function renderStatusPlanilha() {
    const btn = document.getElementById('btnPlanilha');
    btn.classList.toggle('on', modoPlanilha);
    btn.classList.toggle('erro', modoPlanilha && !!erroSync);
    ['btnImportar', 'btnLimpar'].forEach(id => document.getElementById(id).classList.toggle('hidden', modoPlanilha || (id === 'btnLimpar' && !dados.length)));
    document.getElementById('btnSync').classList.toggle('hidden', !modoPlanilha);
    document.getElementById('emptyImportar').classList.toggle('hidden', modoPlanilha);
    if (!modoPlanilha) return;

    let txt;
    if (escritasPendentes) txt = 'Gravando na planilha…';
    else if (sincronizando && !ultimaSync) txt = 'Carregando a planilha Google…';
    else if (erroSync) txt = `Sem conexão com a planilha (${erroSync}). Tentando de novo…`;
    else if (ultimaSync) txt = `Planilha Google${infoPlanilha ? ` "${infoPlanilha.planilha}" › ${infoPlanilha.aba}` : ''} · atualizada às ${horaCurta(ultimaSync)}`;
    else txt = 'Planilha Google';
    const el = document.getElementById('metaImport');
    el.textContent = txt;
    el.classList.toggle('metaErro', !!erroSync && !escritasPendentes);
    document.getElementById('emptyMsg').textContent = ultimaSync || erroSync ? '' : 'Carregando a planilha Google…';
}

function abrirPlanilhaDialog() {
    const c = conexao || carregarConexao() || { url: '', chave: '' };
    document.getElementById('plUrl').value = c.url || '';
    document.getElementById('plChave').value = c.chave || '';
    document.getElementById('plErro').textContent = '';
    document.getElementById('plConectada').classList.toggle('hidden', !modoPlanilha);
    document.getElementById('plLink').value = modoPlanilha ? linkParaEquipe() : '';
    document.getElementById('plConectar').textContent = modoPlanilha ? 'Salvar e reconectar' : 'Conectar';
    document.getElementById('planilhaDialog').showModal();
    document.getElementById(c.url ? 'plConectar' : 'plUrl').focus();
}

async function conectarPlanilha() {
    const url = document.getElementById('plUrl').value.trim();
    const chave = document.getElementById('plChave').value.trim();
    const erro = document.getElementById('plErro');
    const btn = document.getElementById('plConectar');
    if (!/^https:\/\/script\.google(usercontent)?\.com\//.test(url)) {
        erro.textContent = 'Cole o link do App da Web do Apps Script (começa com https://script.google.com/ e termina em /exec).';
        return;
    }
    erro.textContent = '';
    btn.disabled = true;
    btn.textContent = 'Conectando…';
    try {
        const nova = { url, chave };
        const r = await chamarPlanilha('GET', null, nova);
        conexao = nova;
        guardarConexao(nova);
        modoPlanilha = true;
        selecionados.clear();
        erroSync = '';
        ultimaSync = new Date();
        if (aplicarDadosDaPlanilha(r)) ultimoHash = JSON.stringify([r.cabecalhos, r.linhas]);
        iniciarSync();
        document.getElementById('planilhaDialog').close();
        toast(`Conectado à planilha "${r.planilha}" (${fmtNum(dados.length)} vendas).`);
    } catch (e) {
        erro.textContent = 'Não foi possível conectar: ' + e.message + '.';
    } finally {
        btn.disabled = false;
        btn.textContent = modoPlanilha ? 'Salvar e reconectar' : 'Conectar';
        renderStatusPlanilha();
    }
}

function desconectarPlanilha() {
    if (!confirm('Desligar este navegador da planilha Google? A planilha não é alterada; o site volta a usar arquivos importados.')) return;
    try { localStorage.removeItem(PLANILHA_KEY); } catch (e) {}
    location.reload();
}

async function copiarLinkEquipe() {
    const el = document.getElementById('plLink');
    try { await navigator.clipboard.writeText(el.value); toast('Link copiado. Quem abrir esse link já entra conectado à planilha.'); }
    catch (e) { el.select(); toast('Selecionei o link: copie com Ctrl+C.'); }
}

// Chamado na inicialização (app.js). Devolve true se o site está ligado a uma planilha.
function iniciarPlanilha() {
    lerConexaoDoLink();
    if (!carregarConexao()) { renderStatusPlanilha(); return false; }
    modoPlanilha = true;
    renderStatusPlanilha();
    sincronizar();
    iniciarSync();
    return true;
}
