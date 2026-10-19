import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { projectScope, requireUser } from "@/lib/auth";
import { updateProject } from "@/lib/actions/service";
import { PageHeader } from "@/components/ui";
import { ProjectForm } from "../../project-form";

export default async function EditProjectPage({ params }: { params: Promise<{ org: string; id: string }> }) {
  const { org, id } = await params;
  const s = await requireUser(org, ["STUDENT"]);
  const project = await db.project.findFirst({ where: { id, ...projectScope(s), status: { in: ["DRAFT", "CHANGES_REQUESTED"] } } });
  if (!project) notFound();
  return (
    <div className="max-w-3xl">
      <PageHeader title="Editar proyecto" />
      <ProjectForm org={org} action={updateProject} project={project} />
    </div>
  );
}
