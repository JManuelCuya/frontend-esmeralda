export async function cargarCombos(endpoints = []) {
  try {

 
    const dataArray = await Promise.all(
      endpoints.map(endpoint =>
        fetch(endpoint.url, {
          credentials: "include",
      
        }).then(res => res.json())
      )
    );

    endpoints.forEach((endpoint, index) => {
      llenarCombo(endpoint.id, dataArray[index]);
    });
  } catch (error) {
    console.error("Error al cargar combos:", error);
  }
}

function llenarCombo(idCombo, data) {
  const combo = document.getElementById(idCombo);
  if (!combo) {
    console.warn(`Combo con id '${idCombo}' no encontrado`);
    return;
  }

  combo.innerHTML = '<option value="">--- Seleccione ---</option>';
  console.log("cargando datos",data)
  data.forEach(item => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.descripcion || item.nombre;
    combo.appendChild(option);
  });
}
