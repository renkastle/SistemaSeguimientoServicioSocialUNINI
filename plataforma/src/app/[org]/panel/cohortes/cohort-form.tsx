import type { Cohort } from "@prisma/client";
import { saveCohort } from "@/lib/actions/service";
import { COHORT_STATUS, toDateInput } from "@/lib/labels";
import { Card, Field, Select, btn } from "@/components/ui";

export function CohortForm({ org, cohort, tutors }: { org: string; cohort?: Cohort; tutors: { id: string; name: string }[] }) {
  return (
    <form action={saveCohort}>
      <input type="hidden" name="org" value={org} />
      {cohort && <input type="hidden" name="id" value={cohort.id} />}
      <Card className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <Field label="Nombre" name="name" required defaultValue={cohort?.name} placeholder="Ej. Cohorte Primavera 2027" />
        </div>
        <div className="md:col-span-2">
          <Field label="Descripción" name="description" textarea defaultValue={cohort?.description} />
        </div>
        <Field label="Inicio" name="startDate" type="date" required defaultValue={toDateInput(cohort?.startDate)} />
        <Field label="Fin" name="endDate" type="date" required defaultValue={toDateInput(cohort?.endDate)} />
        <Field label="Horas requeridas" name="requiredHours" type="number" required defaultValue={cohort?.requiredHours ?? 480} />
        <Select label="Estado" name="status" required defaultValue={cohort?.status ?? "ACTIVE"} options={Object.entries(COHORT_STATUS).map(([value, v]) => ({ value, label: v.label }))} />
        <Select label="Tutor/a responsable" name="tutorId" defaultValue={cohort?.tutorId} options={tutors.map((t) => ({ value: t.id, label: t.name }))} />
        <div className="flex items-end">
          <button className={btn}>Guardar</button>
        </div>
      </Card>
    </form>
  );
}
