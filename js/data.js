/* ════════════════════════════════
   data.js — Configuración + utilidades
════════════════════════════════ */

/* ── SESIÓN ── */
let currentUser = null;

/* ── ESTADOS ── */
function getEstadoInfo(estado) {
  const map = {
    normal: {
      clase: 'ok',
      color: 'var(--green)',
      label: 'Normal'
    },
    fiebre: {
      clase: 'bad',
      color: 'var(--red)',
      label: 'Fiebre'
    }
  };

  return map[estado] || {
    clase: 'none',
    color: 'var(--text3)',
    label: '—'
  };
}

/* ── NAVEGACIÓN ── */
const SCREEN_PAGES = {
  'screen-login': 'login.html',
  'screen-registro': 'registro.html',
  'screen-paciente': 'paciente.html',
  'screen-admin': 'admin.html',
};

function showScreen(id) {
  const el = document.getElementById(id);

  if (el) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    el.classList.add('active');
  } else {
    const pagina = SCREEN_PAGES[id];
    if (pagina) window.location.href = pagina;
  }
}

/* ── TOAST ── */
function showToast(msg, tipo = 'info') {
  const t = document.getElementById('toast');
  const dot = document.getElementById('toast-dot');
  const txt = document.getElementById('toast-msg');

  if (!t) return;

  const colores = {
    ok: 'var(--green)',
    warn: 'var(--yellow)',
    bad: 'var(--red)',
    info: 'var(--accent)'
  };

  dot.style.background = colores[tipo] || colores.info;
  txt.textContent = msg;

  t.className = `toast show ${tipo}`;

  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), 3000);
}