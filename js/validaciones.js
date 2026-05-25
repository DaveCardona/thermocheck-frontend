// ─────────────────────────────────────────────────────────────────────────────
// validaciones_registro.js — ThermoCheck
// Incluir en registro.html ANTES de registro.js:
//   <script src="js/validaciones_registro.js"></script>
// Incluir en admin.html ANTES de admin.js:
//   <script src="js/validaciones_registro.js"></script>
// ─────────────────────────────────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════
// 1. RESTRICCIONES EN TIEMPO REAL (bloquean teclas no permitidas)
// ═══════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {

  // ── Nombre y Apellido: solo letras y espacios (sin números ni caracteres especiales) ──
  ['reg-nombre', 'reg-apellido'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;

    // Bloquea teclas no permitidas en tiempo real
    el.addEventListener('keypress', e => {
      const char = String.fromCharCode(e.which);
      // Permite letras (incluye acentos y ñ), espacios y apóstrofes
      if (!/[a-zA-ZáéíóúÁÉÍÓÚàèìòùÀÈÌÒÙñÑüÜ\s']/.test(char)) {
        e.preventDefault();
        mostrarErrorCampo(el, 'Solo se permiten letras');
      } else {
        limpiarErrorCampo(el);
      }
    });

    // Limpia pegado con texto no válido
    el.addEventListener('paste', e => {
      e.preventDefault();
      const texto = (e.clipboardData || window.clipboardData).getData('text');
      const limpio = texto.replace(/[^a-zA-ZáéíóúÁÉÍÓÚàèìòùÀÈÌÒÙñÑüÜ\s']/g, '');
      document.execCommand('insertText', false, limpio);
    });

    // Validación al salir del campo
    el.addEventListener('blur', () => validarSoloLetras(el));
  });

  // ── Número de documento: solo números ──
  const numDoc = document.getElementById('reg-num-doc');
  if (numDoc) {
    numDoc.addEventListener('keypress', e => {
      if (!/[0-9]/.test(String.fromCharCode(e.which))) {
        e.preventDefault();
        mostrarErrorCampo(numDoc, 'Solo se permiten números');
      } else {
        limpiarErrorCampo(numDoc);
      }
    });

    numDoc.addEventListener('paste', e => {
      e.preventDefault();
      const texto = (e.clipboardData || window.clipboardData).getData('text');
      const limpio = texto.replace(/\D/g, '');
      document.execCommand('insertText', false, limpio);
    });

    numDoc.addEventListener('blur', () => validarSoloNumeros(numDoc, 5, 12));
  }

  // ── Celular: solo números, máximo 10 dígitos ──
  // Nota: en Colombia los celulares tienen exactamente 10 dígitos (ej: 3001234567)
  const celular = document.getElementById('reg-celular');
  if (celular) {
    celular.setAttribute('maxlength', '10');

    celular.addEventListener('keypress', e => {
      const char = String.fromCharCode(e.which);
      if (!/[0-9]/.test(char)) {
        e.preventDefault();
        mostrarErrorCampo(celular, 'Solo se permiten números');
        return;
      }
      // Bloquea si ya tiene 10 dígitos
      if (celular.value.length >= 10) {
        e.preventDefault();
        mostrarErrorCampo(celular, 'El celular debe tener máximo 10 dígitos');
      } else {
        limpiarErrorCampo(celular);
      }
    });

    celular.addEventListener('paste', e => {
      e.preventDefault();
      const texto = (e.clipboardData || window.clipboardData).getData('text');
      const limpio = texto.replace(/\D/g, '').slice(0, 10);
      document.execCommand('insertText', false, limpio);
    });

    celular.addEventListener('blur', () => validarCelular(celular));
  }

  // ── Dirección: letras, números, espacios, # y guión ──
  const direccion = document.getElementById('reg-direccion');
  if (direccion) {
    direccion.addEventListener('keypress', e => {
      const char = String.fromCharCode(e.which);
      // Permite letras, números, espacio, #, guión y punto
      if (!/[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s#\-\.]/.test(char)) {
        e.preventDefault();
        mostrarErrorCampo(direccion, 'Solo letras, números, #, guión y punto');
      } else {
        limpiarErrorCampo(direccion);
      }
    });

    direccion.addEventListener('paste', e => {
      e.preventDefault();
      const texto = (e.clipboardData || window.clipboardData).getData('text');
      const limpio = texto.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s#\-\.]/g, '');
      document.execCommand('insertText', false, limpio);
    });

    direccion.addEventListener('blur', () => validarDireccion(direccion));
  }

  // ── Username: solo letras, números y punto ──
  const username = document.getElementById('reg-user');
  if (username) {
    username.addEventListener('keypress', e => {
      const char = String.fromCharCode(e.which);
      if (!/[a-zA-Z0-9\._]/.test(char)) {
        e.preventDefault();
        mostrarErrorCampo(username, 'Solo letras, números, punto y guión bajo');
      } else {
        limpiarErrorCampo(username);
      }
    });

    // No permite pegar caracteres inválidos
    username.addEventListener('paste', e => {
      e.preventDefault();
      const texto = (e.clipboardData || window.clipboardData).getData('text');
      const limpio = texto.replace(/[^a-zA-Z0-9\._]/g, '').toLowerCase();
      document.execCommand('insertText', false, limpio);
    });

    // Convierte a minúsculas mientras escribe
    username.addEventListener('input', () => {
      const pos = username.selectionStart;
      username.value = username.value.toLowerCase();
      username.setSelectionRange(pos, pos);
    });

    username.addEventListener('blur', () => validarUsername(username));
  }

  // ── Contraseña: indicador de fortaleza ──
  const pass = document.getElementById('reg-pass');
  if (pass) {
    pass.addEventListener('input', () => {
      actualizarFortaleza(pass.value);
      // Si ya hay confirmación escrita, re-validar coincidencia
      const pass2 = document.getElementById('reg-pass2');
      if (pass2 && pass2.value.length > 0) validarConfirmacion();
    });
    pass.addEventListener('blur', () => validarPassword(pass));
  }

  // ── Confirmación de contraseña ──
  const pass2 = document.getElementById('reg-pass2');
  if (pass2) {
    pass2.addEventListener('blur', validarConfirmacion);
    pass2.addEventListener('input', validarConfirmacion);
  }

});


// ═══════════════════════════════════════════════════════════════
// 2. FUNCIONES DE VALIDACIÓN INDIVIDUALES
// ═══════════════════════════════════════════════════════════════

function validarSoloLetras(el) {
  const val = el.value.trim();
  if (val.length === 0) {
    mostrarErrorCampo(el, 'Este campo es obligatorio');
    return false;
  }
  if (!/^[a-zA-ZáéíóúÁÉÍÓÚàèìòùÀÈÌÒÙñÑüÜ\s']+$/.test(val)) {
    mostrarErrorCampo(el, 'Solo se permiten letras');
    return false;
  }
  if (val.length < 2) {
    mostrarErrorCampo(el, 'Mínimo 2 caracteres');
    return false;
  }
  limpiarErrorCampo(el);
  return true;
}

function validarSoloNumeros(el, min = 5, max = 12) {
  const val = el.value.trim();
  if (val.length === 0) {
    mostrarErrorCampo(el, 'Este campo es obligatorio');
    return false;
  }
  if (!/^\d+$/.test(val)) {
    mostrarErrorCampo(el, 'Solo se permiten números');
    return false;
  }
  if (val.length < min) {
    mostrarErrorCampo(el, `Mínimo ${min} dígitos`);
    return false;
  }
  if (val.length > max) {
    mostrarErrorCampo(el, `Máximo ${max} dígitos`);
    return false;
  }
  limpiarErrorCampo(el);
  return true;
}

function validarCelular(el) {
  const val = el.value.trim();
  if (val.length === 0) {
    mostrarErrorCampo(el, 'El celular es obligatorio');
    return false;
  }
  if (!/^\d+$/.test(val)) {
    mostrarErrorCampo(el, 'Solo se permiten números');
    return false;
  }
  if (val.length !== 10) {
    mostrarErrorCampo(el, `El celular debe tener exactamente 10 dígitos (tiene ${val.length})`);
    return false;
  }
  // En Colombia los celulares empiezan por 3
  if (!val.startsWith('3')) {
    mostrarErrorCampo(el, 'Los celulares colombianos empiezan por 3');
    return false;
  }
  limpiarErrorCampo(el);
  return true;
}

function validarDireccion(el) {
  const val = el.value.trim();
  if (val.length === 0) {
    mostrarErrorCampo(el, 'La dirección es obligatoria');
    return false;
  }
  if (!/^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s#\-\.]+$/.test(val)) {
    mostrarErrorCampo(el, 'Solo letras, números, #, guión y punto');
    return false;
  }
  if (val.length < 5) {
    mostrarErrorCampo(el, 'Dirección demasiado corta');
    return false;
  }
  limpiarErrorCampo(el);
  return true;
}

function validarUsername(el) {
  const val = el.value.trim();
  if (val.length === 0) {
    mostrarErrorCampo(el, 'El nombre de usuario es obligatorio');
    return false;
  }
  if (!/^[a-zA-Z0-9\._]+$/.test(val)) {
    mostrarErrorCampo(el, 'Solo letras, números, punto y guión bajo');
    return false;
  }
  if (val.length < 3) {
    mostrarErrorCampo(el, 'Mínimo 3 caracteres');
    return false;
  }
  if (val.length > 20) {
    mostrarErrorCampo(el, 'Máximo 20 caracteres');
    return false;
  }
  // No puede empezar ni terminar con punto
  if (val.startsWith('.') || val.endsWith('.')) {
    mostrarErrorCampo(el, 'No puede empezar ni terminar con punto');
    return false;
  }
  limpiarErrorCampo(el);
  return true;
}

function validarPassword(el) {
  const val = el.value;
  if (val.length === 0) {
    mostrarErrorCampo(el, 'La contraseña es obligatoria');
    return false;
  }
  if (val.length < 6) {
    mostrarErrorCampo(el, 'Mínimo 6 caracteres');
    return false;
  }
  limpiarErrorCampo(el);
  return true;
}

function validarConfirmacion() {
  const pass  = document.getElementById('reg-pass');
  const pass2 = document.getElementById('reg-pass2');
  if (!pass || !pass2) return true;
  if (pass2.value.length === 0) return true;
  if (pass.value !== pass2.value) {
    mostrarErrorCampo(pass2, 'Las contraseñas no coinciden');
    return false;
  }
  limpiarErrorCampo(pass2);
  return true;
}


// ═══════════════════════════════════════════════════════════════
// 3. INDICADOR DE FORTALEZA DE CONTRASEÑA
// ═══════════════════════════════════════════════════════════════

function actualizarFortaleza(pass) {
  const bar1  = document.getElementById('bar1');
  const bar2  = document.getElementById('bar2');
  const bar3  = document.getElementById('bar3');
  const label = document.getElementById('strength-label');
  if (!bar1) return;

  let score = 0;
  if (pass.length >= 6)                          score++; // longitud mínima
  if (pass.length >= 10)                         score++; // longitud buena
  if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++; // mezcla de mayúsculas
  if (/[0-9]/.test(pass))                        score++; // contiene número
  if (/[^a-zA-Z0-9]/.test(pass))                score++; // contiene símbolo

  // Normaliza a 3 niveles: débil / media / fuerte
  const nivel = score <= 1 ? 1 : score <= 3 ? 2 : 3;

  const colores = { 1: '#C0392B', 2: '#D68910', 3: '#1A6B4A' };
  const textos  = { 1: 'Débil', 2: 'Media', 3: 'Fuerte' };

  [bar1, bar2, bar3].forEach((b, i) => {
    b.style.background = i < nivel ? colores[nivel] : '#E0DDD8';
  });
  label.textContent  = pass.length === 0 ? '' : textos[nivel];
  label.style.color  = colores[nivel] || C_MUTED;
}


// ═══════════════════════════════════════════════════════════════
// 4. VALIDACIÓN COMPLETA AL ENVIAR EL FORMULARIO
// ═══════════════════════════════════════════════════════════════

/**
 * Llama a esta función al inicio de doRegistro(event) en registro.js:
 *
 *   async function doRegistro(event) {
 *     event.preventDefault();
 *     if (!validarFormularioCompleto()) return;   ← agregar esta línea
 *     // ... resto del código de envío
 *   }
 */
function validarFormularioCompleto() {
  let ok = true;

  // Nombre
  const nombre = document.getElementById('reg-nombre');
  if (nombre && !validarSoloLetras(nombre)) ok = false;

  // Apellido
  const apellido = document.getElementById('reg-apellido');
  if (apellido && !validarSoloLetras(apellido)) ok = false;

  // Tipo documento
  const tipoDoc = document.getElementById('reg-tipo-doc');
  if (tipoDoc && !tipoDoc.value) {
    mostrarErrorCampo(tipoDoc, 'Selecciona el tipo de documento');
    ok = false;
  } else if (tipoDoc) {
    limpiarErrorCampo(tipoDoc);
  }

  // Número documento
  const numDoc = document.getElementById('reg-num-doc');
  if (numDoc && !validarSoloNumeros(numDoc, 5, 12)) ok = false;

  // Celular
  const celular = document.getElementById('reg-celular');
  if (celular && !validarCelular(celular)) ok = false;

  // Dirección
  const direccion = document.getElementById('reg-direccion');
  if (direccion && !validarDireccion(direccion)) ok = false;

  // Empresa
  const empresa = document.getElementById('reg-empresa');
  if (empresa && !empresa.value) {
    mostrarErrorCampo(empresa, 'Selecciona tu empresa');
    ok = false;
  } else if (empresa) {
    limpiarErrorCampo(empresa);
  }

  // Username
  const username = document.getElementById('reg-user');
  if (username && !validarUsername(username)) ok = false;

  // Password
  const pass = document.getElementById('reg-pass');
  if (pass && !validarPassword(pass)) ok = false;

  // Confirmación
  if (!validarConfirmacion()) ok = false;

  // Términos
  const terminos = document.getElementById('reg-terminos');
  if (terminos && !terminos.checked) {
    const regError = document.getElementById('reg-error');
    if (regError) {
      regError.textContent = 'Debes aceptar la política de privacidad para continuar';
      regError.style.display = 'block';
    }
    ok = false;
  } else if (terminos && terminos.checked) {
    const regError = document.getElementById('reg-error');
    if (regError) regError.style.display = 'none';
  }

  // Hace scroll al primer error visible
  if (!ok) {
    const primerError = document.querySelector('.field-error-msg');
    if (primerError) {
      primerError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  return ok;
}


// ═══════════════════════════════════════════════════════════════
// 5. HELPERS DE UI: MOSTRAR / LIMPIAR ERRORES
// ═══════════════════════════════════════════════════════════════

function mostrarErrorCampo(el, mensaje) {
  el.classList.add('input-error');

  // Busca o crea el span de error debajo del campo
  let span = el.parentElement.querySelector('.field-error-msg');
  if (!span) {
    span = document.createElement('span');
    span.className = 'field-error-msg';
    el.parentElement.appendChild(span);
  }
  span.textContent = mensaje;
  span.style.display = 'block';
}

function limpiarErrorCampo(el) {
  el.classList.remove('input-error');
  const span = el.parentElement.querySelector('.field-error-msg');
  if (span) {
    span.textContent = '';
    span.style.display = 'none';
  }
}


// ═══════════════════════════════════════════════════════════════
// 6. VALIDACIONES MODAL EDITAR USUARIO (panel admin)
// IDs del modal: u-nombre, u-apellido, u-documento, u-celular,
//                u-direccion  (u-tipo y u-empresa no se validan
//                porque son datalist de solo lectura)
// ═══════════════════════════════════════════════════════════════

/**
 * Engancha los listeners del modal de edición.
 * Llama esta función justo después de poblar los campos del modal,
 * dentro de tu función abrirModalUsuario() en admin.js:
 *
 *   function abrirModalUsuario(usuario) {
 *     // ... poblar campos ...
 *     iniciarValidacionesModalUsuario();   ← agregar esta línea
 *   }
 */
function iniciarValidacionesModalUsuario() {

  // ── Nombre y Apellido ──
  ['u-nombre', 'u-apellido'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;

    // Evita que se enganche dos veces si el modal se reabre
    el.removeEventListener('keypress', el._soloLetrasKP);
    el.removeEventListener('paste',    el._soloLetrasPaste);
    el.removeEventListener('blur',     el._soloLetrasBlur);

    el._soloLetrasKP = e => {
      const char = String.fromCharCode(e.which);
      if (!/[a-zA-ZáéíóúÁÉÍÓÚàèìòùÀÈÌÒÙñÑüÜ\s']/.test(char)) {
        e.preventDefault();
        mostrarErrorCampo(el, 'Solo se permiten letras');
      } else {
        limpiarErrorCampo(el);
      }
    };
    el._soloLetrasPaste = e => {
      e.preventDefault();
      const texto = (e.clipboardData || window.clipboardData).getData('text');
      const limpio = texto.replace(/[^a-zA-ZáéíóúÁÉÍÓÚàèìòùÀÈÌÒÙñÑüÜ\s']/g, '');
      document.execCommand('insertText', false, limpio);
    };
    el._soloLetrasBlur = () => validarSoloLetras(el);

    el.addEventListener('keypress', el._soloLetrasKP);
    el.addEventListener('paste',    el._soloLetrasPaste);
    el.addEventListener('blur',     el._soloLetrasBlur);
  });

  // ── Número de documento ──
  const doc = document.getElementById('u-documento');
  if (doc) {
    doc.removeEventListener('keypress', doc._numKP);
    doc.removeEventListener('paste',    doc._numPaste);
    doc.removeEventListener('blur',     doc._numBlur);

    doc._numKP = e => {
      if (!/[0-9]/.test(String.fromCharCode(e.which))) {
        e.preventDefault();
        mostrarErrorCampo(doc, 'Solo se permiten números');
      } else {
        limpiarErrorCampo(doc);
      }
    };
    doc._numPaste = e => {
      e.preventDefault();
      const limpio = (e.clipboardData || window.clipboardData)
        .getData('text').replace(/\D/g, '');
      document.execCommand('insertText', false, limpio);
    };
    doc._numBlur = () => validarSoloNumeros(doc, 5, 12);

    doc.addEventListener('keypress', doc._numKP);
    doc.addEventListener('paste',    doc._numPaste);
    doc.addEventListener('blur',     doc._numBlur);
  }

  // ── Celular ──
  const cel = document.getElementById('u-celular');
  if (cel) {
    cel.setAttribute('maxlength', '10');

    cel.removeEventListener('keypress', cel._celKP);
    cel.removeEventListener('paste',    cel._celPaste);
    cel.removeEventListener('blur',     cel._celBlur);

    cel._celKP = e => {
      if (!/[0-9]/.test(String.fromCharCode(e.which))) {
        e.preventDefault();
        mostrarErrorCampo(cel, 'Solo se permiten números');
        return;
      }
      if (cel.value.length >= 10) {
        e.preventDefault();
        mostrarErrorCampo(cel, 'Máximo 10 dígitos');
      } else {
        limpiarErrorCampo(cel);
      }
    };
    cel._celPaste = e => {
      e.preventDefault();
      const limpio = (e.clipboardData || window.clipboardData)
        .getData('text').replace(/\D/g, '').slice(0, 10);
      document.execCommand('insertText', false, limpio);
    };
    cel._celBlur = () => validarCelular(cel);

    cel.addEventListener('keypress', cel._celKP);
    cel.addEventListener('paste',    cel._celPaste);
    cel.addEventListener('blur',     cel._celBlur);
  }

  // ── Dirección ──
  const dir = document.getElementById('u-direccion');
  if (dir) {
    dir.removeEventListener('keypress', dir._dirKP);
    dir.removeEventListener('paste',    dir._dirPaste);
    dir.removeEventListener('blur',     dir._dirBlur);

    dir._dirKP = e => {
      const char = String.fromCharCode(e.which);
      if (!/[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s#\-\.]/.test(char)) {
        e.preventDefault();
        mostrarErrorCampo(dir, 'Solo letras, números, #, guión y punto');
      } else {
        limpiarErrorCampo(dir);
      }
    };
    dir._dirPaste = e => {
      e.preventDefault();
      const limpio = (e.clipboardData || window.clipboardData)
        .getData('text').replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s#\-\.]/g, '');
      document.execCommand('insertText', false, limpio);
    };
    dir._dirBlur = () => validarDireccion(dir);

    dir.addEventListener('keypress', dir._dirKP);
    dir.addEventListener('paste',    dir._dirPaste);
    dir.addEventListener('blur',     dir._dirBlur);
  }
}

/**
 * Valida todos los campos del modal antes de guardar.
 * Llama esta función al inicio de confirmarGuardarUsuario() en admin.js:
 *
 *   function confirmarGuardarUsuario() {
 *     if (!validarModalUsuario()) return;   ← agregar esta línea
 *     // ... resto del código de guardado
 *   }
 */
function validarModalUsuario() {
  let ok = true;

  const nombre   = document.getElementById('u-nombre');
  const apellido = document.getElementById('u-apellido');
  const doc      = document.getElementById('u-documento');
  const cel      = document.getElementById('u-celular');
  const dir      = document.getElementById('u-direccion');

  if (nombre   && !validarSoloLetras(nombre))        ok = false;
  if (apellido && !validarSoloLetras(apellido))      ok = false;
  if (doc      && !validarSoloNumeros(doc, 5, 12))   ok = false;
  if (cel      && !validarCelular(cel))              ok = false;
  if (dir      && !validarDireccion(dir))            ok = false;

  // Scroll al primer error dentro del modal
  if (!ok) {
    const modalBody = document.getElementById('modal-usuario');
    const primerError = modalBody
      ? modalBody.querySelector('.field-error-msg')
      : document.querySelector('.field-error-msg');
    if (primerError) {
      primerError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  return ok;
}

