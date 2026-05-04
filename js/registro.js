/* ════════════════════════════════
   registro.js — Registro real conectado a backend
════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  const enRegistro = !!document.getElementById('screen-registro');
  if (!enRegistro) return;

  cargarTiposDocumento();
  cargarEmpresas();
});

/* ── CARGA DE DATOS ── */

async function cargarTiposDocumento() {
  try {
    const res = await fetch("http://localhost:3000/tipos-documento");
    const data = await res.json();

    const select = document.getElementById('reg-tipo-doc');
    
    
    
    data.forEach(td => {
      const opt = document.createElement('option');
      opt.value = td.id;
      opt.textContent = td.nombre;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error("Error cargando tipos de documento", err);
  }
}

async function cargarEmpresas() {
  try {
    const res = await fetch("http://localhost:3000/empresas");
    const data = await res.json();

    const select = document.getElementById('reg-empresa');
    data.forEach(emp => {
      const opt = document.createElement('option');
      opt.value = emp.id;
      opt.textContent = emp.nombre;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error("Error cargando empresas", err);
  }
}

/* ── NAVEGACIÓN ── */

function volverAlLogin() {
  window.location.href = 'login.html';
}

/* ── PASSWORD ── */

function onPassChange() {
  const val = document.getElementById('reg-pass');
  if (val) actualizarFuerzaPassword(val.value);
}

function actualizarFuerzaPassword(val) {
  const bars = document.querySelectorAll('.strength-bar');
  const label = document.getElementById('strength-label');
  if (!bars.length || !label) return;

  let nivel = 0;
  if (val.length >= 6) nivel = 1;
  if (val.length >= 8 && /[A-Z]/.test(val)) nivel = 2;
  if (val.length >= 8 && /[A-Z]/.test(val) && /[0-9]/.test(val)) nivel = 3;

  const clases = ['', 'active-weak', 'active-medium', 'active-strong'];
  const textos = ['', 'Débil', 'Media', 'Fuerte'];
  const colores = ['var(--text3)', 'var(--red)', 'var(--yellow)', 'var(--green)'];

  bars.forEach((b, i) => {
    b.className = 'strength-bar';
    if (i < nivel) b.classList.add(clases[nivel]);
  });

  label.textContent = textos[nivel];
  label.style.color = colores[nivel];
}

/* ── REGISTRO ── */

async function doRegistro(e) {
  e.preventDefault();
  const g = id => (document.getElementById(id)?.value || '').trim();

  const nombre = g('reg-nombre');
  const apellido = g('reg-apellido');
  const tipoDoc = g('reg-tipo-doc');
  const numDoc = g('reg-num-doc');
  const empresa = g('reg-empresa');
  const celular = g('reg-celular');
  const direccion = g('reg-direccion');
  const user = g('reg-user').toLowerCase();
  const pass = g('reg-pass');
  const pass2 = g('reg-pass2');
  const terminos = document.getElementById('reg-terminos')?.checked;

  /* ── VALIDACIONES ── */

  if (!nombre || !apellido || !tipoDoc || !numDoc || !empresa || !user || !pass || !pass2) {
    return mostrarErrorRegistro('Completa todos los campos obligatorios');
  }

  if (!direccion) {
    return mostrarErrorRegistro('La dirección es obligatoria');
  }

  if (!celular) {
    return mostrarErrorRegistro('El número de celular es obligatorio');
  }

  if (!/^\d{6,12}$/.test(numDoc)) {
    return mostrarErrorRegistro('El documento debe tener entre 6 y 12 dígitos');
  }

  if (user.length < 4) {
    return mostrarErrorRegistro('El usuario debe tener mínimo 4 caracteres');
  }

  if (pass.length < 6) {
    return mostrarErrorRegistro('La contraseña debe tener mínimo 6 caracteres');
  }

  if (pass !== pass2) {
    return mostrarErrorRegistro('Las contraseñas no coinciden');
  }

  if (!terminos) {
    return mostrarErrorRegistro('Debes aceptar el tratamiento de datos');
  }

  if (!tipoDoc || tipoDoc === "") {
    return mostrarErrorRegistro('Selecciona un tipo de documento');
  }

  if (!empresa || empresa === "") {
    return mostrarErrorRegistro('Selecciona una empresa');
  }

  /* ── PETICIÓN AL BACKEND ── */

  try {
    const res = await fetch("http://localhost:3000/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        nombre,
        apellido,
        username: user,
        password: pass,
        id_tipo_documento: tipoDoc,
        numero_documento: numDoc,
        celular,
        direccion,
        id_empresa: empresa,
        id_rol: 1
      })
    });

    const data = await res.json();

    if (!data.success) {
      return mostrarErrorRegistro(data.message);
    }

    mostrarExito(nombre);

  } catch (error) {
    console.error(error);
    mostrarErrorRegistro("Error de conexión con el servidor");
  }
}

/* ── UI ── */

function mostrarErrorRegistro(msg) {
  const e = document.getElementById('reg-error');
  if (!e) return;
  e.textContent = msg;
  e.style.display = 'block';
}

function mostrarExito(nombre) {
  document.getElementById('registro-form').style.display = 'none';
  document.querySelector('.registro-header').style.display = 'none';

  document.getElementById('registro-exito').style.display = 'block';
  document.getElementById('exito-nombre').textContent = nombre;

  showToast(`Cuenta creada correctamente`, 'ok');
}

function irALoginDesdeExito() {
  const user = (document.getElementById('reg-user')?.value || '').trim().toLowerCase();
  if (user) sessionStorage.setItem('prefill_user', user);
  window.location.href = 'login.html';
}