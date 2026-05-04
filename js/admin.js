/* ════════════════════════════════
   admin.js — Dashboard administrador
════════════════════════════════ */

let adminFiltro = 'todos';
let adminPagina = 1;
const ADMIN_PPP = 8;
let adminInterval = null;

/* ── Init: restaurar sesión ── */
document.addEventListener('DOMContentLoaded', () => {
  const sesion = sessionStorage.getItem('currentUser');

  if (!sesion) {
    window.location.href = 'login.html';
    return;
  }

  currentUser = JSON.parse(sesion);

  if (currentUser.id_rol !== 2) {
    window.location.href = 'paciente.html';
    return;
  }

  // 🔥 Evitar volver atrás después de logout
  window.addEventListener('pageshow', function () {
    if (!sessionStorage.getItem('currentUser')) {
      window.location.replace('login.html');
    }
  });

  const screen = document.getElementById('screen-admin');
  if (screen) screen.classList.add('active');

  initAdmin();
});



/* ── INIT ── */
function initAdmin() {

  document.getElementById('admin-avatar').textContent =
    obtenerIniciales(currentUser.nombre_completo);

  document.getElementById('admin-nombre').textContent =
    currentUser.nombre;

  renderAdminStats();
  renderAdminTabla();

  if (adminInterval) clearInterval(adminInterval);

  adminInterval = setInterval(() => {
    renderAdminStats();
    renderAdminTabla();
  }, 10000);
}

/* ── STATS (DESDE BACKEND) ── */
async function renderAdminStats() {
  try {
    const res = await fetch(`${CONFIG.API_URL}/admin/stats`);
    const data = await res.json();

    if (!data.success) return;

    const stats = data.data;

    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    set('stat-total', stats.total);
    set('stat-prom', stats.promedio ? stats.promedio.toFixed(1) + '°C' : '--.-');
    set('stat-max', stats.max_temp ? stats.max_temp.toFixed(1) + '°C' : '--.-');
    set('stat-max-quien', stats.max_user || '—');
    set('stat-alertas', stats.alertas);

    const banner = document.getElementById('alertas-banner');

    if (stats.alertas > 0) {
      document.getElementById('alertas-texto').textContent =
        `⚠ ${stats.alertas} paciente(s) con fiebre en las últimas 24h`;

      banner.classList.add('visible');
    } else {
      banner.classList.remove('visible');
    }

  } catch (err) {
    console.error(err);
  }
}


/* ───────────── UTILS ───────────── */

function obtenerIniciales(nombreCompleto) {
  if (!nombreCompleto) return "--";

  const partes = nombreCompleto.trim().split(" ");
  if (partes.length === 1) return partes[0][0].toUpperCase();

  return (partes[0][0] + partes[1][0]).toUpperCase();
}

/* ── FILTROS ── */
function setAdminFiltro(filtro, btn) {
  adminFiltro = filtro;
  adminPagina = 1;

  document.querySelectorAll('.filtro-btn')
    .forEach(b => b.classList.remove('active'));

  if (btn) btn.classList.add('active');

  renderAdminTabla();
}

