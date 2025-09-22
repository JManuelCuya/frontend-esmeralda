const path = require("path");

const mostrarLogin = (req, res) => {
    res.render("login", { error: null, token: null });
  };

const procesarLogin = async (req, res) => {
  const { usuario, password } = req.body;

  try {
    const axios = require("axios");
    const response = await axios.post("http://localhost:3001/auth/login", {
      usuario,
      password,
    });

    const token = response.data.token;

    // 👉 Envía token como cookie HTTP (segura para vistas EJS)
    res.cookie("token", token, {
      httpOnly: true,
      path: "/",
    });

    // 👉 Redirige al panel en vez de mostrar login
    return res.redirect("/panel");

  } catch (err) {
    res.render("login", {
      token: null,
      error: err.response?.data?.message || "Error al conectar con backend",
    });
  }
};


module.exports = {
  mostrarLogin,
  procesarLogin,
};
