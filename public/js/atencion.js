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

  // Helpers UI
  const setInvalid = (el, text = "Este campo es obligatorio.") => {
    el.classList.add("is-invalid");
    el.classList.remove("is-valid");
    const fb = el.parentElement.querySelector(".invalid-feedback");
    if (fb) fb.textContent = text;
  };
  const setValid = (el) => { el.classList.remove("is-invalid"); el.classList.add("is-valid"); };
  const clearMsg    = () => { mensaje.className = "mt-3"; mensaje.innerHTML = ""; };
  const showError   = (t) => { mensaje.className = "mt-3 alert alert-danger"; mensaje.textContent = t; };
  const showInfo    = (h) => { mensaje.className = "mt-3 alert alert-info";  mensaje.innerHTML  = h; };
  const showSuccess = (t) => { mensaje.className = "mt-3 alert alert-success"; mensaje.textContent = t; };

  // Campos obligatorios (sin FIN)
  const fields = ["tipo_atencion","centro_costos","fecha_inicio","hora_inicio","motivo","descripcion"];

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

  // Min fecha_fin = fecha_inicio (si el usuario la completa manualmente)
  (function syncMinFechaFin(){
    const fi = $("fecha_inicio"), ff = $("fecha_fin");
    if (fi && ff) {
      const updateMin = () => { ff.min = fi.value || ""; };
      fi.addEventListener("change", updateMin); updateMin();
    }
  })();

  // Si hay fin, validamos coherencia. Si no hay fin, no bloqueamos envío.
  function validateDateTimeLogic() {
    const fIni = $("fecha_inicio").value;
    const fFin = $("fecha_fin").value;
    const hIni = $("hora_inicio").value;
    const hFin = $("hora_fin").value;

    if (!fIni || !hIni) return false;
    if (!fFin || !hFin) return true; // apertura: OK

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

  // === Flujo progresivo (sin FIN obligatorio) ===
  const submitBtn = form.querySelector('button[type="submit"]');
  const flow = ["tipo_atencion","centro_costos","fecha_inicio","hora_inicio","motivo","descripcion"];

  function setEnabled(id, enabled) {
    const el = $(id); if (!el) return;
    el.disabled = !enabled;
    const wrapper = el.closest(".col-md-3, .col-md-4, .col-md-6, .col-12");
    if (wrapper) wrapper.style.opacity = enabled ? "1" : "0.6";
  }
  function valueOk(id) {
    const el = $(id); if (!el) return false;
    const tag = el.tagName.toLowerCase();
    const v = tag === "select" ? el.value : (el.value || "").trim();
    return Boolean(v);
  }
  function resetFlow(fromIndex = 0) {
    flow.forEach((id, i) => {
      if (i <= fromIndex) setEnabled(id, true);
      else {
        const el = $(id);
        setEnabled(id, false);
        if (el) el.value = "";
      }
    });
    if (submitBtn) submitBtn.disabled = true;

    // FIN siempre opcional y habilitado
    setEnabled("fecha_fin", true);
    setEnabled("hora_fin",  true);
  }
  resetFlow(0);

  flow.forEach((id, idx) => {
    const el = $(id); if (!el) return;
    const ev = el.tagName.toLowerCase() === "select" ? "change" : "input";
    el.addEventListener(ev, () => {
      clearMsg();
      if (!valueOk(id)) { resetFlow(idx); return; }
      const nextId = flow[idx + 1];
      if (nextId) setEnabled(nextId, true);
      const allFilled = flow.every(valueOk);
      if (submitBtn) submitBtn.disabled = !(allFilled && validateRequired() && validateDateTimeLogic());
    });
  });

  setTimeout(() => {
    let lastIndexWithValue = 0;
    flow.forEach((id, i) => { if (valueOk(id)) lastIndexWithValue = i; });
    resetFlow(lastIndexWithValue);
    if (valueOk(flow[lastIndexWithValue])) {
      const next = flow[lastIndexWithValue + 1];
      if (next) setEnabled(next, true);
    }
  }, 0);

  // === Helper: sumar 1h a "HH:MM" (sin tocar fecha) ===
  function addOneHour(hhmm) {
    // hhmm: "HH:MM"
    const [H, M] = hhmm.split(":").map(Number);
    const d = new Date(2000, 0, 1, H, M, 0);
    d.setHours(d.getHours() + 1);
    // Siempre devolvemos HH:MM del mismo día; si pasa medianoche, queda "00:MM"
    // (lo queremos sólo para payload y predicción, no para inputs visibles)
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }

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
    const motivo       = $("motivo").value.trim();
    const descripcion  = $("descripcion").value.trim();
    const fechaInicio  = $("fecha_inicio").value;
    const horaInicio   = $("hora_inicio").value;
    const fechaFinInp  = $("fecha_fin").value;  // opcional
    const horaFinInp   = $("hora_fin").value;   // opcional

    // Si faltan FIN, fabricamos valores efectivos: fecha_fin = fecha_inicio y hora_fin = hora_inicio + 1h
    const faltaFin = !(fechaFinInp && horaFinInp);
    const fechaFinEff = faltaFin ? fechaInicio : fechaFinInp;
    const horaFinEff  = faltaFin ? addOneHour(horaInicio) : horaFinInp;

    // Datos para el modelo
    const seccion        = "CIBERSEGURIDAD";
    const sub_categoria  = "FIREWALL";
    const tipo_solicitud = tipoAtencion;
    const proceso        = descripcion;

    // Duración efectiva: si fabricamos fin -> 60 min
    const tiempo_promedio = faltaFin ? 60 : calcularTiempoPromedio(horaInicio, horaFinEff);

    const oldText = submitBtn ? submitBtn.innerHTML : "";
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Enviando...';
    }

    try {
      // Siempre predecimos con la duración efectiva (real o fabricada)
      let costoEstimado = null;
      try {
        costoEstimado = await predecirCosto({
          seccion,
          sub_categoria,
          tipo_solicitud,
          proceso,
          tiempo_promedio
        });
        const ce = $("costo_estimado");
        if (ce && costoEstimado != null) ce.value = Number(costoEstimado).toFixed(2);
        showInfo(`Costo estimado: <strong>S/ ${Number(costoEstimado).toFixed(2)}</strong>`);
      } catch (predErr) {
        console.warn("No se pudo predecir el costo:", predErr);
        showInfo("No se pudo estimar el costo ahora. Se registrará sin costo estimado.");
      }

      // Enviar al backend con fin EFECTIVO (real o +1h)
      const res = await fetch(`${API_BASE_URL}/atenciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          tipo_atencion_id: Number(tipoAtencion),
          centro_costos_id: Number(centroCostos),
          motivo,
          observacion: descripcion,
          fecha_atencion: fechaInicio,
          fecha_atencion_fin: fechaFinEff || null,
          hora_inicio: horaInicio,
          hora_fin: horaFinEff || null,
          costo_estimado: (costoEstimado != null ? Number(costoEstimado) : null),
        }),
      });

      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result?.message || "Error al registrar atención.");

      showSuccess("Solicitud registrada con éxito.");
      if (result?.id && $("id_atencion")) $("id_atencion").value = result.id;

      // Opcional:
      // form.reset(); resetFlow(0);

    } catch (err) {
      console.error(err);
      showError(`❌ ${err.message || "Error al registrar atención"}`);
    } finally {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = oldText; }
    }
  });
}
