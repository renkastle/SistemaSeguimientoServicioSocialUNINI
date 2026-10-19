import Link from "next/link";
import { db } from "@/lib/db";
import { getOrg } from "@/lib/auth";
import { SiteFooter, SiteHeader } from "@/components/site";
import { fmtDate } from "@/lib/labels";

export default async function PublicHome({ params }: { params: Promise<{ org: string }> }) {
  const org = await getOrg((await params).org);
  const [posts, students, projects, hours] = await Promise.all([
    db.post.findMany({ where: { organizationId: org.id, published: true }, orderBy: { createdAt: "desc" }, take: 3 }),
    db.user.count({ where: { organizationId: org.id, role: "STUDENT", active: true } }),
    db.project.count({ where: { organizationId: org.id, status: { in: ["APPROVED", "COMPLETED"] } } }),
    db.hourLog.aggregate({ where: { status: "APPROVED", student: { user: { organizationId: org.id } } }, _sum: { hours: true } }),
  ]);
  const stats: { label: string; value: string }[] = JSON.parse(org.statsJson || "[]");
  const liveStats = [
    { label: "estudiantes en servicio social", value: String(students) },
    { label: "proyectos comunitarios", value: String(projects) },
    { label: "horas de servicio validadas", value: Math.round(hours._sum.hours ?? 0).toLocaleString("es-MX") },
  ];
  const lines = (s?: string | null) => (s ?? "").split("\n").map((l) => l.replace(/^[•\-\s]+/, "").trim()).filter(Boolean);

  return (
    <>
      <SiteHeader org={org} />
      <main>
        <section className="relative overflow-hidden bg-[var(--brand)] text-white">
          <div className="absolute inset-0 opacity-20" style={{ background: "radial-gradient(circle at 80% 20%, var(--accent), transparent 50%)" }} />
          <div className="relative mx-auto max-w-6xl px-4 py-20 md:py-28">
            <p className="text-sm font-medium uppercase tracking-widest text-white/80">Asociación civil sin fines de lucro</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-bold leading-tight md:text-5xl">{org.name}</h1>
            {org.tagline && <p className="mt-5 max-w-2xl text-lg text-white/90">{org.tagline}</p>}
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#servicio-social" className="rounded-lg bg-white px-5 py-3 font-medium text-[var(--brand)] hover:bg-white/90">
                Haz tu servicio social con nosotros
              </a>
              <a href="#nosotros" className="rounded-lg border border-white/40 px-5 py-3 font-medium hover:bg-white/10">
                Conócenos
              </a>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-10 md:grid-cols-3 lg:grid-cols-6">
            {[...stats, ...liveStats].map((s) => (
              <div key={s.label}>
                <div className="text-3xl font-bold text-[var(--brand)]">{s.value}</div>
                <div className="text-sm text-slate-600">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        <section id="nosotros" className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-3xl font-bold text-slate-900">¿Quiénes somos?</h2>
          <p className="mt-4 max-w-3xl whitespace-pre-line text-slate-700">{org.about}</p>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h3 className="text-xl font-semibold text-[var(--brand)]">Misión</h3>
              <ul className="mt-3 space-y-2 text-slate-700">
                {lines(org.mission).map((l) => (
                  <li key={l} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                    {l}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h3 className="text-xl font-semibold text-[var(--brand)]">Visión</h3>
              <p className="mt-3 text-slate-700">{org.vision}</p>
            </div>
          </div>
          {org.transparency && (
            <div className="mt-6 rounded-2xl border-l-4 border-[var(--accent)] bg-amber-50 p-6">
              <h3 className="font-semibold text-slate-900">Transparencia</h3>
              <p className="mt-2 text-sm text-slate-700">{org.transparency}</p>
            </div>
          )}
        </section>

        <section id="servicio-social" className="bg-white py-16">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-3xl font-bold text-slate-900">Servicio social con impacto</h2>
            <p className="mt-3 max-w-3xl text-slate-600">
              Estudiantes de universidades de México y otros países realizan su servicio social diseñando y ejecutando proyectos
              comunitarios, acompañados por tutores de la fundación.
            </p>
            <div className="mt-10 grid gap-6 md:grid-cols-4">
              {[
                ["1", "Regístrate", "Te damos de alta con tu universidad, sede y país."],
                ["2", "Únete a una cohorte", "Trabajas junto a otros estudiantes con un tutor asignado."],
                ["3", "Propón tu proyecto", "Diseñas tu proyecto y tu tutor lo revisa y aprueba."],
                ["4", "Registra tu avance", "Bitácora de horas, hitos y retroalimentación hasta tu constancia."],
              ].map(([n, t, d]) => (
                <div key={n} className="rounded-2xl bg-slate-50 p-6 ring-1 ring-slate-200">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-[var(--brand)] font-bold text-white">{n}</div>
                  <div className="mt-4 font-semibold text-slate-900">{t}</div>
                  <p className="mt-1 text-sm text-slate-600">{d}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={`/${org.slug}/login`} className="rounded-lg bg-[var(--brand)] px-5 py-3 font-medium text-white hover:opacity-90">
                Entrar a la plataforma
              </Link>
              {org.contactEmail && (
                <a href={`mailto:${org.contactEmail}?subject=Servicio%20social`} className="rounded-lg border border-slate-300 px-5 py-3 font-medium text-slate-700 hover:bg-slate-50">
                  Solicitar información
                </a>
              )}
            </div>
          </div>
        </section>

        {org.youtubeUrl && (
          <section className="mx-auto max-w-6xl px-4 py-16">
            <div className="flex flex-col items-start justify-between gap-6 rounded-2xl bg-slate-900 p-8 text-white md:flex-row md:items-center">
              <div>
                <h2 className="text-2xl font-bold">Aprende con videos</h2>
                <p className="mt-2 max-w-2xl text-slate-300">
                  Contenido semanal sobre alimentación y estilos de vida saludable para compartir con tu comunidad escolar.
                </p>
              </div>
              <a href={org.youtubeUrl} target="_blank" rel="noreferrer" className="rounded-lg bg-[var(--accent)] px-5 py-3 font-medium text-slate-900">
                Suscríbete
              </a>
            </div>
          </section>
        )}

        <section id="blog" className="mx-auto max-w-6xl px-4 pb-16">
          <h2 className="text-3xl font-bold text-slate-900">Blog</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {posts.map((p) => (
              <Link key={p.id} href={`/${org.slug}/blog/${p.slug}`} className="group rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 hover:ring-[var(--brand)]">
                <div className="text-xs text-slate-500">{fmtDate(p.createdAt)}</div>
                <div className="mt-2 font-semibold text-slate-900 group-hover:text-[var(--brand)]">{p.title}</div>
                <p className="mt-2 text-sm text-slate-600">{p.excerpt}</p>
              </Link>
            ))}
            {posts.length === 0 && <p className="text-slate-500">Próximamente.</p>}
          </div>
        </section>
      </main>
      <SiteFooter org={org} />
    </>
  );
}
