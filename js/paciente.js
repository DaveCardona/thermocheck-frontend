let lecturaTemp = null;
let medidas = [];

const sesion = sessionStorage.getItem('currentUser');

if (!sesion) {
  window.location.replace('index.html');
} else {
  document.body.style.display = 'block';
}

if (!sessionStorage.getItem('currentUser')) {
  window.location.replace('index.html');
}

document.addEventListener('DOMContentLoaded', async () => {
  const sesion = sessionStorage.getItem('currentUser');
  if (!sesion) {
    window.location.href = 'index.html';
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

function hoyISO() {
  return new Date().toISOString().split("T")[0];
}

function clasificarTemp(temp) {
  if (temp >= 37.5) return 'fiebre';
  return 'normal';
}

function formatFecha(fechaISO) {
  const fecha = new Date(fechaISO);
  return fecha.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

/* ───────────── CONTROL ───────────── */

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

/* ───────────── MODAL ───────────── */

async function abrirModal() {

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

  showToast("Esperando dispositivo...", "info");

  iniciarPolling();
}

/* ───────────── POLLING PRO ───────────── */

let pollingInterval = null;

function iniciarPolling() {

  if (pollingInterval) {
    clearInterval(pollingInterval);
  }

  const token = sessionStorage.getItem("medicion_token");
  const TIMEOUT = 20000;
  const start = Date.now();

  pollingInterval = setInterval(async () => {
    try {

      // timeout
      if (Date.now() - start > TIMEOUT) {
        clearInterval(pollingInterval);
        showToast("Tiempo de espera agotado", "warn");
        cerrarModal();
        return;
      }

      const res = await fetch(`${CONFIG.API_URL}/medicion-estado/${token}`);
      const data = await res.json();

      if (!data.success) return;

      if (data.estado === "completado") {
        clearInterval(pollingInterval);

        mostrarResultadoModal(parseFloat(data.temperatura));

        sessionStorage.removeItem("medicion_token");

        showToast("Medición recibida", "ok");
      }

    } catch (error) {
      console.error(error);
    }
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

/* ───────────── CIERRE ───────────── */

function cerrarModal() {
  document.getElementById('modal-toma').classList.remove('open');

  if (pollingInterval) {
    clearInterval(pollingInterval);
  }
}

/* ───────────── LOGOUT ───────────── */

function logout() {
  sessionStorage.removeItem("currentUser");
  sessionStorage.removeItem("medicion_token");
  window.location.href = "index.html";
}