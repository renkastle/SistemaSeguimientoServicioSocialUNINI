import "server-only";
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { db } from "./db";

export type Role = "ADMIN" | "TUTOR" | "STUDENT";

export type Session = {
  userId: string;
  organizationId: string;
  orgSlug: string;
  role: Role;
  name: string;
};

const COOKIE = "ss_session";
const secret = () => new TextEncoder().encode(process.env.SESSION_SECRET || "dev-secret-change-me");

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(session: Session) {
  const token = await new SignJWT(session)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as Session;
  } catch {
    return null;
  }
}

/** Exige sesión válida dentro de la organización indicada y, opcionalmente, un rol. */
export async function requireUser(orgSlug: string, roles?: Role[]): Promise<Session> {
  const session = await getSession();
  if (!session || session.orgSlug !== orgSlug) redirect(`/${orgSlug}/login`);
  if (roles && !roles.includes(session.role)) notFound();
  return session;
}

export async function getOrg(slug: string) {
  const org = await db.organization.findUnique({ where: { slug } });
  if (!org) notFound();
  return org;
}

/** Proyectos visibles para la sesión: estudiante → los suyos; tutor → los que tutora o de sus cohortes; admin → todos. */
export function projectScope(session: Session) {
  if (session.role === "STUDENT") {
    return { organizationId: session.organizationId, student: { userId: session.userId } };
  }
  if (session.role === "TUTOR") {
    return {
      organizationId: session.organizationId,
      OR: [{ tutorId: session.userId }, { cohort: { tutorId: session.userId } }],
    };
  }
  return { organizationId: session.organizationId };
}