/* ── TABLA (DESDE BACKEND) ── */
async function renderAdminTabla() {
  try {

    const search = document.getElementById('tabla-search').value;
    const empresa = document.getElementById('filtro-empresa')?.value || '';
    const fecha = document.getElementById('filtro-fecha')?.value || '';

    const params = new URLSearchParams({
      estado: adminFiltro,
      search,
      empresa,
      fecha
    });

    const res = await fetch(`${CONFIG.API_URL}/admin/medidas?${params}`);
    const data = await res.json();

    if (!data.success) {
      showToast("Error cargando datos", "error");
      return;
    }

    const lecs = data.data;

    const totalPags = Math.max(1, Math.ceil(lecs.length / ADMIN_PPP));

    if (adminPagina > totalPags) adminPagina = totalPags;

    const slice = lecs.slice(
      (adminPagina - 1) * ADMIN_PPP,
      adminPagina * ADMIN_PPP
    );

    const tbody = document.getElementById('admin-tabla-body');

    tbody.innerHTML = slice.length
      ? slice.map(l => {

        const temp = parseFloat(l.temperatura) || 0;
        const estado = temp >= 37.5 ? 'fiebre' : 'normal';
        const info = getEstadoInfo(estado);

        const fechaObj = new Date(l.fecha);

        return `
    <tr onclick="verDetalle(${l.id_medida})">
      <td><strong>${l.paciente}</strong></td>
      <td style="color:${info.color}">${temp.toFixed(1)}°C</td>
      <td><span class="badge-estado ${info.clase}">${info.label}</span></td>
      <td>${fechaObj.toLocaleString()}</td>
      <td>${l.empresa || '-'}</td>
    </tr>
    `;
      }).join('')
      : `<tr>
          <td colspan="5" class="empty-state">
            Sin registros
          </td>
        </tr>`;

    document.getElementById('pag-info').textContent =
      `Mostrando ${slice.length} de ${lecs.length} registros`;

    renderAdminPaginacion(totalPags);

  } catch (err) {
    console.error(err);
    showToast("Error servidor", "error");
  }
}

/* ── PAGINACIÓN ── */
function renderAdminPaginacion(totalPags) {
  const pagEl = document.getElementById('pag-btns');

  pagEl.innerHTML = '';

  const mk = (label, cb, disabled, active) => {
    const b = document.createElement('button');
    b.className = 'pag-btn' + (active ? ' active' : '');
    b.textContent = label;
    b.onclick = cb;

    if (disabled) b.style.opacity = '.35';

    return b;
  };

  pagEl.appendChild(
    mk('←', () => {
      if (adminPagina > 1) {
        adminPagina--;
        renderAdminTabla();
      }
    }, adminPagina === 1)
  );

  for (let i = 1; i <= totalPags; i++) {
    pagEl.appendChild(
      mk(i, () => {
        adminPagina = i;
        renderAdminTabla();
      }, false, i === adminPagina)
    );
  }

  pagEl.appendChild(
    mk('→', () => {
      if (adminPagina < totalPags) {
        adminPagina++;
        renderAdminTabla();
      }
    }, adminPagina === totalPags)
  );
}

/* ── DETALLE ── */
async function verDetalle(id) {
  try {
    const res = await fetch(`${CONFIG.API_URL}/admin/medidas/${id}`);
    const data = await res.json();

    if (!data.success) return;

    const item = data.data;

    abrirModal(item);

  } catch (err) {
    console.error(err);
  }
}

function abrirModal(item) {

  const body = document.getElementById('modal-body');

  const temp = parseFloat(item.temperatura) || 0;
  const estado = temp >= 37.5 ? 'fiebre' : 'normal';
  const info = getEstadoInfo(estado);

  body.innerHTML = `
    <div class="modal-grid">

      <!-- 👤 PACIENTE -->
      <div class="modal-section">
        <h4>👤 Información del paciente</h4>
        <div class="modal-row">
          <div><strong>Nombre:</strong> ${item.nombre} ${item.apellido}</div>
          <div><strong>Celular:</strong> ${item.celular || '-'}</div>
          <div><strong>Empresa:</strong> ${item.empresa || '-'}</div>
          <div><strong>Dirección:</strong> ${item.direccion || '-'}</div>
        </div>
      </div>

      <!-- 🌡 MEDICIÓN -->
      <div class="modal-section">
        <h4>🌡 Datos de la medición</h4>
        <div class="modal-row">
          <div>
            <strong>Temperatura:</strong> 
            <span style="color:${info.color}; font-weight:600;">
              ${temp.toFixed(1)}°C
            </span>
          </div>

          <div>
            <strong>Estado:</strong> 
            <span class="badge-estado ${info.clase}">
              ${info.label}
            </span>
          </div>

          <div>
            <strong>Fecha:</strong> 
            ${new Date(item.fecha).toLocaleString()}
          </div>
        </div>
      </div>

    </div>
  `;

  document.getElementById('modal-detalle').classList.add('active');
}

function cerrarModal() {
  document.getElementById('modal-detalle').classList.remove('active');
}