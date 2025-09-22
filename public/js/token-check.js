window.onload = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Acceso no autorizado. Inicia sesión.");
      window.location.href = "/login";
    }
  };
  
  function cerrarSesion() {
    localStorage.removeItem("token");
    window.location.href = "/login";
  }
  