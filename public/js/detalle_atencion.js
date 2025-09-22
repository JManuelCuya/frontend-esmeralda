const API_BASE_URL = "http://localhost:3001/api"; 

document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
 console.log("LISTANDO")

  if (!id) return alert("ID no especificado");

  try {
    const res = await fetch(`${API_BASE_URL}/detalle_atencion?id=${id}`, {
      credentials: "include",
      
    });

    if (!res.ok) throw new Error("Error al obtener datos");

    const atencion = await res.json();

    document.getElementById("empleado").value = atencion.empleado;
    document.getElementById("centro_costo").value = atencion.centro_costo;
    document.getElementById("tipo_atencion").value = atencion.tipo_atencion;
    document.getElementById("fecha_atencion").value = atencion.fecha_atencion;
    document.getElementById("fecha_atencion_fin").value = atencion.fecha_atencion_fin;
    document.getElementById("hora_inicio").value = atencion.hora_inicio;
    document.getElementById("hora_fin").value = atencion.hora_fin;
    document.getElementById("motivo").value = atencion.motivo;
    document.getElementById("observacion").value = atencion.observacion;
    document.getElementById("costo_estimado").value = atencion.costo_estimado;
    document.getElementById("estado").value = atencion.estado;
    document.getElementById("fecha_registro").value = atencion.fecha_registro
      ? new Date(atencion.fecha_registro).toISOString().slice(0, 16)
      : "";
  } catch (error) {
    console.error(error);
    alert("No se pudo cargar el detalle");
  }
});
