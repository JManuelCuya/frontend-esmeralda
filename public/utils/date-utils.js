// Helpers de fecha/hora para inputs HTML
export function toDateValue(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

export function toDatetimeLocalValue(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
}

export function toTimeValue(hhmmssOrIso) {
  if (!hhmmssOrIso) return "";
  // Si viene "14:28:00" -> "14:28"; si viene ISO, toma la hora local
  if (/^\d{2}:\d{2}/.test(hhmmssOrIso)) return hhmmssOrIso.slice(0, 5);
  const d = new Date(hhmmssOrIso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}
