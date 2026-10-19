import Link from "next/link";
import type { Organization } from "@prisma/client";

export function SiteHeader({ org }: { org: Organization }) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href={`/${org.slug}`} className="flex items-center gap-2 font-semibold text-slate-900">
          {org.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={org.logoUrl} alt="" className="h-9 w-auto" />
          ) : (
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--brand)] text-white">
              {(org.shortName || org.name).slice(0, 1)}
            </span>
          )}
          <span className="hidden sm:inline">{org.shortName || org.name}</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <a href={`/${org.slug}#nosotros`} className="hidden rounded-md px-3 py-2 text-slate-600 hover:bg-slate-100 md:inline">Nosotros</a>
          <a href={`/${org.slug}#servicio-social`} className="hidden rounded-md px-3 py-2 text-slate-600 hover:bg-slate-100 md:inline">Servicio social</a>
          <a href={`/${org.slug}#blog`} className="hidden rounded-md px-3 py-2 text-slate-600 hover:bg-slate-100 md:inline">Blog</a>
          <a href={`/${org.slug}#contacto`} className="hidden rounded-md px-3 py-2 text-slate-600 hover:bg-slate-100 md:inline">Contacto</a>
          <Link href={`/${org.slug}/login`} className="ml-2 rounded-lg bg-[var(--brand)] px-4 py-2 font-medium text-white hover:opacity-90">
            Ingresar
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter({ org }: { org: Organization }) {
  const social = [
    ["Facebook", org.facebookUrl],
    ["Instagram", org.instagramUrl],
    ["X", org.xUrl],
    ["YouTube", org.youtubeUrl],
  ].filter(([, url]) => url) as [string, string][];
  return (
    <footer id="contacto" className="border-t border-slate-200 bg-slate-900 text-slate-300">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-3">
        <div>
          <div className="text-lg font-semibold text-white">{org.name}</div>
          {org.tagline && <p className="mt-2 text-sm">{org.tagline}</p>}
        </div>
        <div className="text-sm">
          <div className="font-medium text-white">Contacto</div>
          {org.contactEmail && (
            <a href={`mailto:${org.contactEmail}`} className="mt-2 block hover:text-white">
              {org.contactEmail}
            </a>
          )}
          {org.website && (
            <a href={org.website} className="mt-1 block hover:text-white">
              {org.website.replace(/^https?:\/\//, "")}
            </a>
          )}
        </div>
        <div className="text-sm">
          <div className="font-medium text-white">Síguenos</div>
          <div className="mt-2 flex flex-wrap gap-3">
            {social.map(([label, url]) => (
              <a key={label} href={url} target="_blank" rel="noreferrer" className="hover:text-white">
                {label}
              </a>
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-slate-800 py-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} {org.name}
      </div>
    </footer>
  );
}
