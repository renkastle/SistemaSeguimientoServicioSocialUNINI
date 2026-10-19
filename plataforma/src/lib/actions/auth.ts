"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, destroySession, verifyPassword, type Role } from "@/lib/auth";

export async function login(_prev: string | null, form: FormData): Promise<string | null> {
  const orgSlug = String(form.get("org"));
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const org = await db.organization.findUnique({ where: { slug: orgSlug } });
  if (!org) return "Organización no encontrada";
  const user = await db.user.findUnique({ where: { organizationId_email: { organizationId: org.id, email } } });
  if (!user || !user.active || !(await verifyPassword(password, user.passwordHash))) {
    return "Correo o contraseña incorrectos";
  }
  await createSession({ userId: user.id, organizationId: org.id, orgSlug: org.slug, role: user.role as Role, name: user.name });
  redirect(`/${org.slug}/panel`);
}

export async function logout(form: FormData) {
  await destroySession();
  redirect(`/${String(form.get("org"))}`);
}
