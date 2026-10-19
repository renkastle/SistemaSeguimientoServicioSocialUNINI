import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { deleteKnowledgeDoc, saveKnowledgeDoc } from "@/lib/actions/content";
import { fmtDate } from "@/lib/labels";
import { Badge, Card, Field, PageHeader, btn } from "@/components/ui";

export default async function KnowledgePage({ params, searchParams }: { params: Promise<{ org: string }>; searchParams: Promise<{ edit?: string }> }) {
  const { org } = await params;
  const { edit } = await searchParams;
  const s = await requireUser(org, ["ADMIN", "TUTOR"]);
  const docs = await db.knowledgeDoc.findMany({ where: { organizationId: s.organizationId }, orderBy: [{ category: "asc" }, { title: "asc" }] });
  const current = docs.find((d) => d.id === edit);
  const categories = [...new Set(docs.map((d) => d.category))];

  return (
    <>
      <PageHeader title="Base de conocimiento" subtitle="Documentos que el asistente IA consulta para responder a estudiantes y tutores." />
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-2">
          {categories.map((cat) => (
            <div key={cat}>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">{cat}</h2>
              <ul className="space-y-2">
                {docs
                  .filter((d) => d.category === cat)
                  .map((d) => (
                    <li key={d.id}>
                      <a href={`?edit=${d.id}`} className={`block rounded-lg border bg-white p-3 hover:border-[var(--brand)] ${d.id === edit ? "border-[var(--brand)]" : "border-slate-200"}`}>
                        <div className="text-sm font-medium text-slate-900">{d.title}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {d.content.length.toLocaleString("es-MX")} caracteres · actualizado {fmtDate(d.updatedAt)}
                        </div>
                      </a>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="lg:col-span-3">
          <form action={saveKnowledgeDoc} key={current?.id ?? "new"}>
            <input type="hidden" name="org" value={org} />
            {current && <input type="hidden" name="id" value={current.id} />}
            <Card className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-slate-900">{current ? "Editar documento" : "Nuevo documento"}</h2>
                {current && (
                  <a href="?" className="text-sm text-[var(--brand)]">
                    + Nuevo
                  </a>
                )}
              </div>
              <Field label="Título" name="title" required defaultValue={current?.title} />
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Categoría" name="category" defaultValue={current?.category ?? "General"} hint={categories.length ? `Existentes: ${categories.join(", ")}` : undefined} />
                <Field label="Enlace de la fuente (opcional)" name="sourceUrl" type="url" defaultValue={current?.sourceUrl} />
              </div>
              <Field label="Contenido" name="content" textarea rows={16} required defaultValue={current?.content} hint="Pega el texto del documento. Separa secciones con líneas en blanco para mejores resultados de búsqueda." />
              <div className="flex items-center gap-3">
                <button className={btn}>Guardar</button>
                {current && <Badge tone="blue">El asistente usará la versión guardada</Badge>}
              </div>
            </Card>
          </form>
          {current && (
            <form action={deleteKnowledgeDoc} className="mt-3">
              <input type="hidden" name="org" value={org} />
              <input type="hidden" name="id" value={current.id} />
              <button className="text-sm text-rose-600 hover:underline">Eliminar documento</button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
