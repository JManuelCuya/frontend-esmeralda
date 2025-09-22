const API_BASE_URL = "http://localhost:3001/api"; 
import { cargarCombos as cargar } from "../utils/combo-utils.js";
import { predecirCosto, calcularTiempoPromedio } from "../utils/costo-utils.js";

export function cargarCombosCotizacion() {
  cargar([
    { id: "empresa", url: `${API_BASE_URL}/combos/empresas` },
    { id: "tipo_atencion", url: `${API_BASE_URL}/combos/tipos-atencion` },
    { id: "categorias", url: `${API_BASE_URL}/combos/categorias` }
  ]);

  // Agregar el manejador para el cambio en el combo de "empresa"
  document.getElementById("empresa").addEventListener("change", function() {
    const empresaId = this.value;
    console.log(empresaId);
    // Si se seleccionó una empresa
    if (empresaId) {
      // Realizamos una nueva consulta para obtener las áreas correspondientes a la empresa seleccionada
      fetch(`${API_BASE_URL}/combos/areaCoti/${empresaId}`)
        .then(res => res.json())
        .then(data => {
          const areaCombo = document.getElementById("area");
          areaCombo.innerHTML = ''; // Limpiar las opciones actuales de "area"

          // Si la respuesta es válida, llenamos el combo de "area"
          if (data.length > 0) {
            data.forEach(item => {
              const option = document.createElement("option");
              option.value = item.id;
              option.textContent = item.descripcion || item.nombre;
              areaCombo.appendChild(option);
            });
          } else {
            areaCombo.innerHTML = '<option value="">Sin resultados</option>';
          }
        })
        .catch(error => {
          console.error("Error al cargar áreas:", error);
        });
    } else {
      // Si no hay selección en "empresa", limpia el combo "area"
      document.getElementById("area").innerHTML = '<option value="">Selecciona una empresa</option>';
    }
  });


document.getElementById("area").addEventListener("change", async function () {
  const areaId = this.value;
  const centroCostosSelect = document.getElementById("centro_costos");

  centroCostosSelect.innerHTML = '<option value="">Cargando...</option>';

  if (!areaId) {
    centroCostosSelect.innerHTML = '<option value="">Seleccione un área</option>';
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/combos/centros-costos/area/${areaId}`)
    const data = await res.json();

    centroCostosSelect.innerHTML = '<option value="">Seleccione centro de costos</option>';
    data.forEach(item => {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = item.descripcion;
      centroCostosSelect.appendChild(option);
    });
  } catch (err) {
    console.error("Error al cargar centros de costos:", err);
    centroCostosSelect.innerHTML = '<option value="">Error al cargar</option>';
  }
});

document.getElementById("centro_costos").addEventListener("change", async function () {
  const centroCostosId = this.value;
  const empleadoSelect = document.getElementById("usuario");
  empleadoSelect.innerHTML = '<option value="">Cargando...</option>';
  if (!centroCostosId) {
    empleadoSelect.innerHTML = '<option value="">Seleccione un centro de costos</option>';
    return;
  }
  try {
    const res = await fetch(`${API_BASE_URL}/combos/empleados-por-centro-costos?centro_costos_id=${centroCostosId}`);
    const data = await res.json();

    empleadoSelect.innerHTML = '<option value="">Seleccione un empleado</option>';
    data.forEach(item => {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = item.nombre;
      empleadoSelect.appendChild(option);
    });
  } catch (err) {
    console.error("Error al cargar empleados:", err);
    empleadoSelect.innerHTML = '<option value="">Error al cargar</option>';
  }
});



 document.getElementById("categorias").addEventListener("change", async function () {
    const categoriaId = this.value;
    const itemCombo = document.getElementById("item");

    if (!categoriaId) {
      itemCombo.innerHTML = '<option value="">Seleccione una categoría</option>';
      return;
    }

    itemCombo.innerHTML = '<option value="">Cargando...</option>';

    try {
      const res = await fetch(`${API_BASE_URL}/combos/productos?id_categoria=${categoriaId}`);
      const data = await res.json();

      itemCombo.innerHTML = '<option value="">Seleccione un producto</option>';
      data.forEach(prod => {
        const option = document.createElement("option");
        option.value = prod.id;
        option.textContent = `${prod.codigo_producto} - ${prod.descripcion}`;
        option.dataset.precio = prod.precio_actual;
        itemCombo.appendChild(option);
      });
    } catch (err) {
      console.error("Error al cargar productos:", err);
      itemCombo.innerHTML = '<option value="">Error al cargar</option>';
    }
  });

document.getElementById("item").addEventListener("change", function () {
  const selectedOption = this.options[this.selectedIndex];
  const precio = selectedOption?.dataset?.precio;
  document.getElementById("precio").value = precio;
});

// ─────────────────────────────────────────────────────────────
// 1. Referencias rápidas a los campos de totales
// ─────────────────────────────────────────────────────────────
const tbody        = document.querySelector("#tabla-items tbody");
const inpCantidad  = document.getElementById("cantidad");
const inpPrecio    = document.getElementById("precio");
const cboItem      = document.getElementById("item");
const inpDescuento = document.getElementById("descuento");
const inpImpuesto  = document.getElementById("impuestos");
const outSubtotal  = document.getElementById("subtotal");
const outSubtotalArticulo  = document.getElementById("precArticulo");
const outTotal     = document.getElementById("total");
const atencionPrec     = document.getElementById("precAtencion");

// ─────────────────────────────────────────────────────────────
// 2. Añadir fila a la tabla
// ─────────────────────────────────────────────────────────────
document.getElementById("btnAgregarArticulo").addEventListener("click", () => {
  const seccion = document.getElementById("seccionItems");
  seccion.style.display = "block";

  // Solo conectar eventos una vez (evitar múltiples listeners si se hace click varias veces)
  if (!seccion.dataset.iniciado) {
    seccion.dataset.iniciado = "true";

    const btnAddRow = document.getElementById("btnAgregarItemTabla");

    btnAddRow.addEventListener("click", () => {
      const optionSel = cboItem.options[cboItem.selectedIndex];
      const itemId = optionSel?.value;
      const itemLabel = optionSel?.textContent;
      const precioBase = parseFloat(optionSel?.dataset?.precio || 0);
      const cant = parseFloat(inpCantidad.value) || 0;
      const precio = parseFloat(inpPrecio.value) || precioBase;

      if (!itemId) return alert("Seleccione un producto.");
      if (cant <= 0) return alert("Cantidad debe ser mayor a 0.");
      if (precio < 0) return alert("Precio no puede ser negativo.");

      if ([...tbody.querySelectorAll("tr")].some(tr => tr.dataset.id === itemId)) {
        return alert("El producto ya fue agregado.");
      }

      const totalFila = cant * precio;
      const tr = document.createElement("tr");
      tr.dataset.id = itemId;
      tr.innerHTML = `
        <td>${itemLabel}</td>
        <td class="text-end">${cant}</td>
        <td class="text-end">${precio.toFixed(2)}</td>
        <td class="text-end total-fila">${totalFila.toFixed(2)}</td>
        <td class="text-center">
          <button type="button" class="btn btn-sm btn-danger btnEliminar">
            <i class="fa fa-trash"></i>
          </button>
        </td>
      `;
      tbody.appendChild(tr);

      inpCantidad.value = 1;
      calcularTotales();
    });
  }
});

// ─────────────────────────────────────────────────────────────
// 3. Eliminar fila (delegado)
// ─────────────────────────────────────────────────────────────
tbody.addEventListener("click", e => {
  if (e.target.closest(".btnEliminar")) {
    e.target.closest("tr").remove();
    calcularTotales();
  }
});

// ─────────────────────────────────────────────────────────────
// 4. Recalcular subtotal, descuento, impuestos, total
// ─────────────────────────────────────────────────────────────
function calcularTotales() {
   const precioAtencion = parseFloat(document.getElementById("precAtencion").dataset.valor || 0);

   console.log("Precio de la atencion",precioAtencion)  // Subtotal = suma de totales de cada fila
  let subtotal = 0;
  tbody.querySelectorAll(".total-fila").forEach(td => {
    subtotal += parseFloat(td.textContent) || 0;
  });

  // Descuento e impuestos
  const descPorc = parseFloat(inpDescuento.value) || 0;
  const impPorc  = parseFloat(inpImpuesto.value) || 0;

  const montoDescuento = subtotal * (descPorc / 100);
  const montoImpuesto  = (subtotal - montoDescuento) * (impPorc / 100);
  const sinDesc = subtotal+precioAtencion
  const totalFinal     = (subtotal+precioAtencion) - montoDescuento + montoImpuesto;
  

  // Mostrar
  outSubtotal.value = sinDesc.toFixed(2);
  outSubtotalArticulo.value = subtotal.toFixed(2);
  outTotal.value    = totalFinal.toFixed(2);
}

// ─────────────────────────────────────────────────────────────
// 5. Recalcular totales si cambian descuento o impuestos
// ─────────────────────────────────────────────────────────────
[atencionPrec,inpDescuento, inpImpuesto].forEach(input =>
  input.addEventListener("input", calcularTotales)
);

document.getElementById("btnAgregarArticulo").addEventListener("click", () => {
  document.getElementById("seccionItems").style.display = "block";
});



}

export async function CotizacionSoloAtencion() {

  const tipoAtencion = document.getElementById("tipo_atencion").value;
  const horaInicio = document.getElementById("hora_inicio").value;
  const horaFin = document.getElementById("hora_fin").value;

    const descripcion = document.getElementById("actividad").value;
  
const seccion = "CIBERSEGURIDAD";
  const sub_categoria = "FIREWALL";
  const tipo_solicitud = tipoAtencion;
  const proceso = descripcion;
  const tiempo_promedio = calcularTiempoPromedio(horaInicio, horaFin);

  const costoEstimado = await predecirCosto({
    seccion,
    sub_categoria,
    tipo_solicitud,
    proceso,
    tiempo_promedio,
  });

  // Mostrar el costo en un input
document.getElementById("precAtencion").value = `S/ ${costoEstimado.toFixed(2)}`;
document.getElementById("precAtencion").dataset.valor = costoEstimado.toFixed(2);
document.getElementById("total").value = costoEstimado.toFixed(2);
document.getElementById("subtotal").value = costoEstimado.toFixed(2);
}

document.getElementById("btnGenerarCotizacion").addEventListener("click", CotizacionSoloAtencion);
