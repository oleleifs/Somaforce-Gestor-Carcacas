/* =========================================================
   INICIALIZAÇÃO
   Liga os eventos da tela e carrega os dados salvos. Deve ser o último script.
   ========================================================= */

configurarChartJs();

[['fDe', 'de'], ['fAte', 'ate']].forEach(([id, campo]) => {
    const el = document.getElementById(id);
    mascaraData(el);
    adicionarCalendario(el);
    el.addEventListener('input', () => {
        const v = el.value;
        // Só filtra com a data completa ou com o campo vazio
        if (v !== '' && (v.length !== 10 || !paraData(v))) return;
        filtros[campo] = v;
        pagina = 1;
        atualizar();
    });
});
document.getElementById('fVend').addEventListener('change', e => { filtros.vendedor = e.target.value; pagina = 1; atualizar(); });
document.getElementById('fMarca').addEventListener('change', e => { filtros.marca = e.target.value; pagina = 1; atualizar(); });
let buscaTimer;
document.getElementById('fBusca').addEventListener('input', e => {
    clearTimeout(buscaTimer);
    buscaTimer = setTimeout(() => { filtros.busca = e.target.value; pagina = 1; atualizar(); }, 200);
});
document.getElementById('pgPrev').addEventListener('click', () => { pagina--; renderTabela(); });
document.getElementById('pgNext').addEventListener('click', () => { pagina++; renderTabela(); });

document.getElementById('obsSalvar').addEventListener('click', salvarObs);
document.getElementById('obsCancelar').addEventListener('click', () => document.getElementById('obsDialog').close());
document.getElementById('obsTexto').addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) salvarObs(); });

document.getElementById('pecaSalvar').addEventListener('click', salvarPeca);
document.getElementById('pecaCancelar').addEventListener('click', () => document.getElementById('pecaDialog').close());
document.getElementById('pecaCampos').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); salvarPeca(); } });

// Relatório
['rDe', 'rAte'].forEach(id => { const el = document.getElementById(id); mascaraData(el); adicionarCalendario(el); });
document.getElementById('relDialog').addEventListener('input', atualizarContagemRelatorio);
document.getElementById('relDialog').addEventListener('change', atualizarContagemRelatorio);
document.getElementById('relGerar').addEventListener('click', gerarRelatorioPDF);
document.getElementById('relCancelar').addEventListener('click', () => document.getElementById('relDialog').close());
document.getElementById('relTela').addEventListener('click', usarFiltrosDaTela);
document.getElementById('relLimpar').addEventListener('click', limparFiltrosRelatorio);

montarCamposPeca();
carregarPecas();
carregarAcomp();
if (carregar()) montarDashboard();
