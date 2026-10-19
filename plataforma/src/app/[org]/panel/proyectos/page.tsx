import Link from "next/link";
import { db } from "@/lib/db";
import { projectScope, requireUser } from "@/lib/auth";
import { hoursByStudent, projectAlerts } from "@/lib/stats";
import { PROJECT_STATUS, fmtDate } from "@/lib/labels";
import { Badge, ButtonLink, Empty, PageHeader, Progress, Table, td } from "@/components/ui";

export default async function ProjectsPage({ params, searchParams }: { params: Promise<{ org: string }>; searchParams: Promise<{ estado?: string; cohorte?: string }> }) {
  const { org } = await params;
  const { estado, cohorte } = await searchParams;
  const s = await requireUser(org);
  const projects = await db.project.findMany({
    where: { ...projectScope(s), ...(estado ? { status: estado } : {}), ...(cohorte ? { cohortId: cohorte } : {}) },
    include: {
      student: { include: { user: true, university: true } },
      cohort: true,
      milestones: true,
      notes: { orderBy: { createdAt: "desc" }, take: 1 },
      hourLogs: { orderBy: { date: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });
  const hours = await hoursByStudent([...new Set(projects.map((p) => p.studentId))]);
  const isStudent = s.role === "STUDENT";

  return (
    <>
      <PageHeader
        title={isStudent ? "Mis proyectos" : "Proyectos"}
        subtitle={isStudent ? undefined : "Vista consolidada de todos los proyectos a tu cargo"}
        actions={isStudent ? <ButtonLink href={`/${org}/panel/proyectos/nuevo`}>+ Nuevo proyecto</ButtonLink> : <ButtonLink href={`/${org}/panel/reportes`} ghost>Ver reporte consolidado</ButtonLink>}
      />
      {!isStudent && (
        <div className="mb-4 flex flex-wrap gap-2 text-sm">
          <Link href={`/${org}/panel/proyectos`} className={`rounded-full px-3 py-1 ${!estado ? "bg-slate-900 text-white" : "bg-white ring-1 ring-slate-200"}`}>
            Todos
          </Link>
          {Object.entries(PROJECT_STATUS).map(([k, v]) => (
            <Link key={k} href={`/${org}/panel/proyectos?estado=${k}`} className={`rounded-full px-3 py-1 ${estado === k ? "bg-slate-900 text-white" : "bg-white ring-1 ring-slate-200"}`}>
              {v.label}
            </Link>
          ))}
        </div>
      )}
      {projects.length === 0 ? (
        <Empty>No hay proyectos.</Empty>
      ) : (
        <Table head={isStudent ? ["Proyecto", "Cohorte", "Estado", "Avance", "Actualizado"] : ["Proyecto", "Estudiante", "Cohorte", "Estado", "Avance", "Horas", "Alertas"]}>
          {projects.map((p) => {
            const st = PROJECT_STATUS[p.status];
            const h = hours.get(p.studentId)!;
            const alerts = projectAlerts(p);
            return (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className={td}>
                  <Link href={`/${org}/panel/proyectos/${p.id}`} className="font-medium text-slate-900 hover:text-[var(--brand)]">
                    {p.title}
                  </Link>
                  {p.community && <div className="text-xs text-slate-500">{p.community}</div>}
                </td>
                {!isStudent && (
                  <td className={td}>
                    {p.student.user.name}
                    <div className="text-xs text-slate-500">{p.student.university?.name}</div>
                  </td>
                )}
                <td className={td}>{p.cohort.name}</td>
                <td className={td}>
                  <Badge tone={st.tone}>{st.label}</Badge>
                </td>
                <td className={`${td} min-w-36`}>
                  <Progress value={p.progress} />
                  <div className="mt-1 text-xs text-slate-500">
                    Hitos {p.milestones.filter((m) => m.done).length}/{p.milestones.length}
                  </div>
                </td>
                {isStudent ? (
                  <td className={td}>{fmtDate(p.updatedAt)}</td>
                ) : (
                  <>
                    <td className={`${td} whitespace-nowrap tabular-nums`}>
                      {Math.round(h.approved)} / {p.cohort.requiredHours}
                    </td>
                    <td className={td}>
                      <div className="flex flex-col gap-1">
                        {alerts.map((a) => (
                          <Badge key={a} tone="amber">
                            {a}
                          </Badge>
                        ))}
                      </div>
                    </td>
                  </>
                )}
              </tr>
            );
          })}
        </Table>
      )}
    </>
  );
}
