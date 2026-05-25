/* ════════════════════════════════
   perfil_paciente.js — Edición de perfil del paciente
   Incluir en paciente.html DESPUÉS de paciente.js:
   <script src="js/validaciones_registro.js"></script>
   <script src="js/perfil_paciente.js"></script>
════════════════════════════════ */

/* ── Abrir modal y cargar datos del usuario logueado ── */
async function abrirModalPerfil() {
  try {
    const res  = await fetch(`${CONFIG.API_URL}/admin/usuarios/${currentUser.id_usuario}`);
    const data = await res.json();

    // El backend devuelve el objeto directo (sin data.data ni data.success)
    const u = data.data || data;

    if (!u || !u.id_usuario) {
      showToast('Error cargando perfil', 'error');
      return;
    }

    // Solo carga los campos editables; el resto lo guarda el objeto
    document.getElementById('p-nombre').value    = u.nombre    || '';
    document.getElementById('p-apellido').value  = u.apellido  || '';
    document.getElementById('p-celular').value   = u.celular   || '';
    document.getElementById('p-direccion').value = u.direccion || '';

    // Campos de solo lectura (los muestra pero no los deja editar)
    document.getElementById('p-username').value  = u.username         || '';
    document.getElementById('p-documento').value = u.numero_documento || '';
    document.getElementById('p-tipo-doc').value  = u.tipo_documento   || '';
    document.getElementById('p-empresa').value   = u.empresa          || '';

    // Engancha validaciones sobre los campos editables
    iniciarValidacionesPerfil();

    document.getElementById('modal-perfil').classList.add('active');

  } catch (err) {
    console.error(err);
    showToast('Error de conexión', 'error');
  }
}

function cerrarModalPerfil() {
  document.getElementById('modal-perfil').classList.remove('active');
  ['p-nombre','p-apellido','p-celular','p-direccion'].forEach(id => {
    const el = document.getElementById(id);
    if (el) limpiarErrorCampo(el);
  });
}

/* ── Guardar solo los campos editables ── */
async function guardarPerfil() {
  if (!validarFormularioPerfil()) return;

  try {
    // Primero trae los datos actuales para no perder los campos no editables
    const resActual = await fetch(
      `${CONFIG.API_URL}/admin/usuarios/${currentUser.id_usuario}`
    );
    const dataActual = await resActual.json();
    const u = dataActual.data || dataActual;

    // Mezcla datos actuales con los campos editados
    const body = {
      nombre:            document.getElementById('p-nombre').value.trim(),
      apellido:          document.getElementById('p-apellido').value.trim(),
      celular:           document.getElementById('p-celular').value.trim(),
      direccion:         document.getElementById('p-direccion').value.trim(),
      id_tipo_documento: u.id_tipo_documento || null,
      numero_documento:  u.numero_documento  || '',
      id_empresa:        u.id_empresa        || null,
    };

    const res = await fetch(
      `${CONFIG.API_URL}/admin/usuarios/${currentUser.id_usuario}`,
      {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      }
    );

    const data = await res.json();

    if (!data.success) {
      showToast(data.message || 'Error al guardar', 'error');
      return;
    }

    currentUser.nombre          = body.nombre;
    currentUser.nombre_completo = `${body.nombre} ${body.apellido}`;
    sessionStorage.setItem('currentUser', JSON.stringify(currentUser));

    document.getElementById('pac-nombre').textContent = body.nombre;
    document.getElementById('pac-avatar').textContent =
      obtenerIniciales(currentUser.nombre_completo);

    cerrarModalPerfil();
    showToast('Perfil actualizado', 'ok');

  } catch (err) {
    console.error(err);
    showToast('Error de conexion', 'error');
  }
}

/* ── Validación completa del formulario de perfil ── */
function validarFormularioPerfil() {
  let ok = true;

  const nombre   = document.getElementById('p-nombre');
  const apellido = document.getElementById('p-apellido');
  const celular  = document.getElementById('p-celular');
  const dir      = document.getElementById('p-direccion');

  if (!validarSoloLetras(nombre))   ok = false;
  if (!validarSoloLetras(apellido)) ok = false;
  if (!validarCelular(celular))     ok = false;
  if (!validarDireccion(dir))       ok = false;

  if (!ok) {
    const primerError = document
      .getElementById('modal-perfil')
      .querySelector('.field-error-msg');
    if (primerError) primerError.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return ok;
}

/* ── Listeners en tiempo real ── */
function iniciarValidacionesPerfil() {

  ['p-nombre', 'p-apellido'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;

    el.removeEventListener('keypress', el._kp);
    el.removeEventListener('paste',    el._paste);
    el.removeEventListener('blur',     el._blur);

    el._kp = e => {
      const char = String.fromCharCode(e.which);
      if (!/[a-zA-ZáéíóúÁÉÍÓÚàèìòùÀÈÌÒÙñÑüÜ\s']/.test(char)) {
        e.preventDefault();
        mostrarErrorCampo(el, 'Solo se permiten letras');
      } else { limpiarErrorCampo(el); }
    };
    el._paste = e => {
      e.preventDefault();
      const limpio = (e.clipboardData || window.clipboardData)
        .getData('text')
        .replace(/[^a-zA-ZáéíóúÁÉÍÓÚàèìòùÀÈÌÒÙñÑüÜ\s']/g, '');
      document.execCommand('insertText', false, limpio);
    };
    el._blur = () => validarSoloLetras(el);

    el.addEventListener('keypress', el._kp);
    el.addEventListener('paste',    el._paste);
    el.addEventListener('blur',     el._blur);
  });

  const cel = document.getElementById('p-celular');
  if (cel) {
    cel.setAttribute('maxlength', '10');

    cel.removeEventListener('keypress', cel._kp);
    cel.removeEventListener('paste',    cel._paste);
    cel.removeEventListener('blur',     cel._blur);

    cel._kp = e => {
      if (!/[0-9]/.test(String.fromCharCode(e.which))) {
        e.preventDefault();
        mostrarErrorCampo(cel, 'Solo se permiten números');
        return;
      }
      if (cel.value.length >= 10) {
        e.preventDefault();
        mostrarErrorCampo(cel, 'Máximo 10 dígitos');
      } else { limpiarErrorCampo(cel); }
    };
    cel._paste = e => {
      e.preventDefault();
      const limpio = (e.clipboardData || window.clipboardData)
        .getData('text').replace(/\D/g, '').slice(0, 10);
      document.execCommand('insertText', false, limpio);
    };
    cel._blur = () => validarCelular(cel);

    cel.addEventListener('keypress', cel._kp);
    cel.addEventListener('paste',    cel._paste);
    cel.addEventListener('blur',     cel._blur);
  }

  const dir = document.getElementById('p-direccion');
  if (dir) {
    dir.removeEventListener('keypress', dir._kp);
    dir.removeEventListener('paste',    dir._paste);
    dir.removeEventListener('blur',     dir._blur);

    dir._kp = e => {
      const char = String.fromCharCode(e.which);
      if (!/[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s#\-\.]/.test(char)) {
        e.preventDefault();
        mostrarErrorCampo(dir, 'Solo letras, números, #, guión y punto');
      } else { limpiarErrorCampo(dir); }
    };
    dir._paste = e => {
      e.preventDefault();
      const limpio = (e.clipboardData || window.clipboardData)
        .getData('text')
        .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s#\-\.]/g, '');
      document.execCommand('insertText', false, limpio);
    };
    dir._blur = () => validarDireccion(dir);

    dir.addEventListener('keypress', dir._kp);
    dir.addEventListener('paste',    dir._paste);
    dir.addEventListener('blur',     dir._blur);
  }
}