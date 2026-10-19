import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { createStudent } from "@/lib/actions/people";
import { Card, Field, PageHeader, Select, btn } from "@/components/ui";
import { StudentFields } from "../student-fields";
import { ImportForm } from "./import-form";

export default async function NewStudentPage({ params }: { params: Promise<{ org: string }> }) {
  const { org } = await params;
  const s = await requireUser(org, ["ADMIN", "TUTOR"]);
  const [universities, cohorts] = await Promise.all([
    db.university.findMany({ where: { organizationId: s.organizationId }, orderBy: { name: "asc" } }),
    db.cohort.findMany({ where: { organizationId: s.organizationId, status: { not: "CLOSED" } }, orderBy: { startDate: "desc" } }),
  ]);
  const cohortOptions = cohorts.map((c) => ({ value: c.id, label: c.name }));
  return (
    <>
      <PageHeader title="Alta de estudiantes" subtitle="Registra a un estudiante o importa varios desde un CSV." />
      <div className="grid gap-6 xl:grid-cols-3">
        <form action={createStudent} className="xl:col-span-2">
          <input type="hidden" name="org" value={org} />
          <Card className="grid gap-4 md:grid-cols-2">
            <h2 className="font-semibold text-slate-900 md:col-span-2">Datos de acceso</h2>
            <Field label="Nombre completo" name="name" required />
            <Field label="Correo" name="email" type="email" required />
            <Field label="Contraseña inicial" name="password" required hint="Compártela con el estudiante; podrá cambiarla en su perfil." />
            <Select label="Cohorte" name="cohortId" options={cohortOptions} />
            <h2 className="mt-2 font-semibold text-slate-900 md:col-span-2">
              Información general{" "}
              <Link href={`/${org}/panel/universidades`} className="text-xs font-normal text-[var(--brand)]">
                (administrar universidades)
              </Link>
            </h2>
            <StudentFields universities={universities} />
            <div>
              <button className={btn}>Dar de alta</button>
            </div>
          </Card>
        </form>
        <Card>
          <h2 className="font-semibold text-slate-900">Importar desde CSV</h2>
          <p className="mt-1 text-xs text-slate-500">
            Encabezados: <code>nombre,correo,universidad,sede,pais,carrera,matricula,semestre</code>. Las universidades que no existan se crean
            automáticamente.
          </p>
          <ImportForm org={org} cohorts={cohortOptions} />
        </Card>
      </div>
    </>
  );
}
