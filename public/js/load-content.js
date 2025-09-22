const socket = io("http://localhost:3001", { withCredentials: true });
const API_BASE_URL = "http://localhost:3001/api";

let usuarioAutenticado = null;

// ✅ Obtener usuario autenticado desde cookie (backend)
async function obtenerUsuario() {
  try {
    const res = await fetch("http://localhost:3001/auth/usuario", {
      credentials: "include",
    });
    if (res.ok) {
      usuarioAutenticado = await res.json(); // { id, nombre, rol, ... }
      console.log("👤 Usuario autenticado:", usuarioAutenticado);
    }
  } catch (error) {
    console.error("❌ Error al obtener usuario:", error);
  }
}

document.addEventListener("DOMContentLoaded", async function () {
  const links = document.querySelectorAll(".nav-link[data-page]");
  const content = document.querySelector(".content");

  await obtenerUsuario();
  if (!usuarioAutenticado) return;

  await cargarNotificacionesGuardadas();
  // ✅ Conexión al WebSocket
  const socket = io("http://localhost:3001", { withCredentials: true });

  socket.on("connect", () => {
    console.log("✅ Conectado al WebSocket:", socket.id);
  });

  socket.on("estadoActualizado", async ({ id_empleado, id_estado, id_atencion, estado }) => {
    console.log("🔁 Socket recibido", { id_empleado, id_estado, id_atencion, estado });

    if (usuarioAutenticado?.empleado_id !== id_empleado) {
      console.log("❌ No soy el dueño, no mostraré notificación.");
      return;
    }

    console.log("✅ Soy el dueño, mostrando notificación");

    // 🔔 Mostrar toast
    mostrarToast(`Tu atención #${id_atencion} ha sido actualizada a "${estado}"`);

    // 📦 Insertar notificación en el DOM
    const notiLista = document.getElementById("notiLista");
    if (notiLista) {
      const notificationItem = document.createElement("li");
      notificationItem.classList.add("dropdown-item");
      notificationItem.innerHTML = `
      <i class="fas fa-info-circle"></i> Tu atención #${id_atencion} ha sido actualizada a "${estado}"
    `;
      notiLista.prepend(notificationItem); // prepend para ponerla arriba
    }

    // 📬 Actualizar contador desde el backend
    try {
      const res = await fetch(`${API_BASE_URL}/notificaciones`, {
        credentials: "include"
      });

      if (res.ok) {
        const notificaciones = await res.json();
        const badge = document.getElementById("notiBadge");
        const notiIcon = document.getElementById("iconoNotificaciones");

        if (badge && notiIcon) {
          const cantidad = notificaciones.length;
          badge.textContent = cantidad;
          badge.style.display = cantidad > 0 ? "inline" : "none";
          notiIcon.dataset.count = cantidad;
          notiIcon.classList.add("notify");
        }
      }
    } catch (err) {
      console.error("❌ Error al actualizar contador de notificaciones:", err);
    }

    // 📤 Emitir evento interno para actualizar visualmente la atención
    const evento = new CustomEvent("estado-atencion-actualizado", {
      detail: { id: id_atencion, id_estado },
    });
    window.dispatchEvent(evento);
  });





  links.forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      const url = this.getAttribute("data-page");

      fetch(url)
        .then((res) => res.text())
        .then((html) => {
          content.innerHTML = html;

          // Marcar menú activo
          links.forEach((l) => l.classList.remove("active"));
          this.classList.add("active");

          // Cargar JS según la página
          if (url.includes("solicitud")) {
            import("/js/atencion.js")
              .then((module) => {
                if (typeof module.cargarCombos === "function")
                  module.cargarCombos();
                if (typeof module.registrarAtencion === "function")
                  module.registrarAtencion();
              })
              .catch((err) => console.error("Error al cargar atencion.js:", err));
          } else if (url.includes("listado")) {
            import("/js/listado_atenciones.js")
              .then((module) => {
                module.listarAtenciones();
              })
              .catch((err) => console.error("Error al cargar estado_atenciones.js:", err));
          /*} else if (url.includes("estado_atenciones")) {
            import("/js/estado_atenciones.js")
              .then((module) => {
                module.loadRowsFromAPI();
              })
              .catch((err) => console.error("Error al cargar listado_atenciones.js:", err));

          }*/ } else if (url.includes("estado_atenciones")) {
            import("/js/estado_atenciones.js")
              .then((module) => {
                // 👇 Este sí registra los handlers y luego trae la data
                module.initReporteTicketsCerrados();
              })
              .catch((err) => console.error("Error al cargar estado_atenciones.js:", err));
          } else if (url.includes("cotizacion")) {
            import("/js/cotizacion.js")
              .then((module) => {
                if (typeof module.cargarCombosCotizacion === "function")
                  module.cargarCombosCotizacion();
              })
              .catch((err) => console.error("Error al cargar cotizacion.js:", err));
          }
        })
        .catch((err) => {
          content.innerHTML = "<p>Error al cargar contenido</p>";
          console.error("Error al cargar vista:", err);
        });
    });
  });
});

document.getElementById("iconoNotificaciones").addEventListener("click", async () => {
  await fetch(`${API_BASE_URL}/notificaciones/leidas`, {
    method: "PATCH",
    credentials: "include",
  });

  const badge = document.getElementById("notiBadge");
  if (badge) {
    badge.innerText = "0";
    badge.style.display = "none";
  }
});

// ✅ Función opcional para mostrar notificación tipo toast (si usas Bootstrap)
function mostrarToast(mensaje) {
  const toastContainer = document.getElementById("toast-container");
  if (!toastContainer) return;

  const toast = document.createElement("div");
  toast.className = "toast align-items-center text-bg-primary border-0 show";
  toast.role = "alert";
  toast.ariaLive = "assertive";
  toast.ariaAtomic = "true";
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${mensaje}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>
  `;
  toastContainer.appendChild(toast);

  setTimeout(() => toast.remove(), 4000); // Ocultar luego de 4 segundos
}

async function cargarNotificacionesGuardadas() {
  try {
    const res = await fetch(`${API_BASE_URL}/notificaciones`, {
      credentials: "include"
    });
    if (res.ok) {
      const notificaciones = await res.json();

      const notiLista = document.getElementById("notiLista");
      const badge = document.getElementById("notiBadge");

      if (notificaciones.length > 0) {
        badge.textContent = notificaciones.length;
        badge.style.display = "inline";
        notiLista.innerHTML = ""; // Limpiar antes de cargar

        notificaciones.forEach((n) => {
          const li = document.createElement("li");
          li.classList.add("dropdown-item");
          li.innerHTML = `<i class="fas fa-info-circle"></i> ${n.mensaje}`;
          notiLista.appendChild(li);
        });
      }
    }
  } catch (error) {
    console.error("❌ Error al cargar notificaciones guardadas:", error);
  }
}
