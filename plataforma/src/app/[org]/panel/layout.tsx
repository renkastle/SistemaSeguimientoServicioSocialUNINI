import Link from "next/link";
import { getOrg, requireUser } from "@/lib/auth";
import { logout } from "@/lib/actions/auth";
import { ROLE_LABEL } from "@/lib/labels";
import { NavLink } from "./nav-link";

type Item = { href: string; label: string; roles: string[] };

const NAV: Item[] = [
  { href: "", label: "Inicio", roles: ["ADMIN", "TUTOR", "STUDENT"] },
  { href: "/proyectos", label: "Proyectos", roles: ["ADMIN", "TUTOR", "STUDENT"] },
  { href: "/horas", label: "Horas", roles: ["ADMIN", "TUTOR", "STUDENT"] },
  { href: "/asistente", label: "Asistente IA", roles: ["STUDENT", "TUTOR", "ADMIN"] },
  { href: "/cohortes", label: "Cohortes", roles: ["ADMIN", "TUTOR"] },
  { href: "/estudiantes", label: "Estudiantes", roles: ["ADMIN", "TUTOR"] },
  { href: "/reportes", label: "Reportes", roles: ["ADMIN", "TUTOR"] },
  { href: "/conocimiento", label: "Base de conocimiento", roles: ["ADMIN", "TUTOR"] },
  { href: "/universidades", label: "Universidades", roles: ["ADMIN"] },
  { href: "/usuarios", label: "Equipo", roles: ["ADMIN"] },
  { href: "/sitio", label: "Sitio web", roles: ["ADMIN"] },
  { href: "/perfil", label: "Mi perfil", roles: ["STUDENT"] },
];

export default async function PanelLayout({ children, params }: { children: React.ReactNode; params: Promise<{ org: string }> }) {
  const { org: slug } = await params;
  const [session, org] = await Promise.all([requireUser(slug), getOrg(slug)]);
  const base = `/${slug}/panel`;
  const items = NAV.filter((i) => i.roles.includes(session.role));

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="no-print border-b border-slate-200 bg-white md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-5 py-4">
          <Link href={`/${slug}`} className="font-semibold text-slate-900">
            {org.shortName || org.name}
          </Link>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible">
          {items.map((i) => (
            <NavLink key={i.href} href={base + i.href} exact={i.href === ""}>
              {i.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden border-t border-slate-200 px-5 py-4 md:absolute md:inset-x-0 md:bottom-0 md:block">
          <div className="text-sm font-medium text-slate-900">{session.name}</div>
          <div className="text-xs text-slate-500">{ROLE_LABEL[session.role]}</div>
          <form action={logout} className="mt-2">
            <input type="hidden" name="org" value={slug} />
            <button className="text-xs text-slate-500 hover:text-rose-600">Cerrar sesión</button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
    </div>
  );
}
