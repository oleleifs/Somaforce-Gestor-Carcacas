/* =========================================================
   NÚMEROS DOS CLIENTES
   Lê a aba "Números" da planilha (código do cliente + telefone) e memoriza
   por código de cliente. Toda venda daquele cliente mostra o número,
   inclusive nas próximas importações. Nomes aceitos ficam no config.js.
   ========================================================= */

let numeros = {}; // { codCliente: ['48999998888', ...] }

function salvarNumeros() {
    if (modoPlanilha) return;
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
    const partes = typeof v === 'number' ? [v] : String(v).split(/[\/;,|\n]+/);
    return partes.map(limparTelefone).filter(d => d.length >= 8);
}

function formatarTelefone(d) {
    if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    if (d.length === 9) return `${d.slice(0, 5)}-${d.slice(5)}`;
    if (d.length === 8) return `${d.slice(0, 4)}-${d.slice(4)}`;
    return d;
}

// Celular com DDD abre no WhatsApp. Celular no formato antigo, sem o 9
// (ex.: 51 8593-0775), ganha o 9 no link: 55 51 98593-0775.
function linkWhatsApp(d) {
    if (d.length === 11 && d[2] === '9') return `https://wa.me/55${d}`;
    if (d.length === 10 && '6789'.includes(d[2])) return `https://wa.me/55${d.slice(0, 2)}9${d.slice(2)}`;
    return '';
}

function textoNumeros(r) { return numerosDe(r).map(formatarTelefone).join(' / '); }

// Junta os telefones por cliente e grava no cadastro. Cliente que aparece com número
// tem os números substituídos; quem não aparece (ou está sem número) mantém o que já estava salvo.
function gravarNumerosDasLinhas(linhas, colCod, colsTel) {
    const novos = {};
    linhas.forEach(l => {
        const cod = paraId(l[colCod]);
        if (!cod) return;
        const tels = colsTel.flatMap(h => telefonesDaCelula(l[h]));
        if (!tels.length) return;
        novos[cod] = [...new Set([...(novos[cod] || []), ...tels])];
    });
    if (Object.keys(novos).length) { Object.assign(numeros, novos); salvarNumeros(); }
    return Object.keys(novos).length;
}

// Colunas de telefone: cabeçalho começa com "Número", "Telefone", "Celular"... e não é de venda/pedido/nota
function colunasTelefone(cabecalhos, ignorar = []) {
    return cabecalhos.filter(h => {
        if (ignorar.includes(h)) return false;
        const n = normalizar(h);
        if (/venda|pedido|nota|nf|serie|lote/.test(n)) return false;
        return COLUNAS_NUMEROS.telefone.some(a => n.startsWith(a));
    });
}

// Coluna de telefone dentro da própria aba de vendas (ex.: "Números" ao lado de "Observação")
function importarNumerosDasVendas(bruto, cabecalhos, mapa) {
    if (!mapa.codCliente) return 0;
    const cols = colunasTelefone([...cabecalhos], Object.values(mapa));
    return cols.length ? gravarNumerosDasLinhas(bruto, mapa.codCliente, cols) : 0;
}

// Lê uma aba separada de números (código do cliente + telefone)
function importarAbaNumeros(linhas) {
    if (!linhas.length) return { clientes: 0, semColuna: false };
    const cabecalhos = new Set();
    linhas.slice(0, 20).forEach(l => Object.keys(l).forEach(k => cabecalhos.add(k)));
    const hs = [...cabecalhos];

    // Respeita a ordem dos nomes no config: "Cód. Cliente" ganha de "Cliente"
    let colCod;
    for (const a of COLUNAS_NUMEROS.codCliente) { colCod = hs.find(h => normalizar(h) === a); if (colCod) break; }
    const colsTel = colunasTelefone(hs, [colCod]);
    if (!colCod || !colsTel.length) return { clientes: 0, semColuna: true };
    return { clientes: gravarNumerosDasLinhas(linhas, colCod, colsTel), semColuna: false };
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
