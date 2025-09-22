const express = require("express");
const router = express.Router();
const {mostrarPanel} = require("../controllers/panel.controller");
const {verificarTokenYRender} = require("../middleware/validartoken");


module.exports = router;

router.get('/listado', (req, res) => res.render('listado'));
router.get('/solicitud', (req, res) => res.render('solicitud'));
router.get('/consulta', (req, res) => res.render('consulta'));
router.get('/cotizacion', (req, res) => res.render('cotizacion'));
router.get('/atenciones_cotizadas', (req, res) => res.render('atenciones_cotizadas'));
router.get('/listado_atenciones', (req, res) => res.render('listado_atenciones'));
router.get('/detalle_atencion', (req, res) => res.render('detalle_atencion'));
router.get('/estado_atenciones', (req, res) => res.render('estado_atenciones'));
router.get("/panel", verificarTokenYRender, mostrarPanel);

module.exports = router;

