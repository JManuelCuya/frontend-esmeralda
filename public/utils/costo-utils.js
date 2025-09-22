// utils/costo-utils.js

/**
 * Calcula el tiempo promedio en formato HH:MM:SS
 */
export function calcularTiempoPromedio(horaInicio, horaFin) {
  if (!horaInicio || !horaFin) return "00:00:00";

  const inicio = new Date(`1970-01-01T${horaInicio}`);
  const fin = new Date(`1970-01-01T${horaFin}`);
  const diffMs = fin - inicio;

  if (diffMs < 0) return "00:00:00";

  const horas = String(Math.floor(diffMs / 3600000)).padStart(2, "0");
  const minutos = String(Math.floor((diffMs % 3600000) / 60000)).padStart(2, "0");
  const segundos = String(Math.floor((diffMs % 60000) / 1000)).padStart(2, "0");

  return `${horas}:${minutos}:${segundos}`;
}

/**
 * Envía los datos al modelo de predicción y devuelve el costo estimado
 */
export async function predecirCosto({ seccion, sub_categoria, tipo_solicitud, proceso, tiempo_promedio }) {
  try {
    const response = await fetch("http://localhost:8000/predecir", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seccion, sub_categoria, tipo_solicitud, proceso, tiempo_promedio }),
    });

    const data = await response.json();
    console.log("🔁 Predicción recibida:", data);
    return data.costo_estimado || 0;
  } catch (error) {
    console.error("❌ Error al predecir costo:", error);
    return 0;
  }
}
