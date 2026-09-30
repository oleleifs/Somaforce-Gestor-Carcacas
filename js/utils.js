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
