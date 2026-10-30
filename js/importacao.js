/* =========================================================
   IMPORTAÇÃO
   Leitura da planilha (.xlsx/.xls/.csv), mapeamento de colunas e arrastar-e-soltar.
   ========================================================= */

const inputArquivo = document.getElementById('excel-file');
inputArquivo.addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) lerArquivo(file);
    inputArquivo.value = ''; // permite reimportar o mesmo arquivo
});

function importarDados() { inputArquivo.click(); }

function lerArquivo(file) {
    if (modoPlanilha) {
        toast('O site está ligado à planilha Google: as vendas vêm de lá. Para importar um arquivo, desconecte a planilha.', true);
        return;
    }
    const reader = new FileReader();
    reader.onload = e => {
        try {
            // Em CSV, raw: true impede o SheetJS de "adivinhar" datas no padrão americano (mm/dd);
            // o texto chega cru e o paraData() lê como dd/mm/aaaa.
            const ehCSV = /\.csv$/i.test(file.name);
            const workbook = XLSX.read(e.target.result, { type: 'array', raw: ehCSV });
            const ler = nome => XLSX.utils.sheet_to_json(workbook.Sheets[nome], { defval: null, raw: true });

            // Aba de números dos clientes (opcional) e aba de vendas (a primeira que não for a de números)
            const abaNum = workbook.SheetNames.find(ehAbaNumeros);
            const abaVendas = workbook.SheetNames.find(n => n !== abaNum);
            let avisoNum = '';
            if (abaNum) {
                const res = importarAbaNumeros(ler(abaNum));
                avisoNum = res.semColuna
                    ? ` Aba "${abaNum}": não encontrei as colunas de código do cliente e telefone.`
                    : ` ${res.clientes} ${res.clientes === 1 ? 'cliente' : 'clientes'} com número na aba "${abaNum}".`;
            }
            if (!abaVendas) {
                // Arquivo só com a aba de números: atualiza o cadastro e mantém as vendas atuais
                toast(('Números atualizados.' + avisoNum).trim(), avisoNum.includes('não encontrei'));
                if (dados.length) atualizar();
                return;
            }
            processExcelData(ler(abaVendas), file.name, avisoNum);
        } catch (err) {
            console.error(err);
            toast('Não foi possível ler o arquivo. Confira se é uma planilha .xlsx válida.', true);
        }
    };
    reader.readAsArrayBuffer(file);
}

// Converte as linhas cruas da aba de vendas (objetos { cabeçalho: valor }) nas linhas do sistema.
// Usado tanto na importação de arquivo quanto na planilha Google (planilha.js).
function lerLinhasVendas(bruto) {
    if (!bruto.length) return { erro: 'A planilha está vazia.' };

    // Mapeia cabeçalhos da planilha -> campos internos
    const cabecalhos = new Set();
    bruto.slice(0, 20).forEach(l => Object.keys(l).forEach(k => cabecalhos.add(k)));
    const mapa = {};
    for (const [campo, aliases] of Object.entries(COLUNAS)) {
        for (const h of cabecalhos) {
            if (aliases.includes(normalizar(h))) { mapa[campo] = h; break; }
        }
    }

    const mapaPeca = mapearColunasPeca(cabecalhos);
    const nNumVendas = importarNumerosDasVendas(bruto, cabecalhos, { ...mapa, ...mapaPeca });

    const faltando = OBRIGATORIAS.filter(c => !mapa[c]);
    if (faltando.length) return { erro: 'Colunas não encontradas: ' + faltando.join(', ') + '. Confira o cabeçalho da planilha.' };

    const hoje = inicioDoDia(new Date());
    let descartadas = 0;

    const linhas = bruto.map(l => {
        const data = paraData(l[mapa.data]);
        if (!data) { descartadas++; return null; }
        return {
            codCliente: paraId(l[mapa.codCliente]),
            cliente:    texto(l[mapa.cliente]) || '(sem nome)',
            venda:      paraId(l[mapa.venda]),
            codPeca:    paraId(l[mapa.codPeca]),
            peca:       texto(l[mapa.peca]) || '(sem descrição)',
            marca:      texto(l[mapa.marca]) || '(sem marca)',
            vendedor:   texto(l[mapa.vendedor]) || '(sem vendedor)',
            data,
            dias: Math.max(0, Math.round((hoje - data) / 864e5)),
            _status: texto(l[mapa.status]),
            _obs: texto(l[mapa.obs]),
            _specs: Object.fromEntries(Object.entries(mapaPeca).map(([campo, h]) => [campo, textoSpec(l[h])])),
            _idPlanilha: texto(l[COL_ID_PLANILHA])
        };
    }).filter(Boolean);
    return { linhas, descartadas, mapa, mapaPeca, nNumVendas };
}

function processExcelData(bruto, nomeArquivo, avisoExtra = '') {
    const res = lerLinhasVendas(bruto);
    if (res.erro) { toast(res.erro, true); return; }
    const { descartadas, nNumVendas } = res;
    dados = res.linhas;
    dados.forEach(r => delete r._idPlanilha);
    gerarIds(dados);
    aplicarAcompDaPlanilha(dados);
    aplicarPecasDaPlanilha(dados);

    meta = { arquivo: nomeArquivo, importadoEm: new Date().toISOString() };
    salvar();
    resetarFiltros();
    montarDashboard();

    let msg = `${dados.length} ${dados.length === 1 ? 'linha importada' : 'linhas importadas'}.`;
    if (descartadas) msg += ` ${descartadas} sem data válida foram ignoradas.`;
    if (nNumVendas && !avisoExtra) msg += ` ${nNumVendas} ${nNumVendas === 1 ? 'cliente' : 'clientes'} com número.`;
    toast(msg + avisoExtra);
}

// Arrastar e soltar o arquivo em qualquer lugar da página
['dragenter', 'dragover'].forEach(ev => document.addEventListener(ev, e => { e.preventDefault(); document.body.classList.add('drag'); }));
['dragleave', 'drop'].forEach(ev => document.addEventListener(ev, e => { e.preventDefault(); if (ev === 'drop' || e.target === document.documentElement) document.body.classList.remove('drag'); }));
document.addEventListener('drop', e => {
    const f = e.dataTransfer.files[0];
    if (f && /\.(xlsx?|csv)$/i.test(f.name)) lerArquivo(f);
    else if (f) toast('Envie um arquivo .xlsx, .xls ou .csv.', true);
});
