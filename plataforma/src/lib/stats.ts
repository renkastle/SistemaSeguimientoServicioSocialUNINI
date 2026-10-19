import { db } from "./db";

/** Horas aprobadas y pendientes por studentId. */
export async function hoursByStudent(studentIds: string[]) {
  const rows = await db.hourLog.groupBy({
    by: ["studentId", "status"],
    where: { studentId: { in: studentIds } },
    _sum: { hours: true },
  });
  const map = new Map<string, { approved: number; pending: number }>();
  for (const id of studentIds) map.set(id, { approved: 0, pending: 0 });
  for (const r of rows) {
    const e = map.get(r.studentId)!;
    if (r.status === "APPROVED") e.approved += r._sum.hours ?? 0;
    if (r.status === "PENDING") e.pending += r._sum.hours ?? 0;
  }
  return map;
}

const DAY = 24 * 60 * 60 * 1000;

/** Señales de riesgo de un proyecto para el tablero del tutor. */
export function projectAlerts(p: {
  status: string;
  submittedAt: Date | null;
  notes: { createdAt: Date }[];
  hourLogs?: { date: Date }[];
}) {
  const alerts: string[] = [];
  const now = Date.now();
  if (p.status === "SUBMITTED" && p.submittedAt && now - p.submittedAt.getTime() > 5 * DAY) alerts.push("Revisión pendiente > 5 días");
  if (p.status === "APPROVED") {
    const lastNote = p.notes[0]?.createdAt;
    if (!lastNote || now - lastNote.getTime() > 14 * DAY) alerts.push("Sin seguimiento en 14 días");
    const lastLog = p.hourLogs?.[0]?.date;
    if (p.hourLogs && (!lastLog || now - lastLog.getTime() > 14 * DAY)) alerts.push("Sin horas registradas en 14 días");
  }
  return alerts;
}
