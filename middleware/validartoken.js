const jwt = require("jsonwebtoken");

function verificarTokenYRender(req, res, next) {
  const token = req.cookies.token; // <-- LEER cookie

  if (!token) {
    return res.redirect("/login");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "clave-secreta");
    req.user = decoded;
    next();
  } catch (error) {
    return res.redirect("/login");
  }
}

module.exports = {
  verificarTokenYRender,
};
