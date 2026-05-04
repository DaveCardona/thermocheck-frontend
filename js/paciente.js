let lecturaTemp = null;
let medidas = [];

const sesion = sessionStorage.getItem('currentUser');

if (!sesion) {
  window.location.replace('login.html');
} else {
  document.body.style.display = 'block'; //  mostrar solo si está autorizado
}

//  PROTECCIÓN INMEDIATA (ANTES DE QUE RENDERICE NADA)
if (!sessionStorage.getItem('currentUser')) {
  window.location.replace('login.html');
}

document.addEventListener('DOMContentLoaded', async () => {
  const sesion = sessionStorage.getItem('currentUser');
  if (!sesion) {
    window.location.href = 'login.html';
    return;
  }

  currentUser = JSON.parse(sesion);

  const screen = document.getElementById('screen-paciente');
  if (screen) screen.classList.add('active');

  await cargarMedidas();
  initPaciente();
});

/* ───────────── UTILS ───────────── */

function obtenerIniciales(nombreCompleto) {
  if (!nombreCompleto) return "--";

  const partes = nombreCompleto.trim().split(" ");
  if (partes.length === 1) return partes[0][0].toUpperCase();

  return (partes[0][0] + partes[1][0]).toUpperCase();
}

/* ───────────── UTILS EXTRA ───────────── */

//  convierte fecha actual a formato YYYY-MM-DD
function hoyISO() {
  return new Date().toISOString().split("T")[0];
}

//  clasifica temperatura
function clasificarTemp(temp) {
  if (temp >= 37.5) return 'fiebre';
  return 'normal';
}

//  formatea fecha YYYY-MM-DD a formato bonito
function formatFecha(fechaISO) {
  const fecha = new Date(fechaISO);

  return fecha.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}


/* ───────────── CONTROL CENTRAL  ───────────── */

function puedeTomarMedicion() {
  const hoy = hoyISO();
  const lecturasHoy = medidas.filter(m => m.fecha === hoy);
  return lecturasHoy.length < 3;
}

/* ───────────── INIT ───────────── */

function initPaciente() {
  document.getElementById('pac-avatar').textContent = obtenerIniciales(currentUser.nombre_completo);
  document.getElementById('pac-nombre').textContent = currentUser.nombre;

  document.getElementById('pac-fecha-hoy').textContent =
    new Date().toLocaleDateString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

  renderEstadoHoy();
  renderHistorial();
}

/* ───────────── BACKEND ───────────── */

async function cargarMedidas() {
  try {
    const res = await fetch(`${CONFIG.API_URL}/medidas/${currentUser.id_usuario}`);
    const data = await res.json();

    if (!data.success) {
      showToast("Error cargando historial", "error");
      return;
    }

    medidas = data.data.map(m => {
      const fechaObj = new Date(m.fecha);

      return {
        temp: parseFloat(m.temperatura),
        fecha: fechaObj.toISOString().split("T")[0],
        hora: fechaObj.toTimeString().slice(0, 5),
        estado: clasificarTemp(parseFloat(m.temperatura))
      };
    });

  } catch (error) {
    console.error(error);
    showToast("Error de conexión", "error");
  }
}

/* ───────────── ESTADO HOY ───────────── */

function renderEstadoHoy() {
  const btn = document.getElementById('btn-tomar');

  if (!puedeTomarMedicion()) {
    btn.innerHTML = "Máximo de mediciones alcanzado";
    btn.className = "btn-tomar tomada";
    btn.disabled = true;
    btn.onclick = null;

    // refuerzo visual
    document.getElementById('status-titulo').textContent = "Límite alcanzado";
    document.getElementById('status-desc').textContent = "Ya realizaste 3 mediciones hoy.";

    return;
  }

  const hoy = hoyISO();
  const lecturasHoy = medidas
    .filter(m => m.fecha === hoy)
    .sort((a, b) => b.hora.localeCompare(a.hora));

  const ultima = lecturasHoy[0];

  if (ultima) {
    const info = getEstadoInfo(ultima.estado);

    document.getElementById('status-icon').className = 'status-indicator ' + info.clase;
    document.getElementById('status-icon').textContent = ultima.estado === 'normal' ? '✓' : '⚠';

    document.getElementById('status-titulo').textContent = info.label;
    document.getElementById('status-desc').textContent = info.consejo;

    document.getElementById('status-temp').textContent = ultima.temp.toFixed(1) + '°C';

    btn.className = 'btn-tomar tomada';
    btn.innerHTML = "Tomar otra medición";
    btn.onclick = abrirModal;
    btn.disabled = false;

  } else {
    btn.className = 'btn-tomar';
    btn.innerHTML = "Tomar temperatura ahora";
    btn.onclick = abrirModal;
  }
}

