import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { COHORT_STATUS, fmtDate } from "@/lib/labels";
import { Badge, ButtonLink, Empty, PageHeader, Table, td } from "@/components/ui";

export default async function CohortsPage({ params }: { params: Promise<{ org: string }> }) {
  const { org } = await params;
  const s = await requireUser(org, ["ADMIN", "TUTOR"]);
  const cohorts = await db.cohort.findMany({
    where: { organizationId: s.organizationId, ...(s.role === "TUTOR" ? { tutorId: s.userId } : {}) },
    include: { tutor: true, _count: { select: { members: true, projects: true } } },
    orderBy: { startDate: "desc" },
  });
  return (
    <>
      <PageHeader title="Cohortes" subtitle="Grupos de estudiantes que realizan su servicio social en un mismo periodo." actions={<ButtonLink href={`/${org}/panel/cohortes/nueva`}>+ Nueva cohorte</ButtonLink>} />
      {cohorts.length === 0 ? (
        <Empty>Aún no hay cohortes.</Empty>
      ) : (
        <Table head={["Cohorte", "Periodo", "Tutor/a", "Estudiantes", "Proyectos", "Horas requeridas", "Estado"]}>
          {cohorts.map((c) => (
            <tr key={c.id} className="hover:bg-slate-50">
              <td className={td}>
                <Link href={`/${org}/panel/cohortes/${c.id}`} className="font-medium text-slate-900 hover:text-[var(--brand)]">
                  {c.name}
                </Link>
              </td>
              <td className={`${td} whitespace-nowrap`}>
                {fmtDate(c.startDate)} – {fmtDate(c.endDate)}
              </td>
              <td className={td}>{c.tutor?.name ?? "—"}</td>
              <td className={td}>{c._count.members}</td>
              <td className={td}>{c._count.projects}</td>
              <td className={td}>{c.requiredHours}</td>
              <td className={td}>
                <Badge tone={COHORT_STATUS[c.status].tone}>{COHORT_STATUS[c.status].label}</Badge>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
