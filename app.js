const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));


const panelRoutes = require("./routes/panel.routes");
const authRoutes = require("./routes/auth.routes");

// Rutas

app.use("/", authRoutes);
app.use("/", panelRoutes);





const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Frontend corriendo en http://localhost:${PORT}`);
});

app.get("/", (req, res) => {
    res.redirect("/login");
  });
  