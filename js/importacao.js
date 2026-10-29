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
    const reader = new FileReader();
    reader.onload = e => {
        try {
            // Em CSV, raw: true impede o SheetJS de "adivinhar" datas no padrão americano (mm/dd);
            // o texto chega cru e o paraData() lê como dd/mm/aaaa.
            const ehCSV = /\.csv$/i.test(file.name);
            const workbook = XLSX.read(e.target.result, { type: 'array', raw: ehCSV });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const bruto = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: true });
            processExcelData(bruto, file.name);
        } catch (err) {
            console.error(err);
            toast('Não foi possível ler o arquivo. Confira se é uma planilha .xlsx válida.', true);
        }
    };
    reader.readAsArrayBuffer(file);
}

function processExcelData(bruto, nomeArquivo) {
    if (!bruto.length) { toast('A planilha está vazia.', true); return; }

    // Mapeia cabeçalhos da planilha -> campos internos
    const cabecalhos = new Set();
    bruto.slice(0, 20).forEach(l => Object.keys(l).forEach(k => cabecalhos.add(k)));
    const mapa = {};
    for (const [campo, aliases] of Object.entries(COLUNAS)) {
        for (const h of cabecalhos) {
            if (aliases.includes(normalizar(h))) { mapa[campo] = h; break; }
        }
    }

    const faltando = OBRIGATORIAS.filter(c => !mapa[c]);
    if (faltando.length) {
        toast('Colunas não encontradas: ' + faltando.join(', ') + '. Confira o cabeçalho da planilha.', true);
        return;
    }

    const hoje = inicioDoDia(new Date());
    let descartadas = 0;

    dados = bruto.map(l => {
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
            _obs: texto(l[mapa.obs])
        };
    }).filter(Boolean);
    gerarIds(dados);
    aplicarAcompDaPlanilha(dados);

    meta = { arquivo: nomeArquivo, importadoEm: new Date().toISOString() };
    salvar();
    resetarFiltros();
    montarDashboard();

    let msg = `${dados.length} ${dados.length === 1 ? 'linha importada' : 'linhas importadas'}.`;
    if (descartadas) msg += ` ${descartadas} sem data válida foram ignoradas.`;
    toast(msg);
}

// Arrastar e soltar o arquivo em qualquer lugar da página
['dragenter', 'dragover'].forEach(ev => document.addEventListener(ev, e => { e.preventDefault(); document.body.classList.add('drag'); }));
['dragleave', 'drop'].forEach(ev => document.addEventListener(ev, e => { e.preventDefault(); if (ev === 'drop' || e.target === document.documentElement) document.body.classList.remove('drag'); }));
document.addEventListener('drop', e => {
    const f = e.dataTransfer.files[0];
    if (f && /\.(xlsx?|csv)$/i.test(f.name)) lerArquivo(f);
    else if (f) toast('Envie um arquivo .xlsx, .xls ou .csv.', true);
});
