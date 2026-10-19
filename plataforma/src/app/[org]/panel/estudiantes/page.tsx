import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { hoursByStudent } from "@/lib/stats";
import { ButtonLink, Empty, PageHeader, Table, btnGhost, input, td } from "@/components/ui";

export default async function StudentsPage({ params, searchParams }: { params: Promise<{ org: string }>; searchParams: Promise<{ q?: string; pais?: string; uni?: string }> }) {
  const { org } = await params;
  const { q, pais, uni } = await searchParams;
  const s = await requireUser(org, ["ADMIN", "TUTOR"]);
  const [students, universities, countries] = await Promise.all([
    db.studentProfile.findMany({
      where: {
        user: { organizationId: s.organizationId, ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : {}) },
        ...(pais ? { OR: [{ country: pais }, { university: { country: pais } }] } : {}),
        ...(uni ? { universityId: uni } : {}),
        ...(s.role === "TUTOR" ? { memberships: { some: { cohort: { tutorId: s.userId } } } } : {}),
      },
      include: { user: true, university: true, memberships: { include: { cohort: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    db.university.findMany({ where: { organizationId: s.organizationId }, orderBy: { name: "asc" } }),
    db.university.findMany({ where: { organizationId: s.organizationId }, distinct: ["country"], select: { country: true } }),
  ]);
  const hours = await hoursByStudent(students.map((x) => x.id));

  return (
    <>
      <PageHeader
        title="Estudiantes"
        subtitle={`${students.length} registrados`}
        actions={
          <>
            <a href={`/api/${org}/export/estudiantes`} className={btnGhost}>
              Exportar CSV
            </a>
            <ButtonLink href={`/${org}/panel/estudiantes/nuevo`}>+ Dar de alta</ButtonLink>
          </>
        }
      />
      <form className="mb-4 grid gap-2 md:grid-cols-4">
        <input name="q" defaultValue={q} placeholder="Buscar por nombre o correo" className={input} />
        <select name="uni" defaultValue={uni ?? ""} className={input}>
          <option value="">Todas las universidades</option>
          {universities.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} {u.campus ? `– ${u.campus}` : ""}
            </option>
          ))}
        </select>
        <select name="pais" defaultValue={pais ?? ""} className={input}>
          <option value="">Todos los países</option>
          {countries.map((c) => (
            <option key={c.country}>{c.country}</option>
          ))}
        </select>
        <button className={btnGhost}>Filtrar</button>
      </form>
      {students.length === 0 ? (
        <Empty>No se encontraron estudiantes.</Empty>
      ) : (
        <Table head={["Nombre", "Universidad / sede", "País", "Carrera", "Cohorte", "Horas validadas"]}>
          {students.map((st) => (
            <tr key={st.id} className="hover:bg-slate-50">
              <td className={td}>
                <Link href={`/${org}/panel/estudiantes/${st.id}`} className="font-medium text-slate-900 hover:text-[var(--brand)]">
                  {st.user.name}
                </Link>
                <div className="text-xs text-slate-500">{st.user.email}</div>
                {!st.user.active && <div className="text-xs text-rose-600">Inactivo</div>}
              </td>
              <td className={td}>
                {st.university?.name ?? "—"}
                {st.university?.campus && <div className="text-xs text-slate-500">{st.university.campus}</div>}
              </td>
              <td className={td}>{st.country ?? st.university?.country ?? "—"}</td>
              <td className={td}>{st.career ?? "—"}</td>
              <td className={td}>{st.memberships.map((m) => m.cohort.name).join(", ") || "—"}</td>
              <td className={`${td} tabular-nums`}>{Math.round(hours.get(st.id)!.approved)}</td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
