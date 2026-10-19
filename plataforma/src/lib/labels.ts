export const PROJECT_STATUS: Record<string, { label: string; tone: Tone }> = {
  DRAFT: { label: "Borrador", tone: "gray" },
  SUBMITTED: { label: "En revisión", tone: "blue" },
  CHANGES_REQUESTED: { label: "Cambios solicitados", tone: "amber" },
  APPROVED: { label: "Aprobado", tone: "green" },
  COMPLETED: { label: "Concluido", tone: "teal" },
  REJECTED: { label: "Rechazado", tone: "red" },
};

export const HOUR_STATUS: Record<string, { label: string; tone: Tone }> = {
  PENDING: { label: "Pendiente", tone: "amber" },
  APPROVED: { label: "Validada", tone: "green" },
  REJECTED: { label: "Rechazada", tone: "red" },
};

export const COHORT_STATUS: Record<string, { label: string; tone: Tone }> = {
  PLANNED: { label: "Planeada", tone: "gray" },
  ACTIVE: { label: "Activa", tone: "green" },
  CLOSED: { label: "Cerrada", tone: "blue" },
};

export const NOTE_KIND: Record<string, { label: string; tone: Tone }> = {
  SEGUIMIENTO: { label: "Seguimiento", tone: "blue" },
  REUNION: { label: "Reunión", tone: "teal" },
  ALERTA: { label: "Alerta", tone: "red" },
  LOGRO: { label: "Logro", tone: "green" },
};

export const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administración",
  TUTOR: "Tutor/a",
  STUDENT: "Estudiante",
};

export type Tone = "gray" | "blue" | "amber" | "green" | "teal" | "red";

export function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

export function toDateInput(d: Date | null | undefined) {
  return d ? new Date(d).toISOString().slice(0, 10) : "";
}

/** Primer nombre, omitiendo títulos como "Mtra." o "Dr.". */
export function firstName(name: string) {
  return name.split(/\s+/).find((w) => !w.endsWith(".")) ?? name;
}
