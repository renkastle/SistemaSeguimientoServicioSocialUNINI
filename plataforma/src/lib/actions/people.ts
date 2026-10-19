"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hashPassword, requireUser } from "@/lib/auth";
import { date, num, req, str } from "./helpers";

// ---------- Universidades ----------

export async function saveUniversity(form: FormData) {
  const org = req(form, "org");
  const s = await requireUser(org, ["ADMIN"]);
  const id = str(form, "id");
  const data = {
    name: req(form, "name"),
    campus: str(form, "campus"),
    city: str(form, "city"),
    country: req(form, "country"),
    contactName: str(form, "contactName"),
    contactEmail: str(form, "contactEmail"),
  };
  if (id) await db.university.updateMany({ where: { id, organizationId: s.organizationId }, data });
  else await db.university.create({ data: { ...data, organizationId: s.organizationId } });
  revalidatePath(`/${org}/panel/universidades`);
  redirect(`/${org}/panel/universidades`);
}

// ---------- Estudiantes ----------

async function ownCohort(organizationId: string, id: string | null) {
  if (!id) return null;
  const c = await db.cohort.findFirst({ where: { id, organizationId } });
  if (!c) throw new Error("Cohorte inválida");
  return c.id;
}

function studentFields(form: FormData) {
  return {
    universityId: str(form, "universityId"),
    studentNumber: str(form, "studentNumber"),
    career: str(form, "career"),
    semester: num(form, "semester"),
    country: str(form, "country"),
    city: str(form, "city"),
    phone: str(form, "phone"),
    birthDate: date(form, "birthDate"),
    bio: str(form, "bio"),
    emergencyContact: str(form, "emergencyContact"),
  };
}

export async function createStudent(form: FormData) {
  const org = req(form, "org");
  const s = await requireUser(org, ["ADMIN", "TUTOR"]);
  const email = req(form, "email").toLowerCase();
  const cohortId = await ownCohort(s.organizationId, str(form, "cohortId"));
  const user = await db.user.create({
    data: {
      organizationId: s.organizationId,
      email,
      name: req(form, "name"),
      role: "STUDENT",
      passwordHash: await hashPassword(req(form, "password")),
      student: { create: studentFields(form) },
    },
    include: { student: true },
  });
  if (cohortId) {
    await db.cohortMember.create({ data: { cohortId, studentId: user.student!.id } });
  }
  revalidatePath(`/${org}/panel/estudiantes`);
  redirect(`/${org}/panel/estudiantes/${user.student!.id}`);
}

export async function updateStudent(form: FormData) {
  const org = req(form, "org");
  const s = await requireUser(org, ["ADMIN", "TUTOR", "STUDENT"]);
  const id = req(form, "id");
  const profile = await db.studentProfile.findFirst({ where: { id, user: { organizationId: s.organizationId } } });
  if (!profile || (s.role === "STUDENT" && profile.userId !== s.userId)) throw new Error("Sin permiso");
  await db.studentProfile.update({ where: { id }, data: studentFields(form) });
  const name = str(form, "name");
  if (name) await db.user.update({ where: { id: profile.userId }, data: { name } });
  revalidatePath(`/${org}/panel`, "layout");
  redirect(s.role === "STUDENT" ? `/${org}/panel/perfil?ok=1` : `/${org}/panel/estudiantes/${id}`);
}

/**
 * Alta masiva desde CSV con encabezados:
 * nombre,correo,universidad,sede,pais,carrera,matricula,semestre
 * Crea universidades faltantes y asigna a la cohorte elegida.
 */
