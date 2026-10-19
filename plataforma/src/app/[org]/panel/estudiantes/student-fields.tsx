import type { StudentProfile, University } from "@prisma/client";
import { toDateInput } from "@/lib/labels";
import { Field, Select } from "@/components/ui";

/** Campos de información general del estudiante, compartidos por alta, edición y perfil. */
export function StudentFields({ student, universities }: { student?: StudentProfile | null; universities: University[] }) {
  return (
    <>
      <Select
        label="Universidad / sede"
        name="universityId"
        defaultValue={student?.universityId}
        options={universities.map((u) => ({ value: u.id, label: `${u.name}${u.campus ? ` – ${u.campus}` : ""} (${u.country})` }))}
      />
      <Field label="Matrícula" name="studentNumber" defaultValue={student?.studentNumber} />
      <Field label="Carrera" name="career" defaultValue={student?.career} />
      <Field label="Semestre" name="semester" type="number" defaultValue={student?.semester} />
      <Field label="País de residencia" name="country" defaultValue={student?.country} />
      <Field label="Ciudad" name="city" defaultValue={student?.city} />
      <Field label="Teléfono" name="phone" type="tel" defaultValue={student?.phone} />
      <Field label="Fecha de nacimiento" name="birthDate" type="date" defaultValue={toDateInput(student?.birthDate)} />
      <Field label="Contacto de emergencia" name="emergencyContact" defaultValue={student?.emergencyContact} />
      <div className="md:col-span-2">
        <Field label="Intereses / presentación" name="bio" textarea defaultValue={student?.bio} />
      </div>
    </>
  );
}
