import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { resetPassword, toggleUserActive, updateStudent } from "@/lib/actions/people";
import { hoursByStudent } from "@/lib/stats";
import { PROJECT_STATUS, fmtDate } from "@/lib/labels";
import { Badge, Card, Field, PageHeader, Progress, btn, btnGhost } from "@/components/ui";
import { StudentFields } from "../student-fields";

export default async function StudentPage({ params }: { params: Promise<{ org: string; id: string }> }) {
  const { org, id } = await params;
  const s = await requireUser(org, ["ADMIN", "TUTOR"]);
  const st = await db.studentProfile.findFirst({
    where: { id, user: { organizationId: s.organizationId } },
    include: { user: true, university: true, memberships: { include: { cohort: true } }, projects: true },
  });
  if (!st) notFound();
  const universities = await db.university.findMany({ where: { organizationId: s.organizationId }, orderBy: { name: "asc" } });
  const h = (await hoursByStudent([st.id])).get(st.id)!;
  const required = st.memberships[0]?.cohort.requiredHours ?? 480;

  return (
    <>
      <div className="mb-2 text-sm">
        <Link href={`/${org}/panel/estudiantes`} className="text-slate-500 hover:text-slate-700">
          ← Estudiantes
        </Link>
      </div>
      <PageHeader title={st.user.name} subtitle={`${st.user.email} · alta ${fmtDate(st.user.createdAt)}`} />
      <div className="grid gap-6 lg:grid-cols-3">
        <form action={updateStudent} className="lg:col-span-2">
          <input type="hidden" name="org" value={org} />
          <input type="hidden" name="id" value={st.id} />
          <Card className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Field label="Nombre completo" name="name" required defaultValue={st.user.name} />
            </div>
            <StudentFields student={st} universities={universities} />
            <div>
              <button className={btn}>Guardar cambios</button>
            </div>
          </Card>
        </form>
        <div className="space-y-6">
          <Card>
            <div className="text-sm text-slate-500">Horas validadas</div>
            <div className="mt-1 text-2xl font-semibold">
              {Math.round(h.approved)} / {required}
            </div>
            <div className="mt-2">
              <Progress value={(h.approved / required) * 100} />
            </div>
            <div className="mt-4 text-sm text-slate-500">Cohortes</div>
            <ul className="mt-1 text-sm">
              {st.memberships.map((m) => (
                <li key={m.id}>
                  <Link href={`/${org}/panel/cohortes/${m.cohortId}`} className="text-[var(--brand)]">
                    {m.cohort.name}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-4 text-sm text-slate-500">Proyectos</div>
            <ul className="mt-1 space-y-1 text-sm">
              {st.projects.map((p) => (
                <li key={p.id}>
                  <Link href={`/${org}/panel/proyectos/${p.id}`} className="hover:text-[var(--brand)]">
                    {p.title}
                  </Link>{" "}
                  <Badge tone={PROJECT_STATUS[p.status].tone}>{PROJECT_STATUS[p.status].label}</Badge>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <h2 className="font-semibold text-slate-900">Acceso</h2>
            <form action={resetPassword} className="mt-3 flex gap-2">
              <input type="hidden" name="org" value={org} />
              <input type="hidden" name="id" value={st.userId} />
              <input name="password" required placeholder="Nueva contraseña" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <button className={btnGhost}>Cambiar</button>
            </form>
            {s.role === "ADMIN" && (
              <form action={toggleUserActive} className="mt-3">
                <input type="hidden" name="org" value={org} />
                <input type="hidden" name="id" value={st.userId} />
                <button className="text-sm text-rose-600 hover:underline">{st.user.active ? "Desactivar cuenta" : "Reactivar cuenta"}</button>
              </form>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
