import Link from "next/link";
import { ChoiceButton } from "@/components/choice-button";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { addCohortMembers, setMemberStatus } from "@/lib/actions/service";
import { hoursByStudent } from "@/lib/stats";
import { COHORT_STATUS, PROJECT_STATUS, fmtDate } from "@/lib/labels";
import { Badge, Card, PageHeader, Progress, Table, btn, td } from "@/components/ui";
import { CohortForm } from "../cohort-form";

export default async function CohortPage({ params }: { params: Promise<{ org: string; id: string }> }) {
  const { org, id } = await params;
  const s = await requireUser(org, ["ADMIN", "TUTOR"]);
  const cohort = await db.cohort.findFirst({
    where: { id, organizationId: s.organizationId },
    include: {
      tutor: true,
      members: { include: { student: { include: { user: true, university: true, projects: { where: { cohortId: id } } } } }, orderBy: { joinedAt: "asc" } },
    },
  });
  if (!cohort) notFound();
  const [tutors, available] = await Promise.all([
    db.user.findMany({ where: { organizationId: s.organizationId, role: { in: ["TUTOR", "ADMIN"] }, active: true } }),
    db.studentProfile.findMany({
      where: { user: { organizationId: s.organizationId, active: true }, memberships: { none: { cohortId: id } } },
      include: { user: true, university: true },
      orderBy: { user: { name: "asc" } },
    }),
  ]);
  const hours = await hoursByStudent(cohort.members.map((m) => m.studentId));

  return (
    <>
      <div className="mb-2 text-sm">
        <Link href={`/${org}/panel/cohortes`} className="text-slate-500 hover:text-slate-700">
          ← Cohortes
        </Link>
      </div>
      <PageHeader
        title={cohort.name}
        subtitle={`${fmtDate(cohort.startDate)} – ${fmtDate(cohort.endDate)} · ${cohort.requiredHours} h · Tutor/a: ${cohort.tutor?.name ?? "—"}`}
        actions={<Badge tone={COHORT_STATUS[cohort.status].tone}>{COHORT_STATUS[cohort.status].label}</Badge>}
      />

      <h2 className="mb-3 font-semibold text-slate-900">Integrantes ({cohort.members.length})</h2>
      <Table head={["Estudiante", "Universidad", "Proyecto", "Horas validadas", "Estado"]}>
        {cohort.members.map((m) => {
          const h = hours.get(m.studentId)!;
          const p = m.student.projects[0];
          return (
            <tr key={m.id}>
              <td className={td}>
                <Link href={`/${org}/panel/estudiantes/${m.studentId}`} className="font-medium text-slate-900 hover:text-[var(--brand)]">
                  {m.student.user.name}
                </Link>
                <div className="text-xs text-slate-500">{m.student.user.email}</div>
              </td>
              <td className={td}>
                {m.student.university?.name ?? "—"}
                <div className="text-xs text-slate-500">{[m.student.university?.campus, m.student.university?.country].filter(Boolean).join(" · ")}</div>
              </td>
              <td className={td}>
                {p ? (
                  <Link href={`/${org}/panel/proyectos/${p.id}`} className="hover:text-[var(--brand)]">
                    {p.title} <Badge tone={PROJECT_STATUS[p.status].tone}>{PROJECT_STATUS[p.status].label}</Badge>
                  </Link>
                ) : (
                  <span className="text-slate-400">Sin proyecto</span>
                )}
              </td>
              <td className={`${td} min-w-40`}>
                <Progress value={(h.approved / cohort.requiredHours) * 100} />
                <div className="mt-1 text-xs text-slate-500">
                  {Math.round(h.approved)} / {cohort.requiredHours} h
                </div>
              </td>
              <td className={td}>
                <form action={setMemberStatus} className="flex gap-1">
                  <input type="hidden" name="org" value={org} />
                  <input type="hidden" name="id" value={m.id} />
                  {["ACTIVE", "COMPLETED", "DROPPED"].map((st) => (
                    <ChoiceButton
                      key={st} name="status"
                      value={st}
                      className={`rounded px-2 py-0.5 text-xs ${m.status === st ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"}`}
                    >
                      {{ ACTIVE: "Activo", COMPLETED: "Liberado", DROPPED: "Baja" }[st]}
                    </ChoiceButton>
                  ))}
                </form>
              </td>
            </tr>
          );
        })}
      </Table>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold text-slate-900">Agregar estudiantes</h2>
          {available.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">
              No hay estudiantes disponibles.{" "}
              <Link href={`/${org}/panel/estudiantes/nuevo`} className="text-[var(--brand)]">
                Dar de alta
              </Link>
            </p>
          ) : (
            <form action={addCohortMembers} className="mt-3">
              <input type="hidden" name="org" value={org} />
              <input type="hidden" name="cohortId" value={cohort.id} />
              <div className="max-h-72 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
                {available.map((st) => (
                  <label key={st.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-50">
                    <input type="checkbox" name="studentIds" value={st.id} />
                    {st.user.name} <span className="text-xs text-slate-500">{st.university?.name}</span>
                  </label>
                ))}
              </div>
              <button className={`${btn} mt-3`}>Agregar a la cohorte</button>
            </form>
          )}
        </Card>
        <div>
          <h2 className="mb-3 font-semibold text-slate-900">Editar cohorte</h2>
          <CohortForm org={org} cohort={cohort} tutors={tutors} />
        </div>
      </div>
    </>
  );
}