export async function importStudents(_prev: string | null, form: FormData): Promise<string | null> {
  const org = req(form, "org");
  const s = await requireUser(org, ["ADMIN", "TUTOR"]);
  const csv = req(form, "csv");
  const password = req(form, "password");
  const cohortId = await ownCohort(s.organizationId, str(form, "cohortId"));
  const rows = parseCsv(csv);
  if (rows.length < 2) return "El CSV no tiene filas de datos.";
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (row: string[], name: string) => {
    const i = header.indexOf(name);
    return i >= 0 ? row[i]?.trim() || null : null;
  };
  const passwordHash = await hashPassword(password);
  let created = 0;
  const skipped: string[] = [];
  for (const row of rows.slice(1)) {
    const email = col(row, "correo")?.toLowerCase();
    const name = col(row, "nombre");
    if (!email || !name) continue;
    const exists = await db.user.findUnique({ where: { organizationId_email: { organizationId: s.organizationId, email } } });
    if (exists) {
      skipped.push(email);
      continue;
    }
    let universityId: string | null = null;
    const uniName = col(row, "universidad");
    if (uniName) {
      const campus = col(row, "sede");
      const country = col(row, "pais") ?? "México";
      const uni =
        (await db.university.findFirst({ where: { organizationId: s.organizationId, name: uniName, campus } })) ??
        (await db.university.create({ data: { organizationId: s.organizationId, name: uniName, campus, country } }));
      universityId = uni.id;
    }
    const semester = Number(col(row, "semestre"));
    const user = await db.user.create({
      data: {
        organizationId: s.organizationId,
        email,
        name,
        role: "STUDENT",
        passwordHash,
        student: {
          create: {
            universityId,
            country: col(row, "pais"),
            career: col(row, "carrera"),
            studentNumber: col(row, "matricula"),
            semester: Number.isFinite(semester) && semester > 0 ? semester : null,
          },
        },
      },
      include: { student: true },
    });
    if (cohortId) await db.cohortMember.create({ data: { cohortId, studentId: user.student!.id } });
    created++;
  }
  revalidatePath(`/${org}/panel/estudiantes`);
  return `Se dieron de alta ${created} estudiantes.${skipped.length ? ` Omitidos (ya existían): ${skipped.join(", ")}` : ""}`;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === "," || c === ";") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}

// ---------- Equipo (tutores / administradores) ----------

export async function createStaff(form: FormData) {
  const org = req(form, "org");
  const s = await requireUser(org, ["ADMIN"]);
  const role = req(form, "role");
  if (!["ADMIN", "TUTOR"].includes(role)) throw new Error("Rol inválido");
  await db.user.create({
    data: {
      organizationId: s.organizationId,
      email: req(form, "email").toLowerCase(),
      name: req(form, "name"),
      role,
      passwordHash: await hashPassword(req(form, "password")),
    },
  });
  revalidatePath(`/${org}/panel/usuarios`);
}

export async function toggleUserActive(form: FormData) {
  const org = req(form, "org");
  const s = await requireUser(org, ["ADMIN"]);
  const id = req(form, "id");
  if (id === s.userId) return;
  const user = await db.user.findFirst({ where: { id, organizationId: s.organizationId } });
  if (!user) return;
  await db.user.update({ where: { id }, data: { active: !user.active } });
  revalidatePath(`/${org}/panel`, "layout");
}

export async function resetPassword(form: FormData) {
  const org = req(form, "org");
  const s = await requireUser(org, ["ADMIN", "TUTOR"]);
  const id = req(form, "id");
  const user = await db.user.findFirst({ where: { id, organizationId: s.organizationId } });
  if (!user || (s.role === "TUTOR" && user.role !== "STUDENT")) throw new Error("Sin permiso");
  await db.user.update({ where: { id }, data: { passwordHash: await hashPassword(req(form, "password")) } });
  revalidatePath(`/${org}/panel`, "layout");
}

export async function changeOwnPassword(form: FormData) {
  const org = req(form, "org");
  const s = await requireUser(org);
  await db.user.update({ where: { id: s.userId }, data: { passwordHash: await hashPassword(req(form, "password")) } });
  redirect(`/${org}/panel/perfil?ok=1`);
}
