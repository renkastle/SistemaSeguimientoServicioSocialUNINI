import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { changeOwnPassword, updateStudent } from "@/lib/actions/people";
import { Card, Empty, Field, PageHeader, btn } from "@/components/ui";
import { StudentFields } from "../estudiantes/student-fields";

export default async function ProfilePage({ params, searchParams }: { params: Promise<{ org: string }>; searchParams: Promise<{ ok?: string }> }) {
  const { org } = await params;
  const { ok } = await searchParams;
  const s = await requireUser(org, ["STUDENT"]);
  const [st, universities] = await Promise.all([
    db.studentProfile.findUnique({ where: { userId: s.userId }, include: { user: true } }),
    db.university.findMany({ where: { organizationId: s.organizationId }, orderBy: { name: "asc" } }),
  ]);
  if (!st) return <Empty>Perfil no encontrado.</Empty>;
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Mi perfil" subtitle={st.user.email} />
      {ok && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">Cambios guardados.</p>}
      <form action={updateStudent}>
        <input type="hidden" name="org" value={org} />
        <input type="hidden" name="id" value={st.id} />
        <Card className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Field label="Nombre completo" name="name" required defaultValue={st.user.name} />
          </div>
          <StudentFields student={st} universities={universities} />
          <div>
            <button className={btn}>Guardar</button>
          </div>
        </Card>
      </form>
      <form action={changeOwnPassword}>
        <input type="hidden" name="org" value={org} />
        <Card className="flex flex-wrap items-end gap-3">
          <div className="flex-1">
            <Field label="Nueva contraseña" name="password" type="password" required />
          </div>
          <button className={btn}>Cambiar contraseña</button>
        </Card>
      </form>
    </div>
  );
}
