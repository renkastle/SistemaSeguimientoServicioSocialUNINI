"use client";

import { useActionState } from "react";
import { importStudents } from "@/lib/actions/people";
import { btn, input } from "@/components/ui";

const SAMPLE = `nombre,correo,universidad,sede,pais,carrera,matricula,semestre
Ana López,ana@ejemplo.com,UNAM,Ciudad Universitaria,México,Nutrición,A0123,7`;

export function ImportForm({ org, cohorts }: { org: string; cohorts: { value: string; label: string }[] }) {
  const [result, action, pending] = useActionState(importStudents, null);
  return (
    <form action={action} className="mt-3 space-y-3">
      <input type="hidden" name="org" value={org} />
      <textarea name="csv" rows={8} required placeholder={SAMPLE} className={`${input} font-mono text-xs`} />
      <input name="password" required placeholder="Contraseña inicial para todos" className={input} />
      <select name="cohortId" className={input} defaultValue="">
        <option value="">Sin cohorte</option>
        {cohorts.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>
      <button disabled={pending} className={btn}>
        {pending ? "Importando…" : "Importar"}
      </button>
      {result && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{result}</p>}
    </form>
  );
}
