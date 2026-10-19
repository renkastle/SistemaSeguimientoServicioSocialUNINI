import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { CohortForm } from "../cohort-form";

export default async function NewCohortPage({ params }: { params: Promise<{ org: string }> }) {
  const { org } = await params;
  const s = await requireUser(org, ["ADMIN", "TUTOR"]);
  const tutors = await db.user.findMany({ where: { organizationId: s.organizationId, role: { in: ["TUTOR", "ADMIN"] }, active: true }, orderBy: { name: "asc" } });
  return (
    <div className="max-w-3xl">
      <PageHeader title="Nueva cohorte" />
      <CohortForm org={org} tutors={tutors} />
    </div>
  );
}
