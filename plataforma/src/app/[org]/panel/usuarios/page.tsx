import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { createStaff, toggleUserActive } from "@/lib/actions/people";
import { ROLE_LABEL, fmtDate } from "@/lib/labels";
import { Badge, Card, Field, PageHeader, Select, Table, btn, td } from "@/components/ui";

export default async function StaffPage({ params }: { params: Promise<{ org: string }> }) {
  const { org } = await params;
  const s = await requireUser(org, ["ADMIN"]);
  const staff = await db.user.findMany({
    where: { organizationId: s.organizationId, role: { in: ["ADMIN", "TUTOR"] } },
    include: { _count: { select: { tutoredCohorts: true, tutoredProjects: true } } },
    orderBy: { name: "asc" },
  });
  return (
    <>
      <PageHeader title="Equipo" subtitle="Tutores y administradores de la organización." />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Table head={["Nombre", "Rol", "Cohortes", "Proyectos", "Alta", ""]}>
            {staff.map((u) => (
              <tr key={u.id}>
                <td className={td}>
                  <div className="font-medium">{u.name}</div>
                  <div className="text-xs text-slate-500">{u.email}</div>
                </td>
                <td className={td}>
                  <Badge tone={u.role === "ADMIN" ? "blue" : "teal"}>{ROLE_LABEL[u.role]}</Badge>
                  {!u.active && <Badge tone="red">Inactivo</Badge>}
                </td>
                <td className={td}>{u._count.tutoredCohorts}</td>
                <td className={td}>{u._count.tutoredProjects}</td>
                <td className={td}>{fmtDate(u.createdAt)}</td>
                <td className={td}>
                  {u.id !== s.userId && (
                    <form action={toggleUserActive}>
                      <input type="hidden" name="org" value={org} />
                      <input type="hidden" name="id" value={u.id} />
                      <button className="text-xs text-slate-500 hover:text-rose-600">{u.active ? "Desactivar" : "Activar"}</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        </div>
        <form action={createStaff}>
          <input type="hidden" name="org" value={org} />
          <Card className="space-y-3">
            <h2 className="font-semibold text-slate-900">Agregar integrante</h2>
            <Field label="Nombre" name="name" required />
            <Field label="Correo" name="email" type="email" required />
            <Field label="Contraseña inicial" name="password" required />
            <Select
              label="Rol"
              name="role"
              required
              defaultValue="TUTOR"
              options={[
                { value: "TUTOR", label: "Tutor/a" },
                { value: "ADMIN", label: "Administración" },
              ]}
            />
            <button className={btn}>Agregar</button>
          </Card>
        </form>
      </div>
    </>
  );
}
