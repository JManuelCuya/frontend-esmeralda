// =================== CONFIG ===================
const API_BASE_URL = "http://localhost:3001/api";
// Ignoramos banderas de “filtrar finalizados”, ya que el backend devuelve solo finalizados
let SKIP_FILTERS_ON_FIRST_RENDER = true;



// =================== STATE ===================
const state = {
  q: "",
  area: "",
  tipo: "",
  prioridad: "",
  desde: new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10), // últimos 7 días
  hasta: new Date().toISOString().slice(0, 10),
  perPage: 10,
  page: 1,
  rows: [],
  filtered: [],
  selected: null,
};

// =================== HELPERS ===================
const $ = (sel) => document.querySelector(sel);
const fmtPercent = (n) => `${Math.round(n * 100)}%`;
const toDate = (s) => new Date(String(s).replace(" ", "T"));

function toDateTime(fecha, hora) {
  if (!fecha) return null;
  // si viene "2025-06-26T05:00:00.000Z", me quedo con "2025-06-26"
  const datePart = String(fecha).split("T")[0];
  const timePart = (hora || "00:00:00").padEnd(8, ":00"); // asegura HH:mm:ss
  return new Date(`${datePart}T${timePart}`);
}

function minutosEntre(inicio, fin) {
  if (
    !(inicio instanceof Date) ||
    isNaN(inicio) ||
    !(fin instanceof Date) ||
    isNaN(fin)
  )
    return 0;

  let end = fin;
  if (end <= inicio) end = new Date(end.getTime() + 24 * 60 * 60 * 1000); // cruza medianoche

  const diffMs = end - inicio;
  return diffMs > 0 ? Math.round(diffMs / 60000) : 0;
}

