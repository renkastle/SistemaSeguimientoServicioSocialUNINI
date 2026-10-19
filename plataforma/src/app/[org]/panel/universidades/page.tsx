import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { saveUniversity } from "@/lib/actions/people";
import { Card, Field, PageHeader, Table, btn, td } from "@/components/ui";

export default async function UniversitiesPage({ params, searchParams }: { params: Promise<{ org: string }>; searchParams: Promise<{ edit?: string }> }) {
  const { org } = await params;
  const { edit } = await searchParams;
  const s = await requireUser(org, ["ADMIN"]);
  const universities = await db.university.findMany({
    where: { organizationId: s.organizationId },
    include: { _count: { select: { students: true } } },
    orderBy: [{ country: "asc" }, { name: "asc" }],
  });
  const current = universities.find((u) => u.id === edit);
  return (
    <>
      <PageHeader title="Universidades y sedes" subtitle="Instituciones de origen de los estudiantes (pueden ser de cualquier país)." />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Table head={["Universidad", "Sede", "Ciudad / país", "Contacto", "Estudiantes", ""]}>
            {universities.map((u) => (
              <tr key={u.id}>
                <td className={`${td} font-medium`}>{u.name}</td>
                <td className={td}>{u.campus ?? "—"}</td>
                <td className={td}>{[u.city, u.country].filter(Boolean).join(", ")}</td>
                <td className={td}>
                  {u.contactName}
                  <div className="text-xs text-slate-500">{u.contactEmail}</div>
                </td>
                <td className={td}>{u._count.students}</td>
                <td className={td}>
                  <a href={`?edit=${u.id}`} className="text-sm text-[var(--brand)]">
                    Editar
                  </a>
                </td>
              </tr>
            ))}
          </Table>
        </div>
        <form action={saveUniversity} key={current?.id ?? "new"}>
          <input type="hidden" name="org" value={org} />
          {current && <input type="hidden" name="id" value={current.id} />}
          <Card className="space-y-3">
            <h2 className="font-semibold text-slate-900">{current ? "Editar universidad" : "Nueva universidad"}</h2>
            <Field label="Nombre" name="name" required defaultValue={current?.name} />
            <Field label="Sede / campus" name="campus" defaultValue={current?.campus} />
            <Field label="Ciudad" name="city" defaultValue={current?.city} />
            <Field label="País" name="country" required defaultValue={current?.country ?? "México"} />
            <Field label="Responsable de servicio social" name="contactName" defaultValue={current?.contactName} />
            <Field label="Correo del responsable" name="contactEmail" type="email" defaultValue={current?.contactEmail} />
            <button className={btn}>Guardar</button>
          </Card>
        </form>
      </div>
    </>
  );
}
