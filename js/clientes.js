/* =========================================================
   NÚMEROS DOS CLIENTES
   Lê a aba "Números" da planilha (código do cliente + telefone) e memoriza
   por código de cliente. Toda venda daquele cliente mostra o número,
   inclusive nas próximas importações. Nomes aceitos ficam no config.js.
   ========================================================= */

let numeros = {}; // { codCliente: ['48999998888', ...] }

function salvarNumeros() {
    try { localStorage.setItem(NUMEROS_KEY, JSON.stringify(numeros)); }
    catch (e) { toast('Não foi possível salvar os números no navegador.', true); }
}

function carregarNumeros() {
    try { numeros = JSON.parse(localStorage.getItem(NUMEROS_KEY)) || {}; }
    catch (e) { numeros = {}; }
}

function numerosDe(r) { return (r.codCliente && numeros[r.codCliente]) || []; }

// A aba de números é reconhecida pelo nome (sem acento/maiúsculas): "Números", "Telefones"...
function ehAbaNumeros(nome) {
    const n = normalizar(nome);
    return ABA_NUMEROS.some(a => n.startsWith(a));
}

// Só dígitos; tira o 55 do país quando vier junto
function limparTelefone(v) {
    let d = paraId(v).replace(/\D/g, '');
    if ((d.length === 12 || d.length === 13) && d.startsWith('55')) d = d.slice(2);
    return d;
}

// Uma célula pode trazer mais de um número: "48 99999-8888 / 48 3524-0000"
function telefonesDaCelula(v) {
    if (v == null || v === '') return [];
    if (typeof v === 'number') return [limparTelefone(v)].filter(Boolean);
    return String(v).split(/[\/;,|\n]+/).map(limparTelefone).filter(d => d.length >= 8);
}

function formatarTelefone(d) {
    if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    if (d.length === 9) return `${d.slice(0, 5)}-${d.slice(5)}`;
    if (d.length === 8) return `${d.slice(0, 4)}-${d.slice(4)}`;
    return d;
}

// Celular com DDD (11 dígitos, começando com 9) abre no WhatsApp
function linkWhatsApp(d) {
    return d.length === 11 && d[2] === '9' ? `https://wa.me/55${d}` : '';
}

function textoNumeros(r) { return numerosDe(r).map(formatarTelefone).join(' / '); }

// Lê a aba de números. Cliente que aparece na aba tem os números substituídos;
// quem não aparece mantém o que já estava salvo.
function importarAbaNumeros(linhas) {
    if (!linhas.length) return { clientes: 0, semColuna: false };
    const cabecalhos = new Set();
    linhas.slice(0, 20).forEach(l => Object.keys(l).forEach(k => cabecalhos.add(k)));
    const hs = [...cabecalhos];

    // Respeita a ordem dos nomes no config: "Cód. Cliente" ganha de "Cliente"
    let colCod;
    for (const a of COLUNAS_NUMEROS.codCliente) { colCod = hs.find(h => normalizar(h) === a); if (colCod) break; }
    const colsTel = hs.filter(h => h !== colCod && COLUNAS_NUMEROS.telefone.some(a => normalizar(h).startsWith(a)));
    if (!colCod || !colsTel.length) return { clientes: 0, semColuna: true };

    const novos = {};
    linhas.forEach(l => {
        const cod = paraId(l[colCod]);
        if (!cod) return;
        const tels = colsTel.flatMap(h => telefonesDaCelula(l[h]));
        if (!tels.length) return;
        novos[cod] = [...new Set([...(novos[cod] || []), ...tels])];
    });
    Object.assign(numeros, novos);
    salvarNumeros();
    return { clientes: Object.keys(novos).length, semColuna: false };
}

// Linha da tabela abaixo do nome do cliente
function celulaNumeros(r) {
    const tels = numerosDe(r);
    if (!tels.length) return '';
    return `<span class="tels">${tels.map(d => {
        const wa = linkWhatsApp(d);
        const t = esc(formatarTelefone(d));
        return wa
            ? `<a href="${wa}" target="_blank" rel="noopener" title="Abrir conversa no WhatsApp">${t}</a>`
            : `<span>${t}</span>`;
    }).join('')}</span>`;
}
