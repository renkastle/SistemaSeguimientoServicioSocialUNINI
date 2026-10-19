import Link from "next/link";
import { ChoiceButton } from "@/components/choice-button";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { logHours, reviewHours } from "@/lib/actions/service";
import { hoursByStudent } from "@/lib/stats";
import { HOUR_STATUS, fmtDate, toDateInput } from "@/lib/labels";
import { Badge, Card, Empty, Field, PageHeader, Progress, Select, Table, btn, btnGhost, td } from "@/components/ui";

export default async function HoursPage({ params, searchParams }: { params: Promise<{ org: string }>; searchParams: Promise<{ estado?: string }> }) {
  const { org } = await params;
  const { estado = "PENDING" } = await searchParams;
  const s = await requireUser(org);

  if (s.role === "STUDENT") {
    const student = await db.studentProfile.findUnique({
      where: { userId: s.userId },
      include: {
        projects: { where: { status: { in: ["APPROVED", "SUBMITTED", "DRAFT", "CHANGES_REQUESTED"] } } },
        hourLogs: { include: { project: true }, orderBy: { date: "desc" } },
        memberships: { include: { cohort: true } },
      },
    });
    if (!student) return <Empty>Perfil no encontrado.</Empty>;
    const h = (await hoursByStudent([student.id])).get(student.id)!;
    const required = student.memberships[0]?.cohort.requiredHours ?? 480;
    return (
      <>
        <PageHeader title="Mis horas de servicio" subtitle={`${Math.round(h.approved)} h validadas de ${required} · ${Math.round(h.pending)} h pendientes`} />
        <div className="mb-6">
          <Progress value={(h.approved / required) * 100} />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <h2 className="font-semibold text-slate-900">Registrar actividad</h2>
            <form action={logHours} className="mt-3 space-y-3">
              <input type="hidden" name="org" value={org} />
              <Field label="Fecha" name="date" type="date" required defaultValue={toDateInput(new Date())} />
              <Field label="Horas" name="hours" type="number" required />
              <Select label="Proyecto" name="projectId" options={student.projects.map((p) => ({ value: p.id, label: p.title }))} />
              <Field label="Actividad realizada" name="activity" textarea required />
              <Field label="Evidencia (enlace a foto, documento, etc.)" name="evidenceUrl" type="url" />
              <button className={btn}>Registrar</button>
            </form>
          </Card>
          <div className="lg:col-span-2">
            <Table head={["Fecha", "Actividad", "Horas", "Estado"]}>
              {student.hourLogs.map((l) => (
                <tr key={l.id}>
                  <td className={`${td} whitespace-nowrap`}>{fmtDate(l.date)}</td>
                  <td className={td}>
                    {l.activity}
                    {l.project && <div className="text-xs text-slate-500">{l.project.title}</div>}
                    {l.evidenceUrl && (
                      <a href={l.evidenceUrl} target="_blank" rel="noreferrer" className="text-xs text-[var(--brand)] underline">
                        evidencia
                      </a>
                    )}
                  </td>
                  <td className={`${td} tabular-nums`}>{l.hours}</td>
                  <td className={td}>
                    <Badge tone={HOUR_STATUS[l.status].tone}>{HOUR_STATUS[l.status].label}</Badge>
                  </td>
                </tr>
              ))}
            </Table>
          </div>
        </div>
      </>
    );
  }

  const logs = await db.hourLog.findMany({
    where: {
      status: estado,
      student:
        s.role === "TUTOR"
          ? { user: { organizationId: s.organizationId }, memberships: { some: { cohort: { tutorId: s.userId } } } }
          : { user: { organizationId: s.organizationId } },
    },
    include: { student: { include: { user: true } }, project: true },
    orderBy: { date: "desc" },
    take: 200,
  });

  return (
    <>
      <PageHeader title="Validación de horas" subtitle="Selecciona registros y valídalos o recházalos en bloque." />
      <div className="mb-4 flex gap-2 text-sm">
        {Object.entries(HOUR_STATUS).map(([k, v]) => (
          <Link key={k} href={`/${org}/panel/horas?estado=${k}`} className={`rounded-full px-3 py-1 ${estado === k ? "bg-slate-900 text-white" : "bg-white ring-1 ring-slate-200"}`}>
            {v.label}
          </Link>
        ))}
      </div>
      {logs.length === 0 ? (
        <Empty>No hay registros en este estado.</Empty>
      ) : (
        <form action={reviewHours}>
          <input type="hidden" name="org" value={org} />
          <Table head={["", "Estudiante", "Fecha", "Actividad", "Horas"]}>
            {logs.map((l) => (
              <tr key={l.id}>
                <td className={td}>
                  <input type="checkbox" name="ids" value={l.id} defaultChecked={estado === "PENDING"} className="h-4 w-4" />
                </td>
                <td className={td}>{l.student.user.name}</td>
                <td className={`${td} whitespace-nowrap`}>{fmtDate(l.date)}</td>
                <td className={td}>
                  {l.activity}
                  {l.project && <div className="text-xs text-slate-500">{l.project.title}</div>}
                  {l.evidenceUrl && (
                    <a href={l.evidenceUrl} target="_blank" rel="noreferrer" className="text-xs text-[var(--brand)] underline">
                      evidencia
                    </a>
                  )}
                </td>
                <td className={`${td} tabular-nums`}>{l.hours}</td>
              </tr>
            ))}
          </Table>
          <div className="mt-4 flex gap-2">
            <ChoiceButton name="status" value="APPROVED" className={btn}>
              Validar seleccionadas
            </ChoiceButton>
            <ChoiceButton name="status" value="REJECTED" className={btnGhost}>
              Rechazar seleccionadas
            </ChoiceButton>
            {estado !== "PENDING" && (
              <ChoiceButton name="status" value="PENDING" className={btnGhost}>
                Regresar a pendiente
              </ChoiceButton>
            )}
          </div>
        </form>
      )}
    </>
  );
}
