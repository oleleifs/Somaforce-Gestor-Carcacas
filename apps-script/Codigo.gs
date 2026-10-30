/* =========================================================
   GESTOR DE CARCAÇAS — PONTE COM O GOOGLE SHEETS
   Cole este arquivo em Extensões → Apps Script da planilha e publique como
   "App da Web" (passo a passo em apps-script/LEIA-ME.md).

   O site usa este script para:
   - LER a aba de vendas (GET), e
   - GRAVAR situação, observação e medidas da peça (POST).

   O script cria sozinho uma coluna de ID no fim da aba. Ela identifica cada
   linha para o site gravar no lugar certo — não apague nem edite essa coluna.
   ========================================================= */

// Chave de acesso: troque por uma senha só sua. O site pede a mesma chave.
const CHAVE = 'TROQUE-ESTA-CHAVE';

// Nome da aba de vendas. Se não existir, usa a primeira aba.
const ABA = 'Carcaças';

// Título da coluna de ID criada pelo script.
const COL_ID = 'ID (não editar)';


/* ---------- Leitura ---------- */
function doGet(e) {
  return responder(() => {
    checarChave(e && e.parameter && e.parameter.chave);
    const sh = abaVendas();
    const trava = LockService.getScriptLock();
    trava.waitLock(20000);
    try { garantirIds(sh); } finally { trava.releaseLock(); }

    const tz = SpreadsheetApp.getActive().getSpreadsheetTimeZone();
    const valores = sh.getDataRange().getValues();
    const cabecalhos = valores.shift().map(h => String(h).trim());
    const ehLinha = linhaTemDados(cabecalhos);
    const linhas = valores
      .filter(ehLinha)
      .map(l => l.map(v => v instanceof Date ? Utilities.formatDate(v, tz, 'yyyy-MM-dd') : v));

    return {
      planilha: SpreadsheetApp.getActive().getName(),
      aba: sh.getName(),
      cabecalhos: cabecalhos,
      linhas: linhas
    };
  });
}


/* ---------- Gravação ---------- */
// Corpo (JSON):
//   { chave, acao: 'linhas', alteracoes: [{ id, campos: { 'Situação': 'Concluída' } }] }
//   { chave, acao: 'peca', colCodigo: 'Cód. Peça', codigo: '21804', campos: { 'MM do casco': '380MM' } }
function doPost(e) {
  return responder(() => {
    const req = JSON.parse(e.postData.contents);
    checarChave(req.chave);

    const trava = LockService.getScriptLock();
    trava.waitLock(20000);
    try {
      const sh = abaVendas();
      garantirIds(sh);
      const cabecalhos = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(h => String(h).trim());
      const coluna = nome => {
        const i = cabecalhos.indexOf(String(nome).trim());
        if (i < 0) throw new Error('Coluna não encontrada na planilha: ' + nome);
        return i + 1;
      };
      const total = Math.max(sh.getLastRow() - 1, 0);
      if (!total) return { alteradas: 0 };

      // Agrupa por coluna + valor para gravar várias células de uma vez
      const grupos = {};
      const marcar = (linha, campo, valor) => {
        const c = coluna(campo);
        const k = c + '\u0000' + JSON.stringify(valor);
        (grupos[k] = grupos[k] || { valor: valor, celulas: [] }).celulas.push(sh.getRange(linha, c).getA1Notation());
      };

      let alteradas = 0;
      if (req.acao === 'linhas') {
        const ids = sh.getRange(2, coluna(COL_ID), total, 1).getValues().map(l => String(l[0]));
        (req.alteracoes || []).forEach(a => {
          const i = ids.indexOf(String(a.id));
          if (i < 0) return;
          Object.keys(a.campos).forEach(campo => marcar(i + 2, campo, a.campos[campo]));
          alteradas++;
        });
      } else if (req.acao === 'peca') {
        const codigos = sh.getRange(2, coluna(req.colCodigo), total, 1).getValues().map(l => codigoTexto(l[0]));
        codigos.forEach((cod, i) => {
          if (cod !== String(req.codigo)) return;
          Object.keys(req.campos).forEach(campo => marcar(i + 2, campo, req.campos[campo]));
          alteradas++;
        });
      } else {
        throw new Error('Ação desconhecida: ' + req.acao);
      }

      Object.keys(grupos).forEach(k => {
        const g = grupos[k];
        sh.getRangeList(g.celulas).setValue(g.valor);
      });
      SpreadsheetApp.flush();
      return { alteradas: alteradas };
    } finally {
      trava.releaseLock();
    }
  });
}


/* ---------- Apoio ---------- */
function abaVendas() {
  const ss = SpreadsheetApp.getActive();
  return ss.getSheetByName(ABA) || ss.getSheets()[0];
}

function checarChave(c) {
  if (CHAVE && String(c || '') !== CHAVE) throw new Error('Chave de acesso inválida.');
}

function normalizar(s) {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Mesmo critério do site: código numérico vira texto sem casas decimais
function codigoTexto(v) {
  if (v === '' || v === null) return '';
  if (typeof v === 'number') return String(Math.round(v));
  return String(v).trim();
}

// Linha "de verdade": tem data, cliente ou peça (ignora linhas só com fórmula ou lista suspensa)
function linhaTemDados(cabecalhos) {
  const chaves = ['data', 'datavenda', 'emissao', 'nomecliente', 'cliente', 'nomepeca', 'peca'];
  const idx = cabecalhos.map((h, i) => chaves.indexOf(normalizar(h)) >= 0 ? i : -1).filter(i => i >= 0);
  return l => idx.some(i => l[i] !== '' && l[i] !== null);
}

// Cria a coluna de ID (se faltar) e preenche linhas novas ou duplicadas (linha copiada).
// Quem chama segura a trava (LockService).
function garantirIds(sh) {
  let ultimaCol = sh.getLastColumn();
  let cabecalhos = sh.getRange(1, 1, 1, ultimaCol).getValues()[0].map(h => String(h).trim());
  let col = cabecalhos.indexOf(COL_ID) + 1;
  if (!col) {
    col = ultimaCol + 1;
    sh.getRange(1, col).setValue(COL_ID).setFontColor('#999999');
    cabecalhos.push(COL_ID);
  }
  const total = sh.getLastRow() - 1;
  if (total < 1) return;

  const valores = sh.getRange(2, 1, total, cabecalhos.length).getValues();
  const ehLinha = linhaTemDados(cabecalhos);
  const vistos = {};
  let mudou = false;
  const ids = valores.map(l => {
    let id = String(l[col - 1] || '').trim();
    if (!ehLinha(l)) return [id];
    if (!id || vistos[id]) { id = Utilities.getUuid().slice(0, 8); mudou = true; }
    vistos[id] = true;
    return [id];
  });
  if (mudou) sh.getRange(2, col, total, 1).setValues(ids);
}

function responder(fn) {
  let saida;
  try { saida = Object.assign({ ok: true }, fn()); }
  catch (err) { saida = { ok: false, erro: String(err && err.message || err) }; }
  return ContentService.createTextOutput(JSON.stringify(saida)).setMimeType(ContentService.MimeType.JSON);
}
