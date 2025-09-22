const API_BASE_URL = "http://localhost:3001/api"; 
import { cargarCombos as cargar } from "../utils/combo-utils.js";

let idAtencionActual = null;
let usuarioAutenticado = null;

// Obtener usuario autenticado desde cookie (requiere endpoint auth/usuario)
const obtenerUsuario = async () => {
  try {
    const res = await fetch(`http://localhost:3001/auth/usuario`, {
      credentials: "include",
    });
    if (res.ok) {
      usuarioAutenticado = await res.json(); // { id, nombre, rol }
    }
  } catch (error) {
    console.error("Error al obtener usuario:", error);
  }
};

export async function listarAtenciones() {
  try {
    const res = await fetch(`${API_BASE_URL}/listar_atenciones`, {
      credentials: "include",
    });

    const data = await res.json();
    const tbody = document.querySelector("#tabla-atenciones tbody");
    tbody.innerHTML = "";
    console.log(data)
    data.forEach((at) => {
      let duracion = calcularDuracion(at.hora_inicio, at.hora_fin);
      let clasePrioridad = "";
      if (at.prioridad === "Alta") clasePrioridad = "bg-danger text-white";
      else if (at.prioridad === "Media") clasePrioridad = "bg-warning text-dark";
      else if (at.prioridad === "Baja") clasePrioridad = "bg-success text-white";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${at.id}</td>
        <td>${at.empleado}</td>
        <td>${at.centro_costo}</td>
        <td>${at.tipo_atencion}</td>
        <td>${at.motivo}</td>
        <td>${at.observacion}</td>
        <td>${at.fecha_atencion}</td>
        <td>${at.fecha_atencion_fin}</td>
        <td>${at.hora_inicio}</td>
        <td>${at.hora_fin}</td>
        <td>${duracion}</td> 
        <td>${at.costo_estimado}</td> 
        <td class="${clasePrioridad}">${at.prioridad}</td>
        <td>
          <button class="btn btn-primary" onclick="mostrarDetalle(${at.id})">
            <i class="fa-solid fa-circle-info"></i>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    console.error("Error al listar atenciones:", error);
  }
}

function calcularDuracion(inicio, fin) {
  if (inicio && fin) {
    const t1 = new Date(`1970-01-01T${inicio}`);
    const t2 = new Date(`1970-01-01T${fin}`);
    const diff = t2 - t1;
    if (diff >= 0) {
      const mins = Math.floor(diff / 60000);
      const segs = Math.floor(diff / 1000);
      return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}:${String(segs % 60).padStart(2, "0")}`;
    }
    return "Inválido";
  }
  return "N/A";
}

function cargarCombos() {
  cargar([
    { id: "estado_atencion", url: `${API_BASE_URL}/combos/estadosAtencion` },
  ]);
}

window.mostrarDetalle = async function (id) {
  idAtencionActual = id;
  try {
    await cargarCombos();
    const res = await fetch(`${API_BASE_URL}/detalle_atencion?id=${id}`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error("Error al cargar detalle");

    const at = await res.json();
    console.log("detalle es ",at)
    document.getElementById("empleado").value = at.empleado;
    document.getElementById("centro_costo").value = at.centro_costo;
    document.getElementById("tipo_atencion").value = at.tipo_atencion;
    document.getElementById("fecha_atencion").value = at.fecha_atencion;
    document.getElementById("fecha_atencion_fin").value = at.fecha_atencion_fin;
    document.getElementById("hora_inicio").value = at.hora_inicio;
    document.getElementById("hora_fin").value = at.hora_fin;
    document.getElementById("motivo").value = at.motivo;
    document.getElementById("observacion").value = at.observacion;
    document.getElementById("fecha_registro").value = new Date(at.fecha_registro).toISOString().slice(0, 16);

 
    await cargarEstadosSeleccionarActual(at.id_estado);
    pintarPasos(at.id_estado);
    const offcanvas = new bootstrap.Offcanvas(document.getElementById("detalleOffcanvas"));
    offcanvas.show(); 
     document.getElementById("fechaActualizacion").innerText = new Date(at.fecha_ultima_actualizacion).toISOString().slice(0, 16);
    console.log("📅 Fecha actualizacion formateada:", at.fecha_ultima_actualizacion);


  } catch (err) {
    console.error("Error al cargar detalle:", err);
    alert("No se pudo cargar el detalle.");
  }
};

async function cargarEstadosSeleccionarActual(idEstado) {
  try {
    const res = await fetch(`${API_BASE_URL}/combos/estadosAtencion`);
    const estados = await res.json();
    const select = document.getElementById("estado_atencion");
    select.innerHTML = "";

    estados.forEach((estado) => {
      const option = document.createElement("option");
      option.value = estado.id;
      option.textContent = estado.descripcion;
      if (estado.id === idEstado) option.selected = true;
      select.appendChild(option);
    });
  } catch (error) {
    console.error("Error al cargar estados:", error);
  }
}

function pintarPasos(idEstado) {
  const pasos = ["1", "2", "3", "4"];
  const idxActual = pasos.indexOf(idEstado.toString());

  document.querySelectorAll(".step-flecha").forEach((el) => {
    const idxPaso = pasos.indexOf(el.dataset.step);
    el.classList.remove("active", "completed");

    if (idxPaso < idxActual) el.classList.add("completed");
    else if (idxPaso === idxActual) el.classList.add("active");
  });
}

const actualizarEstado = async (id_atencion, nuevoEstadoId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/atencion/${id_atencion}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        id_estado: nuevoEstadoId ,
        id_atencion:id_atencion
      })
    });

    const result = await response.json();
    if (!response.ok) {
      alert("⚠️ No se pudo actualizar el estado: " + result.message);
    }
  } catch (error) {
    console.error("❌ Error en la actualización:", error);
  }
};

document.getElementById("btnGuardarEstado").addEventListener("click", async () => {
  const nuevoEstadoId = document.getElementById("estado_atencion").value;
  await actualizarEstado(idAtencionActual, nuevoEstadoId);
  await listarAtenciones();
  pintarPasos(nuevoEstadoId.toString());
  alert("Estado actualizado correctamente.");
});

/////////////////////////////
// WebSocket usando socket.io
/////////////////////////////
import { io } from "https://cdn.socket.io/4.7.2/socket.io.esm.min.js";

(async function conectarSocket() {
  await obtenerUsuario();
  if (!usuarioAutenticado) return;

  const socket = io("http://localhost:3001", {
    withCredentials: true
  });

  socket.on("connect", () => {
    console.log("✅ Conectado al WebSocket:", socket.id);
  });

  socket.on("estadoActualizado", (data) => {
    if (data.id_empleado === usuarioAutenticado.id) {
      mostrarNotificacion("🟢 Estado actualizado", `Tu atención #${data.id_atencion} cambió a "${data.estado}"`);

      if (data.id_atencion === idAtencionActual) {
        document.getElementById("estado_atencion").value = data.id_estado;
        pintarPasos(data.id_estado.toString());
      }
    }
  });

  socket.on("disconnect", () => {
    console.warn("❌ WebSocket desconectado");
  });
})();

function mostrarNotificacion(titulo, mensaje) {
  const badge = document.getElementById("contadorNotificaciones");
  let count = parseInt(badge.innerText) || 0;
  badge.innerText = count + 1;
  badge.style.display = "inline";

  const icono = document.getElementById("iconoNotificacion");
  icono.classList.add("text-danger");
  icono.title = mensaje;
}
