import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { saveOrganization, savePost } from "@/lib/actions/content";
import { fmtDate } from "@/lib/labels";
import { Badge, Card, Field, PageHeader, btn, input } from "@/components/ui";

export default async function SitePage({ params, searchParams }: { params: Promise<{ org: string }>; searchParams: Promise<{ ok?: string; post?: string }> }) {
  const { org } = await params;
  const { ok, post: postId } = await searchParams;
  const s = await requireUser(org, ["ADMIN"]);
  const [o, posts] = await Promise.all([
    db.organization.findUniqueOrThrow({ where: { id: s.organizationId } }),
    db.post.findMany({ where: { organizationId: s.organizationId }, orderBy: { createdAt: "desc" } }),
  ]);
  const post = posts.find((p) => p.id === postId);
  const stats: { label: string; value: string }[] = JSON.parse(o.statsJson || "[]");

  return (
    <>
      <PageHeader
        title="Sitio web y marca"
        subtitle="Todo el contenido del sitio público sale de aquí. Así cada asociación tiene su propio sitio sin tocar código."
        actions={
          <Link href={`/${org}`} target="_blank" className="text-sm font-medium text-[var(--brand)]">
            Ver sitio ↗
          </Link>
        }
      />
      {ok && <p className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">Cambios guardados.</p>}
      <div className="grid gap-6 xl:grid-cols-3">
        <form action={saveOrganization} className="xl:col-span-2">
          <input type="hidden" name="org" value={org} />
          <Card className="grid gap-4 md:grid-cols-2">
            <h2 className="font-semibold text-slate-900 md:col-span-2">Identidad</h2>
            <Field label="Nombre" name="name" required defaultValue={o.name} />
            <Field label="Nombre corto" name="shortName" defaultValue={o.shortName} />
            <div className="md:col-span-2">
              <Field label="Frase principal" name="tagline" defaultValue={o.tagline} />
            </div>
            <Field label="URL del logo" name="logoUrl" defaultValue={o.logoUrl} />
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Color principal</span>
                <input type="color" name="primaryColor" defaultValue={o.primaryColor} className="h-10 w-full rounded-lg border border-slate-300" />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Color de acento</span>
                <input type="color" name="accentColor" defaultValue={o.accentColor} className="h-10 w-full rounded-lg border border-slate-300" />
              </label>
            </div>

            <h2 className="mt-2 font-semibold text-slate-900 md:col-span-2">Contenido</h2>
            <div className="md:col-span-2">
              <Field label="¿Quiénes somos?" name="about" textarea rows={6} defaultValue={o.about} />
            </div>
            <Field label="Misión (un punto por línea)" name="mission" textarea rows={5} defaultValue={o.mission} />
            <Field label="Visión" name="vision" textarea rows={5} defaultValue={o.vision} />
            <div className="md:col-span-2">
              <Field label="Transparencia" name="transparency" textarea defaultValue={o.transparency} />
            </div>
            <div className="md:col-span-2">
              <Field
                label="Cifras destacadas (valor | etiqueta, una por línea)"
                name="stats"
                textarea
                defaultValue={stats.map((x) => `${x.value} | ${x.label}`).join("\n")}
                hint="Se muestran junto con las cifras en vivo de la plataforma (estudiantes, proyectos, horas)."
              />
            </div>

            <h2 className="mt-2 font-semibold text-slate-900 md:col-span-2">Contacto y redes</h2>
            <Field label="Correo de contacto" name="contactEmail" type="email" defaultValue={o.contactEmail} />
            <Field label="Sitio web" name="website" defaultValue={o.website} />
            <Field label="Facebook" name="facebookUrl" defaultValue={o.facebookUrl} />
            <Field label="Instagram" name="instagramUrl" defaultValue={o.instagramUrl} />
            <Field label="X / Twitter" name="xUrl" defaultValue={o.xUrl} />
            <Field label="YouTube" name="youtubeUrl" defaultValue={o.youtubeUrl} />

            <h2 className="mt-2 font-semibold text-slate-900 md:col-span-2">Asistente IA</h2>
            <div className="md:col-span-2">
              <Field
                label="Indicaciones adicionales para el asistente"
                name="agentPrompt"
                textarea
                rows={4}
                defaultValue={o.agentPrompt}
                hint="Ej.: tono, temas prioritarios, a quién canalizar dudas administrativas."
              />
            </div>
            <div>
              <button className={btn}>Guardar</button>
            </div>
          </Card>
        </form>

        <div className="space-y-4">
          <Card>
            <h2 className="font-semibold text-slate-900">Blog</h2>
            <ul className="mt-3 space-y-2">
              {posts.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                  <a href={`?post=${p.id}`} className="hover:text-[var(--brand)]">
                    {p.title}
                  </a>
                  <span className="whitespace-nowrap text-xs text-slate-500">
                    {!p.published && <Badge>borrador</Badge>} {fmtDate(p.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
          <form action={savePost} key={post?.id ?? "new"}>
            <input type="hidden" name="org" value={org} />
            {post && <input type="hidden" name="id" value={post.id} />}
            <Card className="space-y-3">
              <h2 className="font-semibold text-slate-900">{post ? "Editar entrada" : "Nueva entrada"}</h2>
              <Field label="Título" name="title" required defaultValue={post?.title} />
              <Field label="Resumen" name="excerpt" defaultValue={post?.excerpt} />
              <Field label="Contenido" name="content" textarea rows={8} required defaultValue={post?.content} hint="Admite **negritas**, listas con - y [enlaces](https://...)." />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="published" defaultChecked={post?.published ?? true} /> Publicada
              </label>
              <input type="hidden" name="slug" value={post?.slug ?? ""} className={input} />
              <button className={btn}>Guardar entrada</button>
            </Card>
          </form>
        </div>
      </div>
    </>
  );
}
