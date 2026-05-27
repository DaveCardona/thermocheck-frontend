/* ════════════════════════════════
   admin.js — Dashboard administrador
════════════════════════════════ */

let adminFiltro = 'todos';
let adminPagina = 1;
const ADMIN_PPP = 8;
let adminInterval = null;

/* PAGINACIÓN ADMIN */

const ADMIN_EMPRESAS_PPP = 10;
const ADMIN_USUARIOS_PPP = 10;

let empresaPagina = 1;
let usuarioPagina = 1;

/* ── Init: restaurar sesión ── */
document.addEventListener('DOMContentLoaded', () => {
  const sesion = sessionStorage.getItem('currentUser');

  if (!sesion) {
    window.location.href = 'index.html';
    return;
  }

  currentUser = JSON.parse(sesion);

  if (currentUser.id_rol !== 2) {
    window.location.href = 'paciente.html';
    return;
  }

  //  Evitar volver atrás después de logout
  window.addEventListener('pageshow', function () {
    if (!sessionStorage.getItem('currentUser')) {
      window.location.replace('index.html');
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

function getFechaLocalISO(fechaISO) {
  // corta solo la parte de fecha sin tocar zona
  return fechaISO.split('T')[0];
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
        const estado =
          temp < 36.5
            ? 'hipotermia'
            : temp > 37.5
              ? 'fiebre'
              : 'normal';
        const info = getEstadoInfo(estado);

        const fechaLocal = l.fecha.replace('Z', '');
        const fechaObj = new Date(fechaLocal);

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

function mostrarPanelAdmin() {

  document
    .getElementById(
      'panel-admin-config'
    )
    .classList.add(
      'active'
    );

  cargarEmpresasAdmin();
  cargarUsuariosAdmin();

}

function cerrarPanelAdmin() {

  document
    .getElementById(
      'panel-admin-config'
    )
    .classList.remove(
      'active'
    );

}

function renderUsuarios(lista) {

  const totalPags =
    Math.max(
      1,
      Math.ceil(
        lista.length /
        ADMIN_USUARIOS_PPP
      )
    );

  if (
    usuarioPagina >
    totalPags
  ) {
    usuarioPagina =
      totalPags;
  }

  const slice =
    lista.slice(
      (usuarioPagina - 1)
      *
      ADMIN_USUARIOS_PPP,

      usuarioPagina *
      ADMIN_USUARIOS_PPP
    );

  const tbody =
    document.getElementById(
      "usuarios-body"
    );

  tbody.innerHTML =
    slice.map(u => `

<tr>

<td>
${u.nombre}
${u.apellido}
</td>

<td>
${u.username}
</td>

<td>
${u.empresa || "-"}
</td>

<td>

<span class="
badge-estado
${u.activo ? "normal" : "fiebre"}
">

${u.activo ?
        "Activo" :
        "Inactivo"}

</span>

</td>

<td>

<button
class="btn-editar"
onclick="
editarUsuario(
${u.id_usuario}
)
">

Editar

</button>

<button
class="btn-estado"
onclick="
cambiarEstadoUsuario(
${u.id_usuario}
)
">

${u.activo ?
        "Inactivar" :
        "Activar"}

</button>

</td>

</tr>

`).join("");

  renderPaginacionAdmin(
    "usuario-pag-btns",
    "usuario-pag-info",
    lista.length,
    slice.length,
    totalPags,
    usuarioPagina,
    (p) => {

      usuarioPagina = p;
      renderUsuarios(lista);

    }
  );
}



function renderEmpresas(lista) {

  const totalPags =
    Math.max(
      1,
      Math.ceil(
        lista.length /
        ADMIN_EMPRESAS_PPP
      )
    );

  if (
    empresaPagina >
    totalPags
  ) {
    empresaPagina =
      totalPags;
  }

  const slice =
    lista.slice(
      (empresaPagina - 1)
      *
      ADMIN_EMPRESAS_PPP,

      empresaPagina *
      ADMIN_EMPRESAS_PPP
    );

  const tbody =
    document.getElementById(
      "empresa-body"
    );

  tbody.innerHTML =
    slice.map(e => `

<tr>

<td>${e.nombre}</td>

<td>${e.direccion || "-"}</td>

<td>${e.celular || "-"}</td>

<td>${e.correo || "-"}</td>

<td>

<span class="
badge-estado
${e.activo ? "normal" : "fiebre"}
">

${e.activo ? "Activa" : "Inactiva"}

</span>

</td>

<td>

<button
class="btn-editar"
onclick='editarEmpresa(
${e.id_empresa},
${JSON.stringify(e.nombre || "")},
${JSON.stringify(e.direccion || "")},
${JSON.stringify(e.celular || "")},
${JSON.stringify(e.correo || "")}
)'
>
Editar
</button>

<button
class="btn-estado"
onclick="
cambiarEstadoEmpresa(
${e.id_empresa}
)
">
${e.activo ? "Inactivar" : "Activar"}
</button>

</td>

</tr>

`).join("");

  renderPaginacionAdmin(
    "empresa-pag-btns",
    "empresa-pag-info",
    lista.length,
    slice.length,
    totalPags,
    empresaPagina,
    (p) => {

      empresaPagina = p;
      renderEmpresas(lista);

    }
  );
}

function renderPaginacionAdmin(
  contenedor,
  infoId,
  totalRegistros,
  registrosPagina,
  totalPags,
  paginaActual,
  callback
) {

  const pag =
    document.getElementById(contenedor);

  pag.innerHTML = "";

  // texto "Mostrando X de Y"
  document.getElementById(
    infoId
  ).textContent =
    `Mostrando ${registrosPagina} de ${totalRegistros} registros`;

  const crear = (
    txt,
    accion,
    disabled = false,
    active = false
  ) => {

    const btn =
      document.createElement("button");

    btn.className =
      `pag-btn ${active ? "active" : ""
      }`;

    btn.textContent = txt;

    btn.onclick = accion;

    if (disabled) {
      btn.style.opacity = ".35";
    }

    return btn;

  };

  // botón atrás
  pag.appendChild(
    crear(
      "←",
      () => callback(
        paginaActual - 1
      ),
      paginaActual === 1
    )
  );

  // páginas
  for (let i = 1; i <= totalPags; i++) {

    pag.appendChild(

      crear(
        i,
        () => callback(i),
        false,
        i === paginaActual
      )

    );

  }

  // botón siguiente
  pag.appendChild(

    crear(
      "→",
      () => callback(
        paginaActual + 1
      ),
      paginaActual === totalPags
    )

  );

}

async function cambiarEstadoEmpresa(id) {

  abrirConfirmacion(
    "¿Seguro que deseas cambiar el estado de esta empresa?",
    async () => {

      await fetch(
        `${CONFIG.API_URL}/admin/empresas/${id}/estado`,
        {
          method: "PUT"
        }
      );

      cargarEmpresasAdmin();

    });

}



async function cargarEmpresasAdmin() {

  const buscar =
    document.getElementById(
      "buscar-empresa-admin"
    )?.value
      .toLowerCase() || "";

  const estado =
    document.getElementById(
      "estado-empresa-admin"
    )?.value;

  const res = await fetch(
    `${CONFIG.API_URL}/admin/empresas`
  );

  const data =
    await res.json();

  let lista = data.data;

  if (buscar) {

    lista = lista.filter(
      e => e.nombre
        .toLowerCase()
        .includes(buscar)
    );

  }

  if (estado !== "") {

    lista = lista.filter(
      e => String(e.activo) === estado
    );

  }

  renderEmpresas(lista);

}

async function cargarUsuariosAdmin() {

  const buscar =
    document.getElementById(
      "buscar-usuario-admin"
    )?.value
      .toLowerCase() || "";

  const estado =
    document.getElementById(
      "estado-usuario-admin"
    )?.value;

  const res =
    await fetch(
      `${CONFIG.API_URL}/admin/usuarios`
    );

  const data =
    await res.json();

  let lista = data.data;

  if (buscar) {

    lista = lista.filter(
      u =>

        `${u.nombre}
${u.apellido}`
          .toLowerCase()
          .includes(buscar)

    );

  }

  if (estado !== "") {

    lista = lista.filter(
      u => String(u.activo) === estado
    );

  }

  renderUsuarios(lista);

}

async function cambiarEstadoUsuario(id) {

  abrirConfirmacion(
    "¿Seguro que deseas cambiar el estado de este usuario?",
    async () => {

      await fetch(
        `${CONFIG.API_URL}/admin/usuarios/${id}/estado`,
        {
          method: "PUT"
        });

      cargarUsuariosAdmin();

    });

}

let empresaEditando = null;


/* ==========================
MODAL EMPRESA
========================== */

function abrirModalEmpresa() {

  empresaEditando = null;

  document.getElementById(
    "empresa-modal-title"
  ).textContent =
    "Nueva empresa";

  document.getElementById(
    "empresa-nombre"
  ).value = "";

  document.getElementById(
    "empresa-direccion"
  ).value = "";

  document.getElementById(
    "empresa-celular"
  ).value = "";

  document.getElementById(
    "empresa-correo"
  ).value = "";

  document.getElementById(
    "modal-empresa"
  ).classList.add(
    "active"
  );

}


function cerrarModalEmpresa() {

  document.getElementById(
    "modal-empresa"
  ).classList.remove(
    "active"
  );

}


/* editar */
function editarEmpresa(
  id,
  nombre,
  direccion,
  celular,
  correo
) {

  empresaEditando = id;

  document.getElementById(
    "empresa-modal-title"
  ).textContent =
    "Editar empresa";

  document.getElementById(
    "empresa-nombre"
  ).value =
    nombre || "";

  document.getElementById(
    "empresa-direccion"
  ).value =
    direccion || "";

  document.getElementById(
    "empresa-celular"
  ).value =
    celular || "";

  document.getElementById(
    "empresa-correo"
  ).value =
    correo || "";

  document.getElementById(
    "modal-empresa"
  ).classList.add(
    "active"
  );

}


/* guardar */

async function guardarEmpresa() {

  const nombre =
    document.getElementById(
      "empresa-nombre"
    ).value.trim();

  const direccion =
    document.getElementById(
      "empresa-direccion"
    ).value.trim();

  const celular =
    document.getElementById(
      "empresa-celular"
    ).value.trim();

  const correo =
    document.getElementById(
      "empresa-correo"
    ).value.trim();


  if (!nombre) {

    showToast(
      "Ingrese un nombre",
      "error"
    );

    return;

  }


  const body = {

    nombre,
    direccion,
    celular,
    correo

  };


  const url =

    empresaEditando

      ? `${CONFIG.API_URL}/admin/empresas/${empresaEditando}`

      : `${CONFIG.API_URL}/admin/empresas`;


  const method =

    empresaEditando
      ? "PUT"
      : "POST";


  const res = await fetch(
    url,
    {
      method,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    }
  );

  const data = await res.json();

  if (!data.success) {
    showToast(
      "Error guardando empresa",
      "error"
    );
    return;
  }

  cerrarModalEmpresa();

  await cargarEmpresasAdmin();

  showToast(
    "Empresa guardada",
    "success"
  );

}


/* ==========================
CONFIRMACIÓN
========================== */

function abrirConfirmacion(
  texto,
  callback
) {

  document.getElementById(
    "confirm-text"
  ).textContent =
    texto;

  document.getElementById(
    "confirm-btn"
  ).onclick = () => {

    callback();

    cerrarConfirmacion();

  };

  document.getElementById(
    "modal-confirmar"
  ).classList.add(
    "active"
  );

}


function cerrarConfirmacion() {

  document.getElementById(
    "modal-confirmar"
  ).classList.remove(
    "active"
  );

}

let usuarioEditando = null;
let tiposDocumento = [];
let empresas = [];

async function cargarCatalogosUsuario() {

  try {

    const [tiposRes, empresasRes] = await Promise.all([

      fetch(`${CONFIG.API_URL}/tipos-documento`),
      fetch(`${CONFIG.API_URL}/admin/empresas/catalogo`)

    ]);

    tiposDocumento = await tiposRes.json();

    const empresasData = await empresasRes.json();

    // ← extraer arreglo correctamente
    empresas = empresasData.data || [];

    const listaTipos =
      document.getElementById("lista-tipos");

    listaTipos.innerHTML =
      tiposDocumento.map(t => `
        <option value="${t.nombre}"></option>
      `).join("");

    const listaEmpresas =
      document.getElementById("lista-empresas");

    listaEmpresas.innerHTML =
      empresas.map(e => `
        <option value="${e.nombre}"></option>
      `).join("");

  }

  catch (err) {

    console.error(err);

    showToast(
      "Error cargando catálogos",
      "error"
    );

  }

}

async function editarUsuario(id) {

  usuarioEditando = id;

  await cargarCatalogosUsuario();

  const res =
    await fetch(
      `${CONFIG.API_URL}/admin/usuarios/${id}`
    );

  const data =
    await res.json();

  const u = data.data;

  document.getElementById(
    "u-nombre"
  ).value = u.nombre || "";

  document.getElementById(
    "u-apellido"
  ).value = u.apellido || "";

  document.getElementById(
    "u-tipo"
  ).value = u.tipo_documento || "";

  document.getElementById(
    "u-documento"
  ).value = u.numero_documento || "";

  document.getElementById(
    "u-direccion"
  ).value = u.direccion || "";

  document.getElementById(
    "u-celular"
  ).value = u.celular || "";

  document.getElementById(
    "u-empresa"
  ).value = u.empresa || "";

  const existeEmpresa = empresas.some(
    e => e.nombre === u.empresa
  );

  if (
    !existeEmpresa &&
    u.empresa
  ) {

    empresas.push({
      id: u.id_empresa,
      nombre: u.empresa,
      activo: false
    });

  }

  iniciarValidacionesModalUsuario();
  document.getElementById(
    "modal-usuario"
  ).classList.add(
    "active"
  );

}

function confirmarGuardarUsuario() {
  if (!validarModalUsuario()) return;
  abrirConfirmacion(
    "¿Guardar cambios del usuario?",

    guardarUsuario

  );

}

async function guardarUsuario() {

  const nombreTipo =
    document.getElementById(
      "u-tipo"
    ).value;

  const nombreEmpresa =
    document.getElementById(
      "u-empresa"
    ).value;

  const tipoSeleccionado =
    tiposDocumento.find(
      t => t.nombre === nombreTipo
    );

  const empresaSeleccionada =
    empresas.find(
      e => e.nombre === nombreEmpresa
    );

  if (
    empresaSeleccionada &&
    !empresaSeleccionada.activo
  ) {

    showToast(
      "No puedes asignar una empresa inactiva",
      "error"
    );

    return;

  }

  const body = {

    nombre:
      document.getElementById(
        "u-nombre"
      ).value,

    apellido:
      document.getElementById(
        "u-apellido"
      ).value,

    id_tipo_documento:
      tipoSeleccionado?.id || null,

    numero_documento:
      document.getElementById(
        "u-documento"
      ).value,

    direccion:
      document.getElementById(
        "u-direccion"
      ).value,

    celular:
      document.getElementById(
        "u-celular"
      ).value,

    id_empresa:
      empresaSeleccionada?.id || null

  };

  await fetch(

    `${CONFIG.API_URL}/admin/usuarios/${usuarioEditando}`,

    {

      method: "PUT",

      headers: {
        "Content-Type":
          "application/json"
      },

      body: JSON.stringify(body)

    }

  );

  cerrarModalUsuario();

  cargarUsuariosAdmin();

  showToast(
    "Usuario actualizado",
    "success"
  );

}

function cerrarModalUsuario() {

  document.getElementById(
    "modal-usuario"
  ).classList.remove(
    "active"
  );

}