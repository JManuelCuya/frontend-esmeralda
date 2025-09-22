// registro.js
const API_BASE_URL = "http://localhost:3001/api";
import { cargarCombos as cargar } from "../utils/combo-utils.js";
import { predecirCosto, calcularTiempoPromedio } from "../utils/costo-utils.js";

export function cargarCombos() {
  cargar([
    { id: "centro_costos", url: `${API_BASE_URL}/combos/centros-costos` },
    { id: "tipo_atencion", url: `${API_BASE_URL}/combos/tipos-atencion` },
  ]);
}

export function registrarAtencion() {
  const form = document.getElementById("formSolicitud");
  const mensaje = document.getElementById("mensaje");
  if (!form) return;

  const $ = (id) => document.getElementById(id);

  // Ocultar/relajar "Código Único": lo llena el backend
  const idWrapper = $("id_atencion")?.closest(".col-md-4");
  if (idWrapper) idWrapper.style.display = "none";
  if ($("id_atencion")) {
    $("id_atencion").required = false;
    $("id_atencion").readOnly = true;
  }

  const fields = [
    "tipo_atencion",
    "centro_costos",
    "fecha_inicio",
    "fecha_fin",
    "hora_inicio",
    "hora_fin",
    "motivo",
    "descripcion",
  ];

  // === Helpers UI ===
  const setInvalid = (el, text = "Este campo es obligatorio.") => {
    el.classList.add("is-invalid");
    el.classList.remove("is-valid");
    const fb = el.parentElement.querySelector(".invalid-feedback");
    if (fb) fb.textContent = text;
  };
  const setValid = (el) => {
    el.classList.remove("is-invalid");
    el.classList.add("is-valid");
  };
  const clearMsg = () => { mensaje.className = "mt-3"; mensaje.innerHTML = ""; };
  const showError = (t) => { mensaje.className = "mt-3 alert alert-danger"; mensaje.textContent = t; };
  const showInfo  = (h) => { mensaje.className = "mt-3 alert alert-info";  mensaje.innerHTML  = h; };
  const showSuccess = (t) => { mensaje.className = "mt-3 alert alert-success"; mensaje.textContent = t; };

  // === Validaciones base ===
  function validateRequired() {
    let ok = true;
    fields.forEach((id) => {
      const el = $(id); if (!el) return;
      const tag = el.tagName.toLowerCase();
      const val = tag === "select" ? el.value : (el.value || "").trim();
      if (!val) { setInvalid(el, tag === "select" ? "Selecciona una opción." : "Este campo es obligatorio."); ok = false; }
      else setValid(el);
    });
    return ok;
  }

  // Regla fechas/horas:
  // - fecha_fin >= fecha_inicio
  // - si mismo día: hora_fin > hora_inicio
  // - si día distinto: se permite hora_fin < hora_inicio
  // - duración mínima 60 min
  (function syncMinFechaFin(){
    const fi = $("fecha_inicio"), ff = $("fecha_fin");
    if (fi && ff) {
      const updateMin = () => { ff.min = fi.value || ""; };
      fi.addEventListener("change", updateMin); updateMin();
    }
  })();

  function validateDateTimeLogic() {
    const fIni = $("fecha_inicio").value;
    const fFin = $("fecha_fin").value;
    const hIni = $("hora_inicio").value;
    const hFin = $("hora_fin").value;
    if (!fIni || !fFin || !hIni || !hFin) return false;

    if (fFin < fIni) {
      setInvalid($("fecha_fin"), "La fecha fin no puede ser menor que la fecha inicio.");
      return false;
    }

    const start = new Date(`${fIni}T${hIni}`);
    const end   = new Date(`${fFin}T${hFin}`);
    if (Number.isNaN(start.getTime())) { setInvalid($("fecha_inicio"), "Fecha/hora inicio inválida."); return false; }
    if (Number.isNaN(end.getTime()))   { setInvalid($("fecha_fin"), "Fecha/hora fin inválida.");     return false; }

    const sameDay = fIni === fFin;
    if (sameDay && hFin <= hIni) {
      setInvalid($("hora_fin"), "En el mismo día, la hora fin debe ser mayor que la hora inicio.");
      setInvalid($("fecha_fin"));
      return false;
    }

    const minutes = Math.round((end - start) / 60000);
    if (minutes < 60) {
      setInvalid($("hora_fin"), `La duración mínima es 1 hora (actual: ${minutes} min).`);
      setInvalid($("fecha_fin"));
      return false;
    }

    setValid($("fecha_fin")); setValid($("hora_fin"));
    return true;
  }

  // === Flujo progresivo (habilitar paso a paso) ===
  const submitBtn = form.querySelector('button[type="submit"]');

  // Orden del flujo:
  const flow = [
    "tipo_atencion",
    "centro_costos",
    "fecha_inicio",
    "fecha_fin",
    "hora_inicio",
    "hora_fin",
    "motivo",
    "descripcion",
  ];

  function setEnabled(id, enabled) {
    const el = $(id); if (!el) return;
    el.disabled = !enabled;
    // opcional: atenuar visualmente
    const wrapper = el.closest(".col-md-3, .col-md-4, .col-md-6, .col-12");
    if (wrapper) wrapper.style.opacity = enabled ? "1" : "0.6";
  }

  function valueOk(id) {
    const el = $(id); if (!el) return false;
    const tag = el.tagName.toLowerCase();
    const v = tag === "select" ? el.value : (el.value || "").trim();
    return Boolean(v);
  }

  // Deshabilitar todo excepto el primer campo
  function resetFlow(fromIndex = 0) {
    flow.forEach((id, i) => {
      if (i <= fromIndex) setEnabled(id, true);
      else {
        const el = $(id);
        setEnabled(id, false);
        if (el) el.value = ""; // limpia
      }
    });
    if (submitBtn) submitBtn.disabled = true;
  }

  // Inicial: solo 'tipo_atencion' activo
  resetFlow(0);

  // Al cambiar cada campo, habilita el siguiente si tiene valor;
  // si queda vacío, deshabilita los siguientes.
  flow.forEach((id, idx) => {
    const el = $(id); if (!el) return;
    const ev = el.tagName.toLowerCase() === "select" ? "change" : "input";
    el.addEventListener(ev, () => {
      clearMsg();
      // Si el actual se vacía, cortar flujo desde aquí
      if (!valueOk(id)) {
        resetFlow(idx);
        return;
      }
      // Habilitar siguiente
      const nextId = flow[idx + 1];
      if (nextId) setEnabled(nextId, true);

      // Si ya completó todos, habilitar submit cuando validaciones pasen
      const allFilled = flow.every(valueOk);
      if (submitBtn) {
        if (allFilled && validateRequired() && validateDateTimeLogic()) {
          submitBtn.disabled = false;
        } else {
          submitBtn.disabled = true;
        }
      }
    });
  });

  // También volver a evaluar al cambiar cualquier cosa (por si llegan combos async)
  setTimeout(() => {
    // si ya hay valores precargados, avanza el flujo automáticamente
    let lastIndexWithValue = 0;
    flow.forEach((id, i) => { if (valueOk(id)) lastIndexWithValue = i; });
    resetFlow(lastIndexWithValue);
    if (valueOk(flow[lastIndexWithValue])) {
      const next = flow[lastIndexWithValue + 1];
      if (next) setEnabled(next, true);
    }
  }, 0);

  // === Envío ===
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearMsg();

    const okRequired = validateRequired();
    const okLogic = okRequired && validateDateTimeLogic();
    if (!okRequired || !okLogic) {
      showError("Por favor corrige los campos marcados en rojo.");
      const firstInvalid = form.querySelector(".is-invalid");
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    const tipoAtencion = $("tipo_atencion").value;
    const centroCostos = $("centro_costos").value;
    const motivo = $("motivo").value.trim();
    const descripcion = $("descripcion").value.trim();
    const fechaInicio = $("fecha_inicio").value;
    const fechaFin = $("fecha_fin").value;
    const horaInicio = $("hora_inicio").value;
    const horaFin = $("hora_fin").value;

    const seccion = "CIBERSEGURIDAD";
    const sub_categoria = "FIREWALL";
    const tipo_solicitud = tipoAtencion;
    const proceso = descripcion;
    const tiempo_promedio = calcularTiempoPromedio(horaInicio, horaFin);

    const oldText = submitBtn ? submitBtn.innerHTML : "";
    if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Enviando...'; }

    try {
      const costoEstimado = await predecirCosto({ seccion, sub_categoria, tipo_solicitud, proceso, tiempo_promedio });
      
      showInfo(`Costo estimado: <strong>S/ ${costoEstimado.toFixed(2)}</strong>`);

      const res = await fetch(`${API_BASE_URL}/atenciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          tipo_atencion_id: tipoAtencion,
          centro_costos_id: centroCostos,
          motivo,
          observacion: descripcion,
          fecha_atencion: fechaInicio,
          fecha_atencion_fin: fechaFin,
          hora_inicio: horaInicio,
          hora_fin: horaFin,
          costo_estimado: costoEstimado,
          
        }),
      });

      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result?.message || "Error al registrar atención.");

      showSuccess("✅ Solicitud registrada con éxito.");
      if (result?.id && $("id_atencion")) $("id_atencion").value = result.id;

      // Reiniciar flujo (si quieres limpiar, descomenta)
      // form.reset();
      // resetFlow(0);

    } catch (err) {
      console.error(err);
      showError(`❌ ${err.message || "Error al registrar atención"}`);
    } finally {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = oldText; }
    }
  });
}
