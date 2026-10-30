/* =========================================================
   ESTADO
   Variáveis globais compartilhadas entre os arquivos.
   ========================================================= */

let dados = [];          // todas as linhas importadas
let filtrados = [];      // linhas após filtros
let meta = null;         // { arquivo, importadoEm }
const filtros = { de: '', ate: '', vendedor: '', marca: '', busca: '', cliente: '', faixa: '', status: '' };
let acomp = {};                 // { idDaLinha: { status, obs, atualizadoEm } }
const selecionados = new Set(); // ids marcados na tabela
const ordem = { campo: 'data', dir: 'desc' };
let pagina = 1;
let modoPlanilha = false; // true quando os dados vêm da planilha Google (planilha.js)
const charts = {};
