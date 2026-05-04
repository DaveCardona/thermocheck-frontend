/* ════════════════════════════════
   login.js — Autenticación
════════════════════════════════ */

let loginTab = 'paciente';

/* ── Solo en login.html: verificar si ya hay sesión ── */
document.addEventListener('DOMContentLoaded', () => {
  const enLoginPage = !!document.getElementById('screen-login');
  if (!enLoginPage) return;   /* paciente.html / admin.html también cargan este JS — salir */

  const sesion = sessionStorage.getItem('currentUser');
  if (sesion) {
    /* Ya estaba autenticado: ir directo a su pantalla */
    currentUser = JSON.parse(sesion);
    _redirigirPorRol(currentUser.id_rol);
    return;
  }

  /* Sin sesión: mostrar formulario */
  document.getElementById('screen-login').classList.add('active');

  /* Prellenar usuario si viene desde registro */
  const prefill = sessionStorage.getItem('prefill_user');
  if (prefill) {
    const el = document.getElementById('login-user');
    if (el) el.value = prefill;
    sessionStorage.removeItem('prefill_user');
  }
});

/* ── Tabs ── */
function switchLoginTab(tab) {
  loginTab = tab;
  const tPac = document.getElementById('tab-paciente');
  const tAdm = document.getElementById('tab-admin');
  if (tPac) tPac.classList.toggle('active', tab === 'paciente');
  if (tAdm) tAdm.classList.toggle('active', tab === 'admin');
  ocultarErrorLogin();
}

/* ── Login ── */
async function doLogin() {
  const userEl = document.getElementById('login-user');
  const passEl = document.getElementById('login-pass');

  const username = userEl.value.trim();
  const password = passEl.value;

  try {
    const res = await fetch("http://localhost:3000/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (!data.success) {
      mostrarErrorLogin(data.message);
      return;
    }

    const user = data.user;

    // 🔥 Validación por pestaña
    if (loginTab === 'admin' && user.id_rol !== 2) {
      mostrarErrorLogin('No tienes permisos de administrador');
      return;
    }

    if (loginTab === 'paciente' && user.id_rol !== 1) {
      mostrarErrorLogin('Usa la pestaña de administrador');
      return;
    }

    // Guardar sesión
    sessionStorage.setItem('currentUser', JSON.stringify(user));

    // Redirección
    if (user.id_rol === 2) {
      window.location.href = "admin.html";
    } else {
      window.location.href = "paciente.html";
    }

  } catch (error) {
    console.error(error);
    mostrarErrorLogin("Error de conexión con el servidor");
  }
}

function _redirigirPorRol(id_rol) {
  if (id_rol === 2) {
    window.location.href = 'admin.html';
  } else {
    window.location.href = 'paciente.html';
  }
}

/* ── Errores ── */
function mostrarErrorLogin(msg) {
  const e = document.getElementById('login-error');
  if (!e) return;
  e.textContent   = msg;
  e.style.display = 'block';
}

function ocultarErrorLogin() {
  const e = document.getElementById('login-error');
  if (e) e.style.display = 'none';
}

/* ── Logout (llamado desde cualquier página) ── */
function logout() {
  currentUser = null;
  sessionStorage.clear();

  //  Evita volver con botón atrás
  window.location.replace('login.html');
}



/* ── Enter para submit (solo en login.html) ── */
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && document.getElementById('screen-login')) {
    doLogin();
  }
});