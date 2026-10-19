import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { createProject } from "@/lib/actions/service";
import { Empty, PageHeader } from "@/components/ui";
import { ProjectForm } from "../project-form";

export default async function NewProjectPage({ params }: { params: Promise<{ org: string }> }) {
  const { org } = await params;
  const s = await requireUser(org, ["STUDENT"]);
  const memberships = await db.cohortMember.findMany({
    where: { student: { userId: s.userId }, status: "ACTIVE", cohort: { status: { not: "CLOSED" } } },
    include: { cohort: true },
  });
  return (
    <div className="max-w-3xl">
      <PageHeader title="Nuevo proyecto" subtitle="Tu tutor revisará la propuesta y podrá aprobarla o pedirte cambios." />
      {memberships.length === 0 ? (
        <Empty>Necesitas pertenecer a una cohorte activa para proponer un proyecto.</Empty>
      ) : (
        <ProjectForm org={org} action={createProject} cohorts={memberships.map((m) => m.cohort)} />
      )}
    </div>
  );
}