function csvEscape(val) {
  const v = String(val ?? "");
  return /[,"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
}
function download(filename, content, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// =================== MAPEO ===================
function mapAtencionToRow(at) {
  const dInicio = toDateTime(at.fecha_atencion, at.hora_inicio);

  // nombre correcto del backend: fecha_atencion_fin
  const fechaFin = at.fecha_atencion_fin || at.fecha_atencion;
  const dFin = toDateTime(fechaFin, at.hora_fin); // si no hay hora_fin → null

  const mins = minutosEntre(dInicio, dFin);

  return {
    id: at.id,
    codigo: `AT-${at.id}`,
    // “Fecha cierre” para la tabla
    fecha: `${(fechaFin || "").split("T")[0]} ${at.hora_fin || ""}`.trim(),
    solicitante: at.empleado,
    area: at.centro_costo,
    tipo: at.tipo_atencion,
    prioridad: at.prioridad,
    estado: at.estado || "Cerrado",
    tiempoAtencionMin: mins,
    responsable: at.responsable || "-",
    resumen: at.motivo || at.observacion || "",
  };
}

// =================== DATA ===================
export async function loadRowsFromAPI() {
  const res = await fetch(`${API_BASE_URL}/atenciones/finalizadas`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();

  // === LOG DETALLADO ===
  console.group("🔎 Datos recibidos de /atenciones/finalizadas");
  console.log("Total registros:", data.length);
  if (data.length) {
    console.table(
      data.map((d) => ({
        id: d.id,
        fecha_atencion: d.fecha_atencion,
        hora_inicio: d.hora_inicio,
        fecha_atencion_fn: d.fecha_atencion_fin,
        hora_fin: d.hora_fin,
        id_estado: d.id_estado,
        estado: d.estado,
      }))
    );
    console.log("Ejemplo completo:", data[0]);
  }
  console.groupEnd();

  state.rows = data.map(mapAtencionToRow);

  state.rows.slice(0, 3).forEach((r) => {
    console.log("⏱️ Calc:", {
      id: r.id,
      fecha: r.fecha,
      tiempoAtencionMin: r.tiempoAtencionMin,
    });
  });

  state.page = 1;

  SKIP_FILTERS_ON_FIRST_RENDER = true;
  applyFilters();
}

// =================== RENDER ===================
function applyFilters() {
  const start = new Date(`${state.desde}T00:00:00`);
  const end = new Date(`${state.hasta}T23:59:59`);
  const q = state.q.trim().toLowerCase();

  if (SKIP_FILTERS_ON_FIRST_RENDER) {
    state.filtered = [...state.rows]; // muestra todo lo que vino del backend
    SKIP_FILTERS_ON_FIRST_RENDER = false;
  } else {
    state.filtered = state.rows.filter((t) => {
      const d = toDate(t.fecha);
      if (isFinite(start) && isFinite(end)) {
        if (d < start || d > end) return false;
      }
      if (state.area && t.area !== state.area) return false;
      if (state.tipo && t.tipo !== state.tipo) return false;
      if (state.prioridad && t.prioridad !== state.prioridad) return false;
      if (
        q &&
        ![t.codigo, t.solicitante, t.responsable, t.resumen].some((x) =>
          String(x).toLowerCase().includes(q)
        )
      )
        return false;
      return true;
    });
  }

  const total = state.filtered.length;

  const vals = state.filtered
    .map((t) => t.tiempoAtencionMin)
    .filter((v) => Number.isFinite(v) && v > 0);

const prom = vals.length
  ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
  : 0;

const pctHigh = total
  ? state.filtered.filter(f => f.prioridad === 'Alta').length / total
  : 0;

$('#kpiTotal').textContent = total;
$('#kpiProm').textContent  = `${prom} min`;
$('#kpiHigh').textContent  = fmtPercent(pctHigh);
$('#statsLine').textContent = `Total filtrados: ${total} • Tiempo prom.: ${prom} min`;

  const pages = Math.max(1, Math.ceil(total / state.perPage));
  if (state.page > pages) state.page = pages;
  $("#pageInfo").textContent = `Página ${state.page} de ${pages}`;
  $("#first").disabled = state.page === 1;
  $("#prev").disabled = state.page === 1;
  $("#next").disabled = state.page === pages;
  $("#last").disabled = state.page === pages;

  const ini = (state.page - 1) * state.perPage;
  const fin = state.page * state.perPage;
  const rows = state.filtered.slice(ini, fin);

  const tbody = $("#tbody");
  tbody.innerHTML = rows.length
    ? rows
        .map(
          (r) => `
      <tr>
        <td>${r.codigo}</td>
        <td>${r.fecha}</td>
        <td>${r.solicitante}</td>
        <td>${r.area}</td>
        <td>${r.tipo}</td>
        <td>${r.prioridad}</td>
        <td>${r.responsable}</td>
        <td class="num">${r.tiempoAtencionMin}</td>
        <td class="center">
          <div style="display:flex;gap:6px;justify-content:center">
            <button   type="submit" class="btn btn-ghost" data-act="ver" data-id="${r.id}">Ver detalle</button>
            <button class="btn btn-ghost" data-act="pdf" data-id="${r.id}">PDF</button>
          </div>
        </td>
      </tr>`
        )
        .join("")
    : `<tr><td colspan="9" class="empty">No hay registros para los filtros seleccionados</td></tr>`;
}

// =================== UI (detalle & export) ===================
function exportCSV(rows) {
  const headers = [
    "Código",
    "Fecha cierre",
    "Solicitante",
    "Área",
    "Tipo",
    "Prioridad",
    "Responsable",
    "Tiempo (min)",
  ];
  const lines = rows.map((r) =>
    [
      r.codigo,
      r.fecha,
      r.solicitante,
      r.area,
      r.tipo,
      r.prioridad,
      r.responsable,
      r.tiempoAtencionMin,
    ]
      .map(csvEscape)
      .join(",")
  );
  download(
    "tickets_cerrados.csv",
    [headers.join(","), ...lines].join("\n"),
    "text/csv;charset=utf-8"
  );
}
function exportPrintableHTML(rows, title = "Informe de Tickets Cerrados") {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
  <style>
    body{font-family:Arial, sans-serif; padding:24px}
    h1{margin:0 0 8px}
    .muted{color:#555}
    table{width:100%;border-collapse:collapse;margin-top:12px;font-size:12px}
    th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}
    thead{background:#f3f4f6}
  </style>
  </head><body onload="print()">
  <h1>${title}</h1>
  <div class="muted">Generado: ${new Date().toLocaleString()}</div>
  <table><thead><tr>
    <th>Código</th><th>Fecha cierre</th><th>Solicitante</th><th>Área</th>
    <th>Tipo</th><th>Prioridad</th><th>Responsable</th><th>Tiempo (min)</th>
  </tr></thead><tbody>
  ${rows
    .map(
      (r) =>
        `<tr><td>${r.codigo}</td><td>${r.fecha}</td><td>${r.solicitante}</td><td>${r.area}</td><td>${r.tipo}</td><td>${r.prioridad}</td><td>${r.responsable}</td><td>${r.tiempoAtencionMin}</td></tr>`
    )
    .join("")}
  </tbody></table>
  </body></html>`;
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  window.open(url, "_blank");
}
function openDetail(row) {
  state.selected = row;
  $("#pTitle").textContent = `Ticket ${row.codigo}`;
  $("#pSub").textContent = `Estado: ${row.estado} • Cierre: ${row.fecha}`;
  $("#pResumen").textContent = row.resumen;
  const info = [
    ["Solicitante", row.solicitante],
    ["Área", row.area],
    ["Tipo", row.tipo],
    ["Prioridad", row.prioridad],
    ["Responsable", row.responsable],
    ["Tiempo de atención", `${row.tiempoAtencionMin} min`],
  ]
    .map(
      ([k, v]) =>
        `<div class="info"><div class="cap">${k}</div><div class="val">${v}</div></div>`
    )
    .join("");
  $("#infoGrid").innerHTML = info;

  const steps = [
    "Creación del ticket",
    "Asignación a responsable",
    "Diagnóstico",
    "Ejecución de solución",
    "Cierre y validación",
  ];
  $("#pTimeline").innerHTML = steps
    .map(
      (s, idx) => `
    <li><div class="dot"></div><div>
      <div class="t-title">${s}</div>
      <div class="t-sub">2025-09-1${idx} 10:${String(10 + idx).padStart(
        2,
        "0"
      )} • Usuario del sistema</div>
    </div></li>`
    )
    .join("");

  $("#overlay").classList.add("show");
  $("#panel").classList.add("show");
  $("#panel").setAttribute("aria-hidden", "false");
}

function closeDetail() {
  $("#overlay").classList.remove("show");
  $("#panel").classList.remove("show");
  $("#panel").setAttribute("aria-hidden", "true");
  state.selected = null;
}

// bind en elementos de la vista (ya insertados en el DOM)
function bindEvents() {
  $("#q")?.addEventListener("input", (e) => {
    state.q = e.target.value;
    state.page = 1;
    applyFilters();
  });
  $("#area")?.addEventListener("change", (e) => {
    state.area = e.target.value;
    state.page = 1;
    applyFilters();
  });
  $("#tipo")?.addEventListener("change", (e) => {
    state.tipo = e.target.value;
    state.page = 1;
    applyFilters();
  });
  $("#prioridad")?.addEventListener("change", (e) => {
    state.prioridad = e.target.value;
    state.page = 1;
    applyFilters();
  });
  $("#desde")?.addEventListener("change", (e) => {
    state.desde = e.target.value;
    state.page = 1;
    applyFilters();
  });
  $("#hasta")?.addEventListener("change", (e) => {
    state.hasta = e.target.value;
    state.page = 1;
    applyFilters();
  });
  $("#perPage")?.addEventListener("change", (e) => {
    state.perPage = +e.target.value;
    state.page = 1;
    applyFilters();
  });
  $("#first")?.addEventListener("click", () => {
    state.page = 1;
    applyFilters();
  });
  $("#prev")?.addEventListener("click", () => {
    state.page = Math.max(1, state.page - 1);
    applyFilters();
  });
  $("#next")?.addEventListener("click", () => {
    const pages = Math.max(1, Math.ceil(state.filtered.length / state.perPage));
    state.page = Math.min(pages, state.page + 1);
    applyFilters();
  });
  $("#last")?.addEventListener("click", () => {
    const pages = Math.max(1, Math.ceil(state.filtered.length / state.perPage));
    state.page = pages;
    applyFilters();
  });

$("#tbody")?.addEventListener("click", (e) => {
  console.log("Press")
  const btn = e.target.closest('button[data-act]');
  if (!btn) return;

  const act = btn.dataset.act;
  const id  = Number(btn.dataset.id);
  if (!Number.isFinite(id)) {
    console.warn('Botón sin id válido:', btn.outerHTML);
    return;
  }
  const row = state.filtered.find(r => r.id === id);
  if (!row) {
    console.warn('No se encontró la fila con id', id);
    return;
  }

  if (act === "ver") openDetail(row);
  if (act === "pdf") exportPrintableHTML([row], `Ticket ${row.codigo}`);
});



  $("#closePanel")?.addEventListener("click", closeDetail);
  $("#overlay")?.addEventListener("click", closeDetail);
  $("#pPdf")?.addEventListener("click", () => {
    if (state.selected)
      exportPrintableHTML([state.selected], `Ticket ${state.selected.codigo}`);
  });
  $("#pCsv")?.addEventListener("click", () => {
    if (state.selected) exportCSV([state.selected]);
  });

  $("#btnPdf")?.addEventListener("click", () => {
    exportPrintableHTML(state.filtered, "Informe de Tickets Cerrados");
  });
  $("#btnCsv")?.addEventListener("click", () => {
    exportCSV(state.filtered);
  });

  // refrescar si llega evento global desde sockets
  window.addEventListener(
    "estado-atencion-actualizado",
    async () => {
      try {
        await loadRowsFromAPI();
      } catch {}
    },
    { passive: true }
  );
}

// ============ API pública ============
export async function initReporteTicketsCerrados() {
  // defaults visibles en inputs
  $("#desde").value = state.desde;
  $("#hasta").value = state.hasta;
  bindEvents();
  await loadRowsFromAPI();
}
