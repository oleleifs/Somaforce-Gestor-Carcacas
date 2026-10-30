/* =========================================================
   UTILITÁRIOS
   Conversões de texto, números e datas, e o aviso (toast).
   ========================================================= */

function normalizar(s) {
    return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function texto(v) { return v == null ? '' : String(v).trim(); }

// Números como 1.2345678E7 viram "12345678"
function paraId(v) {
    if (v == null || v === '') return '';
    if (typeof v === 'number') return String(Math.round(v));
    return String(v).trim();
}

function inicioDoDia(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

// Aceita: número serial do Excel, objeto Date, "dd/mm/aaaa" ou "aaaa-mm-dd"
function paraData(v) {
    if (v == null || v === '') return null;
    if (v instanceof Date) return isNaN(v) ? null : inicioDoDia(v);
    if (typeof v === 'number') {
        const d = new Date(Math.round((v - 25569) * 864e5));
        return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    }
    const s = String(v).trim();
    let m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
    if (m) {
        const ano = m[3].length === 2 ? 2000 + +m[3] : +m[3];
        return new Date(ano, +m[2] - 1, +m[1]);
    }
    m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
    return null;
}

// Converte qualquer data (Date, serial do Excel, "aaaa-mm-dd" ou "dd/mm/aaaa") para "dd/mm/aaaa"
function dataBR(v) {
    const d = v instanceof Date ? v : paraData(v);
    if (!d || isNaN(d)) return '';
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

// Coloca as barras automaticamente enquanto a pessoa digita
function mascaraData(el) {
    el.addEventListener('input', () => {
        let v = el.value.replace(/\D/g, '').slice(0, 8);
        if (v.length > 4) v = v.replace(/(\d{2})(\d{2})(\d+)/, '$1/$2/$3');
        else if (v.length > 2) v = v.replace(/(\d{2})(\d+)/, '$1/$2');
        el.value = v;
    });
}

// Botão de calendário dentro de um campo de data em texto (dd/mm/aaaa).
// Escolher no calendário preenche o campo e dispara o evento 'input', como se a pessoa tivesse digitado.
const ICONE_CALENDARIO = '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="16.5" rx="2"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/></svg>';

function adicionarCalendario(el) {
    const caixa = document.createElement('div');
    caixa.className = 'dataBox';
    el.parentNode.insertBefore(caixa, el);
    caixa.appendChild(el);

    const nativo = document.createElement('input');
    nativo.type = 'date';
    nativo.className = 'dataNativa';
    nativo.tabIndex = -1;
    nativo.setAttribute('aria-hidden', 'true');

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dataBtn';
    btn.title = 'Escolher no calendário';
    btn.setAttribute('aria-label', 'Escolher data no calendário');
    btn.innerHTML = ICONE_CALENDARIO;

    caixa.append(nativo, btn);

    btn.addEventListener('click', () => {
        const d = el.value.length === 10 ? paraData(el.value) : null;
        nativo.value = d ? isoDia(d) : '';
        try { nativo.showPicker(); }
        catch (e) { nativo.focus(); nativo.click(); }
    });
    nativo.addEventListener('change', () => {
        el.value = nativo.value ? dataBR(nativo.value) : '';
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.focus();
    });
}

const fmtData = d => dataBR(d);
const fmtNum = n => n.toLocaleString('pt-BR');
const isoDia = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function faixaDe(dias) { return FAIXAS.find(f => dias >= f.min && dias <= f.max); }


let toastTimer;
function toast(msg, erro = false) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.toggle('err', erro);
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 4500);
}
