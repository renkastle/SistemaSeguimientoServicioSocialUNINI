import Link from "next/link";
import { db } from "@/lib/db";
import { projectScope, requireUser, type Session } from "@/lib/auth";
import { saveAnnouncement } from "@/lib/actions/content";
import { hoursByStudent, projectAlerts } from "@/lib/stats";
import { PROJECT_STATUS, fmtDate, firstName } from "@/lib/labels";
import { Badge, ButtonLink, Card, Empty, Field, PageHeader, Progress, Select, Stat, btn } from "@/components/ui";

export default async function Dashboard({ params }: { params: Promise<{ org: string }> }) {
  const { org } = await params;
  const session = await requireUser(org);
  return session.role === "STUDENT" ? <StudentHome org={org} s={session} /> : <StaffHome org={org} s={session} />;
}

async function Announcements({ s, audience }: { s: Session; audience: string }) {
  const items = await db.announcement.findMany({
    where: { organizationId: s.organizationId, audience: { in: ["ALL", audience] } },
    orderBy: { createdAt: "desc" },
    take: 4,
  });
  if (!items.length) return null;
  return (
    <Card>
      <h2 className="font-semibold text-slate-900">Avisos</h2>
      <ul className="mt-3 space-y-3">
        {items.map((a) => (
          <li key={a.id} className="border-l-2 border-[var(--accent)] pl-3">
            <div className="text-sm font-medium text-slate-900">{a.title}</div>
            <div className="whitespace-pre-line text-sm text-slate-600">{a.body}</div>
            <div className="text-xs text-slate-400">{fmtDate(a.createdAt)}</div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

async function StudentHome({ org, s }: { org: string; s: Session }) {
  const student = await db.studentProfile.findUnique({
    where: { userId: s.userId },
    include: {
      university: true,
      memberships: { include: { cohort: { include: { tutor: true } } } },
      projects: { include: { reviews: { orderBy: { createdAt: "desc" }, take: 1 }, milestones: true }, orderBy: { updatedAt: "desc" } },
    },
  });
  if (!student) return <Empty>Tu perfil de estudiante no está configurado. Contacta a tu tutor.</Empty>;
  const hours = (await hoursByStudent([student.id])).get(student.id)!;
  const cohort = student.memberships.find((m) => m.status === "ACTIVE")?.cohort ?? student.memberships[0]?.cohort;
  const required = cohort?.requiredHours ?? 480;

  return (
    <>
      <PageHeader
        title={`Hola, ${firstName(s.name)}`}
        subtitle={cohort ? `${cohort.name} · Tutor/a: ${cohort.tutor?.name ?? "por asignar"}` : "Aún no estás en una cohorte"}
        actions={
          <>
            <ButtonLink href={`/${org}/panel/horas`} ghost>
              Registrar horas
            </ButtonLink>
            <ButtonLink href={`/${org}/panel/asistente`}>Preguntar al asistente</ButtonLink>
          </>
        }
      />
      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Horas validadas" value={`${Math.round(hours.approved)} / ${required}`} hint={`${Math.round(hours.pending)} h pendientes de validar`} />
        <Card>
          <div className="text-sm text-slate-500">Avance de horas</div>
          <div className="mt-4">
            <Progress value={(hours.approved / required) * 100} />
          </div>
          {cohort && <div className="mt-3 text-xs text-slate-500">Cierre de cohorte: {fmtDate(cohort.endDate)}</div>}
        </Card>
        <Stat label="Proyectos" value={student.projects.length} hint={student.university ? `${student.university.name}${student.university.campus ? " · " + student.university.campus : ""}` : undefined} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Mis proyectos</h2>
            {cohort && (
              <Link href={`/${org}/panel/proyectos/nuevo`} className="text-sm font-medium text-[var(--brand)]">
                + Nuevo proyecto
              </Link>
            )}
          </div>
          {student.projects.length === 0 && (
            <Empty>
              Todavía no tienes proyecto.{" "}
              {cohort && (
                <Link href={`/${org}/panel/proyectos/nuevo`} className="font-medium text-[var(--brand)]">
                  Propón el tuyo
                </Link>
              )}
            </Empty>
          )}
          {student.projects.map((p) => {
            const st = PROJECT_STATUS[p.status];
            const done = p.milestones.filter((m) => m.done).length;
            return (
              <Link key={p.id} href={`/${org}/panel/proyectos/${p.id}`} className="block">
                <Card className="hover:border-[var(--brand)]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="font-medium text-slate-900">{p.title}</div>
                    <Badge tone={st.tone}>{st.label}</Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600">{p.summary}</p>
                  <div className="mt-3">
                    <Progress value={p.progress} />
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    Hitos: {done}/{p.milestones.length}
                  </div>
                  {p.reviews[0] && (
                    <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                      <span className="font-medium">Último comentario del tutor:</span> {p.reviews[0].comment}
                    </div>
                  )}
                </Card>
              </Link>
            );
          })}
        </div>
        <div className="space-y-4">
          <Announcements s={s} audience="STUDENTS" />
        </div>
      </div>
    </>
  );
}

async function StaffHome({ org, s }: { org: string; s: Session }) {
  const scope = projectScope(s);
  const cohortScope = s.role === "TUTOR" ? { organizationId: s.organizationId, tutorId: s.userId } : { organizationId: s.organizationId };
  const [projects, cohorts, pendingHours, studentCount] = await Promise.all([
    db.project.findMany({
      where: { ...scope, status: { in: ["SUBMITTED", "APPROVED", "CHANGES_REQUESTED"] } },
      include: {
        student: { include: { user: true } },
        notes: { orderBy: { createdAt: "desc" }, take: 1 },
        hourLogs: { orderBy: { date: "desc" }, take: 1 },
      },
      orderBy: { updatedAt: "desc" },
    }),
    db.cohort.findMany({ where: { ...cohortScope, status: "ACTIVE" }, include: { _count: { select: { members: true, projects: true } } } }),
    db.hourLog.count({
      where: {
        status: "PENDING",
        student: s.role === "TUTOR" ? { memberships: { some: { cohort: { tutorId: s.userId } } } } : { user: { organizationId: s.organizationId } },
      },
    }),
    db.studentProfile.count({
      where: s.role === "TUTOR" ? { memberships: { some: { cohort: { tutorId: s.userId } } } } : { user: { organizationId: s.organizationId } },
    }),
  ]);
  const toReview = projects.filter((p) => p.status === "SUBMITTED");
  const atRisk = projects.map((p) => ({ p, alerts: projectAlerts(p) })).filter((x) => x.alerts.length && x.p.status === "APPROVED");

  return (
    <>
      <PageHeader title={`Hola, ${firstName(s.name)}`} subtitle="Resumen de servicio social" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Estudiantes" value={studentCount} />
        <Stat label="Cohortes activas" value={cohorts.length} />
        <Stat label="Proyectos por revisar" value={toReview.length} />
        <Stat label="Registros de horas por validar" value={pendingHours} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <h2 className="font-semibold text-slate-900">Proyectos esperando tu revisión</h2>
            {toReview.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">Nada pendiente. 🎉</p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100">
                {toReview.map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-3">
                    <div>
                      <Link href={`/${org}/panel/proyectos/${p.id}`} className="font-medium text-slate-900 hover:text-[var(--brand)]">
                        {p.title}
                      </Link>
                      <div className="text-xs text-slate-500">
                        {p.student.user.name} · enviado {fmtDate(p.submittedAt)}
                      </div>
                    </div>
                    <ButtonLink href={`/${org}/panel/proyectos/${p.id}`} ghost>
                      Revisar
                    </ButtonLink>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <h2 className="font-semibold text-slate-900">Proyectos que requieren atención</h2>
            {atRisk.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">Todos los proyectos activos tienen seguimiento reciente.</p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100">
                {atRisk.map(({ p, alerts }) => (
                  <li key={p.id} className="py-3">
                    <Link href={`/${org}/panel/proyectos/${p.id}`} className="font-medium text-slate-900 hover:text-[var(--brand)]">
                      {p.title}
                    </Link>
                    <span className="ml-2 text-xs text-slate-500">{p.student.user.name}</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {alerts.map((a) => (
                        <Badge key={a} tone="amber">
                          {a}
                        </Badge>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <h2 className="font-semibold text-slate-900">Cohortes activas</h2>
            <ul className="mt-3 divide-y divide-slate-100">
              {cohorts.map((c) => (
                <li key={c.id} className="flex items-center justify-between py-3 text-sm">
                  <Link href={`/${org}/panel/cohortes/${c.id}`} className="font-medium text-slate-900 hover:text-[var(--brand)]">
                    {c.name}
                  </Link>
                  <span className="text-slate-500">
                    {c._count.members} estudiantes · {c._count.projects} proyectos · cierra {fmtDate(c.endDate)}
                  </span>
                </li>
              ))}
              {cohorts.length === 0 && <li className="py-3 text-sm text-slate-500">Sin cohortes activas.</li>}
            </ul>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <h2 className="font-semibold text-slate-900">Publicar aviso</h2>
            <form action={saveAnnouncement} className="mt-3 space-y-3">
              <input type="hidden" name="org" value={org} />
              <Field label="Título" name="title" required />
              <Field label="Mensaje" name="body" textarea required />
              <Select
                label="Para"
                name="audience"
                required
                defaultValue="ALL"
                options={[
                  { value: "ALL", label: "Todos" },
                  { value: "STUDENTS", label: "Estudiantes" },
                  { value: "TUTORS", label: "Tutores" },
                ]}
              />
              <button className={btn}>Publicar</button>
            </form>
          </Card>
          <Announcements s={s} audience="TUTORS" />
        </div>
      </div>
    </>
  );
}
