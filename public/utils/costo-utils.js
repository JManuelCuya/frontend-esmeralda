// utils/costo-utils.js
const API_ML = "http://localhost:8000/predecir";

/** Diferencia en MINUTOS entre dos horas HH:MM (soporta cruce de medianoche) */
function diffMinutes(hIni, hFin) {
  if (!hIni || !hFin) return null;
  const [hi, mi] = hIni.split(":").map(Number);
  const [hf, mf] = hFin.split(":").map(Number);
  if (
    [hi, mi, hf, mf].some(
      (v) => Number.isNaN(v) || v < 0 || hi > 23 || hf > 23 || mi > 59 || mf > 59
    )
  ) return null;

  const start = hi * 60 + mi;
  const end   = hf * 60 + mf;
  return end >= start ? end - start : 24 * 60 - start + end;
}

/** Suma una hora a HH:MM y devuelve HH:MM (útil para “suponer” hora fin) */
export function oneHourAfter(horaInicio) {
  if (!horaInicio) return null;
  const [h, m] = horaInicio.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const total = (h * 60 + m + 60) % (24 * 60);
  const hh = String(Math.floor(total / 60)).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

/**
 * Calcula el “tiempo promedio” en MINUTOS para el modelo.
 * - Si falta fin o no se puede calcular, devuelve 60 (1h) por defecto.
 * - Si tu HU exige mínimo una hora, deja el Math.max; si no, quítalo.
 */
export function calcularTiempoPromedio(horaInicio, horaFin) {
  const mins = diffMinutes(horaInicio, horaFin);
  if (mins == null) return 60;       // default cuando no hay fin
  return Math.max(mins, 60);         // forzar mínimo 60 si aplica tu HU
  // return mins;                     // ← usa esta línea si NO quieres mínimo 60
}

/**
 * Llama al API de ML. `tiempo_promedio` debe ser NÚMERO (minutos).
 */
export async function predecirCosto({
  seccion,
  sub_categoria,
  tipo_solicitud,
  proceso,
  tiempo_promedio, // número en minutos
}) {
  if (typeof tiempo_promedio !== "number" || Number.isNaN(tiempo_promedio)) {
    throw new Error("tiempo_promedio debe ser un número (minutos).");
  }

  const payload = {
    seccion: String(seccion ?? ""),
    sub_categoria: String(sub_categoria ?? ""),
    tipo_solicitud: String(tipo_solicitud ?? ""),
    proceso: String(proceso ?? ""),
    tiempo_promedio, // número
  };

  const res = await fetch(API_ML, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      Array.isArray(data?.detail) && data.detail[0]?.msg
        ? data.detail[0].msg
        : JSON.stringify(data);
    throw new Error(`ML ${res.status}: ${msg}`);
  }

  const valor = data.costo_estimado ?? data.costo ?? data.prediccion ?? null;
  const num = Number(valor);
  if (valor == null || Number.isNaN(num)) {
    throw new Error("La respuesta del modelo no contiene un número de costo.");
  }
  return num;
}