/* ───────────── HISTORIAL ───────────── */

function renderHistorial() {
  const el = document.getElementById('pac-historial');

  if (!medidas.length) {
    el.innerHTML = '<div class="empty-state">No hay lecturas registradas</div>';
    return;
  }

  el.innerHTML = medidas.map(m => {
    const info = getEstadoInfo(m.estado);

    return `
    <div class="historial-item">
      <div class="dot ${info.clase}"></div>
      <div class="h-fecha">${formatFecha(m.fecha)} — ${m.hora}</div>
      <div class="h-temp" style="color:${info.color}">
        ${m.temp.toFixed(1)}°C
      </div>
      <span class="badge-estado ${info.clase}">
        ${info.label}
      </span>
    </div>
    `;
  }).join('');
}

/* ───────────── MODAL ───────────── */

async function abrirModal() {

  // 🔥 CONTROL ABSOLUTO (NO TOKEN SI YA HAY 3)
  if (!puedeTomarMedicion()) {
    showToast("Máximo de 3 mediciones alcanzado", "warn");
    return;
  }

  lecturaTemp = null;

  const res = await fetch(`${CONFIG.API_URL}/sesion-medicion`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id_usuario: currentUser.id_usuario
    })
  });

  const data = await res.json();

  if (!data.success) {
    showToast(data.message || "No se pudo iniciar sesión", "error");
    return;
  }

  sessionStorage.setItem("medicion_token", data.token);

  document.getElementById('modal-toma').classList.add('open');
  document.getElementById('modal-escaneando').style.display = 'block';
  document.getElementById('modal-resultado').style.display = 'none';

  setTimeout(() => {
    const temp = +(35.5 + Math.random() * 4).toFixed(1);
    mostrarResultadoModal(temp);
  }, 2000);
}

/* ───────────── RESULTADO ───────────── */

function mostrarResultadoModal(temp) {
  lecturaTemp = temp;

  const estado = clasificarTemp(temp);
  const info = getEstadoInfo(estado);

  document.getElementById('modal-escaneando').style.display = 'none';
  document.getElementById('modal-resultado').style.display = 'block';

  document.getElementById('modal-temp-val').textContent = temp + "°C";
  document.getElementById('modal-temp-val').style.color = info.color;

  document.getElementById('modal-badge-estado').innerHTML =
    `<span class="badge-estado ${info.clase}">${info.label}</span>`;

  document.getElementById('modal-consejo').textContent = info.consejo;
}

/* ───────────── GUARDAR ───────────── */

async function confirmarLectura() {
  try {
    const token = sessionStorage.getItem("medicion_token");

    const res = await fetch(`${CONFIG.API_URL}/medidas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        temperatura: lecturaTemp
      })
    });

    const data = await res.json();

    if (!data.success) {
      showToast(data.message, "warn");
      return;
    }

    showToast("Temperatura guardada", "ok");

    sessionStorage.removeItem("medicion_token");

    cerrarModal();

    await cargarMedidas();
    renderEstadoHoy();
    renderHistorial();

  } catch (error) {
    console.error(error);
    showToast("Error servidor", "error");
  }
}

/* ───────────── CERRAR MODAL ───────────── */

function cerrarModal() {
  document.getElementById('modal-toma').classList.remove('open');
}

/* ───────────── LOGOUT ───────────── */

function logout() {
  // borrar sesión
  sessionStorage.removeItem("currentUser");
  sessionStorage.removeItem("medicion_token");

  // redirigir
  window.location.href = "login.html";
}

window.addEventListener('pageshow', function (event) {
  if (event.persisted || window.performance.getEntriesByType("navigation")[0].type === "back_forward") {
    
    if (!sessionStorage.getItem('currentUser')) {
      window.location.replace('login.html');
    }
  }
});