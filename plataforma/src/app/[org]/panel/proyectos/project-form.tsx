import type { Project } from "@prisma/client";
import { ChoiceButton } from "@/components/choice-button";
import { Card, Field, Select, btn, btnGhost } from "@/components/ui";

export function ProjectForm({
  org,
  action,
  project,
  cohorts,
}: {
  org: string;
  action: (form: FormData) => Promise<void>;
  project?: Project;
  cohorts?: { id: string; name: string }[];
}) {
  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="org" value={org} />
      {project && <input type="hidden" name="id" value={project.id} />}
      <Card className="space-y-4">
        {cohorts && <Select label="Cohorte" name="cohortId" required options={cohorts.map((c) => ({ value: c.id, label: c.name }))} defaultValue={cohorts[0]?.id} />}
        <Field label="Título del proyecto" name="title" required defaultValue={project?.title} />
        <Field label="Resumen" name="summary" textarea required defaultValue={project?.summary} hint="¿Qué harás, con quién y para qué? (3-5 líneas)" />
        <Field label="Comunidad / escuela / institución donde se realizará" name="community" defaultValue={project?.community} />
      </Card>
      <Card className="space-y-4">
        <Field label="Problema o necesidad que atiende" name="problem" textarea defaultValue={project?.problem} />
        <Field label="Objetivos" name="objectives" textarea rows={4} defaultValue={project?.objectives} hint="Un objetivo por línea. Procura que sean medibles." />
        <Field label="Población beneficiaria" name="beneficiaries" textarea defaultValue={project?.beneficiaries} hint="¿Quiénes y cuántas personas?" />
        <Field label="Actividades y calendario" name="activities" textarea rows={5} defaultValue={project?.activities} />
      </Card>
      <div className="flex flex-wrap gap-2">
        <ChoiceButton name="submit" value="" className={btnGhost}>
          Guardar borrador
        </ChoiceButton>
        <ChoiceButton name="submit" value="1" className={btn}>
          Enviar a revisión del tutor
        </ChoiceButton>
      </div>
    </form>
  );
}
