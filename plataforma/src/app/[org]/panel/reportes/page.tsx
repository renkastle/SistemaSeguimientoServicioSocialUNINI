import Link from "next/link";
import { db } from "@/lib/db";
import { projectScope, requireUser } from "@/lib/auth";
import { hoursByStudent, projectAlerts } from "@/lib/stats";
import { NOTE_KIND, PROJECT_STATUS, fmtDate } from "@/lib/labels";
import { Badge, Card, PageHeader, Progress, Stat, btnGhost, input } from "@/components/ui";
import { PrintButton } from "./print-button";

export default async function ReportsPage({ params, searchParams }: { params: Promise<{ org: string }>; searchParams: Promise<{ cohorte?: string }> }) {
  const { org } = await params;
  const { cohorte } = await searchParams;
  const s = await requireUser(org, ["ADMIN", "TUTOR"]);
  const cohorts = await db.cohort.findMany({
    where: { organizationId: s.organizationId, ...(s.role === "TUTOR" ? { tutorId: s.userId } : {}) },
    orderBy: { startDate: "desc" },
  });
  const projects = await db.project.findMany({
    where: { ...projectScope(s), ...(cohorte ? { cohortId: cohorte } : {}), status: { not: "DRAFT" } },
    include: {
      student: { include: { user: true, university: true } },
      cohort: true,
      milestones: true,
      notes: { orderBy: { createdAt: "desc" }, take: 3, include: { tutor: true } },
      hourLogs: { orderBy: { date: "desc" }, take: 1 },
    },
    orderBy: [{ cohortId: "asc" }, { title: "asc" }],
  });
  const hours = await hoursByStudent([...new Set(projects.map((p) => p.studentId))]);
  const totalHours = [...hours.values()].reduce((a, h) => a + h.approved, 0);
  const avgProgress = projects.length ? projects.reduce((a, p) => a + p.progress, 0) / projects.length : 0;
  const byStatus = Object.entries(PROJECT_STATUS).map(([k, v]) => ({ ...v, n: projects.filter((p) => p.status === k).length })).filter((x) => x.n);
  const universities = new Set(projects.map((p) => p.student.university?.name).filter(Boolean));

  return (
    <>
      <PageHeader
        title="Reporte consolidado de proyectos"
        subtitle={`Generado el ${fmtDate(new Date())}${cohorte ? ` · ${cohorts.find((c) => c.id === cohorte)?.name}` : ""}`}
        actions={
          <div className="no-print flex gap-2">
            <a href={`/api/${org}/export/proyectos${cohorte ? `?cohorte=${cohorte}` : ""}`} className={btnGhost}>
              Exportar CSV
            </a>
            <PrintButton />
          </div>
        }
      />
      <form className="no-print mb-6 flex gap-2">
        <select name="cohorte" defaultValue={cohorte ?? ""} className={`${input} max-w-xs`}>
          <option value="">Todas las cohortes</option>
          {cohorts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button className={btnGhost}>Aplicar</button>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Proyectos" value={projects.length} hint={byStatus.map((b) => `${b.n} ${b.label.toLowerCase()}`).join(" · ")} />
        <Stat label="Avance promedio" value={`${Math.round(avgProgress)}%`} />
        <Stat label="Horas validadas" value={Math.round(totalHours).toLocaleString("es-MX")} />
        <Stat label="Universidades participantes" value={universities.size} />
      </div>

      <div className="mt-8 space-y-4">
        {projects.map((p) => {
          const h = hours.get(p.studentId)!;
          const alerts = projectAlerts(p);
          return (
            <Card key={p.id} className="break-inside-avoid">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link href={`/${org}/panel/proyectos/${p.id}`} className="font-semibold text-slate-900 hover:text-[var(--brand)]">
                    {p.title}
                  </Link>
                  <div className="text-sm text-slate-500">
                    {p.student.user.name} · {p.student.university?.name ?? "—"} · {p.cohort.name}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Badge tone={PROJECT_STATUS[p.status].tone}>{PROJECT_STATUS[p.status].label}</Badge>
                  {alerts.map((a) => (
                    <Badge key={a} tone="amber">
                      {a}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div>
                  <div className="text-xs text-slate-500">Avance del proyecto</div>
                  <Progress value={p.progress} />
                </div>
                <div>
                  <div className="text-xs text-slate-500">
                    Horas {Math.round(h.approved)} / {p.cohort.requiredHours}
                  </div>
                  <Progress value={(h.approved / p.cohort.requiredHours) * 100} />
                </div>
                <div className="text-xs text-slate-500">
                  Hitos: {p.milestones.filter((m) => m.done).length}/{p.milestones.length}
                  <br />
                  Comunidad: {p.community ?? "—"}
                </div>
              </div>
              {p.notes.length > 0 && (
                <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
                  {p.notes.map((n) => (
                    <div key={n.id} className="text-sm">
                      <Badge tone={NOTE_KIND[n.kind]?.tone}>{NOTE_KIND[n.kind]?.label}</Badge>{" "}
                      <span className="text-xs text-slate-500">{fmtDate(n.createdAt)}</span>
                      <p className="text-slate-700">{n.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}
