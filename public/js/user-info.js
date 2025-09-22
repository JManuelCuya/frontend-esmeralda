document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");

  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      
      // Mostrar rol y nombre/usuario en topbar
      const spanUsuario = document.querySelector(".dropdown-toggle span");
      if (spanUsuario) {
        spanUsuario.textContent = `${payload.rol} - ${payload.username}`;
      }

      // Puedes exponer el payload globalmente si lo necesitas
      window.usuarioActual = payload;
    } catch (err) {
      console.error("Error al decodificar el token:", err);
    }
  } else {
    console.warn("No hay token en localStorage");
  }
});
