
const mostrarPanel = (req, res) => {
  const { username, rol } = req.user;
  res.render("panel", { username, rol });
};
module.exports = {
  mostrarPanel,
};
