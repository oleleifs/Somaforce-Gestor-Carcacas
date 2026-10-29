/* =========================================================
   CONFIGURAÇÃO
   Nomes de colunas, situações, faixas de idade. Ajustes do dia a dia ficam aqui.
   ========================================================= */

const STORAGE_KEY = 'carcacas_web_v1';
const PAGE_SIZE = 50;

// Nomes aceitos para cada coluna (comparados sem acento, maiúsculas, espaços ou pontuação).
// Se a planilha mudar o nome de uma coluna, basta acrescentar o novo nome aqui.
const COLUNAS = {
    codCliente: ['codcliente', 'codigocliente', 'codcli'],
    cliente:    ['nomecliente', 'cliente', 'razaosocial'],
    venda:      ['numvenda', 'numerovenda', 'nvenda', 'venda', 'pedido'],
    codPeca:    ['codpeca', 'codigopeca', 'codproduto', 'codigo'],
    peca:       ['nomepeca', 'peca', 'descricao', 'produto'],
    marca:      ['marca', 'fabricante'],
    vendedor:   ['nomevendedor', 'vendedor'],
    data:       ['data', 'datavenda', 'emissao', 'dataemissao'],
    status:     ['situacao', 'status', 'estagio', 'etapa'],
    obs:        ['observacao', 'observacoes', 'obs']
};
const OBRIGATORIAS = ['cliente', 'peca', 'vendedor', 'data'];

// Dados técnicos memorizados por código de peça (cadastro de peças).
// Para acrescentar um campo novo, basta incluir uma linha aqui:
//   campo: nome interno · titulo: nome na tela e na exportação · unidade: aparece ao lado do valor
//   aliases: nomes aceitos se a coluna vier na planilha importada
const CAMPOS_PECA = [
    { campo: 'mmCasco', titulo: 'MM do casco',      unidade: 'mm', exemplo: 'Ex.: 120',
      aliases: ['mmcasco', 'mmdocasco', 'medidacasco', 'diametrocasco', 'casco'] },
    { campo: 'nmRef',   titulo: 'Nm de referência', unidade: 'Nm', exemplo: 'Ex.: 45',
      aliases: ['nmreferencia', 'nmdereferencia', 'nmref', 'nm', 'torquereferencia', 'torque'] }
];
const PECAS_KEY = STORAGE_KEY + '_pecas';

// Situações possíveis de cada venda (sem registro = pendente)
const STATUS = {
    pendente:  { label: 'Pendente' },
    andamento: { label: 'Em andamento' },
    concluida: { label: 'Concluída' },
    excluida:  { label: 'Excluída' }
};
const STATUS_ORDEM = ['pendente', 'andamento', 'concluida', 'excluida'];
const ACOMP_KEY = STORAGE_KEY + '_acompanhamento';

// Faixas de idade da carcaça (dias desde a venda)
const FAIXAS = [
    { id: 'f1', label: '0 a 30 dias',   min: 0,  max: 30,       cor: 'var(--age1)', hex: '#5A5A5A' },
    { id: 'f2', label: '31 a 60 dias',  min: 31, max: 60,       cor: 'var(--age2)', hex: '#9A6A2E' },
    { id: 'f3', label: '61 a 90 dias',  min: 61, max: 90,       cor: 'var(--age3)', hex: '#C8232D' },
    { id: 'f4', label: 'Mais de 90 dias', min: 91, max: Infinity, cor: 'var(--age4)', hex: '#7A0F14' }
];
