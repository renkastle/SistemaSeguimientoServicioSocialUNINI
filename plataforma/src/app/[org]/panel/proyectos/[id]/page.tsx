import Link from "next/link";
import { ChoiceButton } from "@/components/choice-button";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { projectScope, requireUser } from "@/lib/auth";
import { addMilestone, addTutorNote, reviewProject, toggleMilestone } from "@/lib/actions/service";
import { hoursByStudent } from "@/lib/stats";
import { HOUR_STATUS, NOTE_KIND, PROJECT_STATUS, fmtDate } from "@/lib/labels";
import { Badge, ButtonLink, Card, Field, PageHeader, Progress, Select, btn, input } from "@/components/ui";

export default async function ProjectPage({ params }: { params: Promise<{ org: string; id: string }> }) {
  const { org, id } = await params;
  const s = await requireUser(org);
  const p = await db.project.findFirst({
    where: { id, ...projectScope(s) },
    include: {
      student: { include: { user: true, university: true } },
      cohort: true,
      tutor: true,
      reviews: { include: { tutor: true }, orderBy: { createdAt: "desc" } },
      notes: { include: { tutor: true }, orderBy: { createdAt: "desc" } },
      milestones: { orderBy: [{ dueDate: "asc" }] },
      hourLogs: { orderBy: { date: "desc" }, take: 10 },
    },
  });
  if (!p) notFound();
  const isStudent = s.role === "STUDENT";
  const st = PROJECT_STATUS[p.status];
  const h = (await hoursByStudent([p.studentId])).get(p.studentId)!;
  const editable = isStudent && ["DRAFT", "CHANGES_REQUESTED"].includes(p.status);

  const sections: [string, string | null][] = [
    ["Problema o necesidad", p.problem],
    ["Objetivos", p.objectives],
    ["Población beneficiaria", p.beneficiaries],
    ["Actividades y calendario", p.activities],
  ];

  return (
    <>
      <div className="mb-2 text-sm">
        <Link href={`/${org}/panel/proyectos`} className="text-slate-500 hover:text-slate-700">
          ← Proyectos
        </Link>
      </div>
      <PageHeader
        title={p.title}
        subtitle={`${p.student.user.name} · ${p.cohort.name}${p.tutor ? ` · Tutor/a: ${p.tutor.name}` : ""}`}
        actions={
          <>
            <Badge tone={st.tone}>{st.label}</Badge>
            {editable && <ButtonLink href={`/${org}/panel/proyectos/${p.id}/editar`}>Editar y enviar</ButtonLink>}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <p className="whitespace-pre-line text-slate-700">{p.summary}</p>
            {p.community && <p className="mt-3 text-sm text-slate-500">📍 {p.community}</p>}
            <dl className="mt-5 space-y-4">
              {sections
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-sm font-semibold text-slate-900">{k}</dt>
                    <dd className="mt-1 whitespace-pre-line text-sm text-slate-700">{v}</dd>
                  </div>
                ))}
            </dl>
          </Card>

          {!isStudent && (
            <Card>
              <h2 className="font-semibold text-slate-900">Revisión del tutor</h2>
              <form action={reviewProject} className="mt-3 space-y-3">
                <input type="hidden" name="org" value={org} />
                <input type="hidden" name="id" value={p.id} />
                <Field label="Comentario para el estudiante" name="comment" textarea required />
                <div className="flex flex-wrap gap-2">
                  {p.status !== "APPROVED" && p.status !== "COMPLETED" && (
                    <ChoiceButton name="decision" value="APPROVED" className={btn}>
                      Aprobar
                    </ChoiceButton>
                  )}
                  <ChoiceButton name="decision" value="CHANGES_REQUESTED" className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:opacity-90">
                    Solicitar cambios
                  </ChoiceButton>
                  {p.status === "APPROVED" && (
                    <ChoiceButton name="decision" value="COMPLETED" className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:opacity-90">
                      Marcar como concluido
                    </ChoiceButton>
                  )}
                  <ChoiceButton name="decision" value="REJECTED" className="rounded-lg border border-rose-300 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50">
                    Rechazar
                  </ChoiceButton>
                </div>
              </form>
            </Card>
          )}

          <Card>
            <h2 className="font-semibold text-slate-900">Historial de revisiones</h2>
            {p.reviews.length === 0 && <p className="mt-2 text-sm text-slate-500">Sin revisiones todavía.</p>}
            <ul className="mt-3 space-y-3">
              {p.reviews.map((r) => (
                <li key={r.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge tone={PROJECT_STATUS[r.decision]?.tone}>{PROJECT_STATUS[r.decision]?.label}</Badge>
                    <span className="text-xs text-slate-500">
                      {r.tutor.name} · {fmtDate(r.createdAt)}
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-line text-slate-700">{r.comment}</p>
                </li>
              ))}
            </ul>
          </Card>

          {!isStudent && (
            <Card>
              <h2 className="font-semibold text-slate-900">Bitácora de seguimiento (privada del tutor)</h2>
              <form action={addTutorNote} className="mt-3 grid gap-3 md:grid-cols-4">
                <input type="hidden" name="org" value={org} />
                <input type="hidden" name="id" value={p.id} />
                <div className="md:col-span-4">
                  <Field label="Nota de avance" name="content" textarea required />
                </div>
                <Select label="Tipo" name="kind" required defaultValue="SEGUIMIENTO" options={Object.entries(NOTE_KIND).map(([value, v]) => ({ value, label: v.label }))} />
                <Field label="Avance %" name="progress" type="number" defaultValue={p.progress} />
                <div className="flex items-end md:col-span-2">
                  <button className={btn}>Guardar nota</button>
                </div>
              </form>
              <ul className="mt-5 space-y-3">
                {p.notes.map((n) => (
                  <li key={n.id} className="border-l-2 border-slate-200 pl-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <Badge tone={NOTE_KIND[n.kind]?.tone}>{NOTE_KIND[n.kind]?.label}</Badge>
                      {n.tutor.name} · {fmtDate(n.createdAt)}
                      {n.progress !== null && <span>· avance {n.progress}%</span>}
                    </div>
                    <p className="mt-1 whitespace-pre-line text-slate-700">{n.content}</p>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <div className="text-sm text-slate-500">Avance del proyecto</div>
            <div className="mt-2">
              <Progress value={p.progress} />
            </div>
            <div className="mt-4 text-sm text-slate-500">Horas validadas del estudiante</div>
            <div className="mt-1 text-2xl font-semibold">
              {Math.round(h.approved)} <span className="text-base font-normal text-slate-500">/ {p.cohort.requiredHours}</span>
            </div>
            <div className="mt-2">
              <Progress value={(h.approved / p.cohort.requiredHours) * 100} />
            </div>
            <div className="mt-4 space-y-1 text-xs text-slate-500">
              <div>Universidad: {p.student.university ? `${p.student.university.name} ${p.student.university.campus ?? ""}` : "—"}</div>
              <div>Enviado: {fmtDate(p.submittedAt)}</div>
              <div>Aprobado: {fmtDate(p.approvedAt)}</div>
            </div>
          </Card>

          <Card>
            <h2 className="font-semibold text-slate-900">Hitos</h2>
            <ul className="mt-3 space-y-2">
              {p.milestones.map((m) => (
                <li key={m.id}>
                  <form action={toggleMilestone} className="flex items-start gap-2 text-sm">
                    <input type="hidden" name="org" value={org} />
                    <input type="hidden" name="milestoneId" value={m.id} />
                    <button className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border ${m.done ? "border-[var(--brand)] bg-[var(--brand)] text-white" : "border-slate-300"}`} aria-label="Marcar hito">
                      {m.done && "✓"}
                    </button>
                    <span className={m.done ? "text-slate-400 line-through" : "text-slate-700"}>
                      {m.title}
                      {m.dueDate && <span className="ml-1 text-xs text-slate-400">({fmtDate(m.dueDate)})</span>}
                    </span>
                  </form>
                </li>
              ))}
            </ul>
            <form action={addMilestone} className="mt-4 space-y-2">
              <input type="hidden" name="org" value={org} />
              <input type="hidden" name="id" value={p.id} />
              <input name="title" required placeholder="Nuevo hito" className={input} />
              <div className="flex gap-2">
                <input name="dueDate" type="date" className={input} />
                <button className={btn}>Agregar</button>
              </div>
            </form>
          </Card>

          <Card>
            <h2 className="font-semibold text-slate-900">Horas recientes</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {p.hourLogs.map((l) => (
                <li key={l.id} className="flex justify-between gap-2">
                  <span className="text-slate-700">
                    {fmtDate(l.date)} · {l.activity}
                  </span>
                  <span className="whitespace-nowrap">
                    {l.hours} h <Badge tone={HOUR_STATUS[l.status].tone}>{HOUR_STATUS[l.status].label}</Badge>
                  </span>
                </li>
              ))}
              {p.hourLogs.length === 0 && <li className="text-slate-500">Sin registros.</li>}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
