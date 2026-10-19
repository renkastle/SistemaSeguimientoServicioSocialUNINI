"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { projectScope, requireUser, type Session } from "@/lib/auth";
import { date, num, req, str } from "./helpers";

async function scopedProject(s: Session, id: string) {
  const project = await db.project.findFirst({ where: { id, ...projectScope(s) } });
  if (!project) throw new Error("Proyecto no encontrado");
  return project;
}

// ---------- Cohortes ----------

export async function saveCohort(form: FormData) {
  const org = req(form, "org");
  const s = await requireUser(org, ["ADMIN", "TUTOR"]);
  const id = str(form, "id");
  const data = {
    name: req(form, "name"),
    description: str(form, "description"),
    startDate: date(form, "startDate")!,
    endDate: date(form, "endDate")!,
    requiredHours: num(form, "requiredHours") ?? 480,
    status: str(form, "status") ?? "ACTIVE",
    tutorId: str(form, "tutorId") ?? (s.role === "TUTOR" ? s.userId : null),
  };
  if (data.tutorId && !(await db.user.findFirst({ where: { id: data.tutorId, organizationId: s.organizationId, role: { in: ["TUTOR", "ADMIN"] } } }))) {
    throw new Error("Tutor inválido");
  }
  let cohortId = id;
  if (id) await db.cohort.updateMany({ where: { id, organizationId: s.organizationId }, data });
  else cohortId = (await db.cohort.create({ data: { ...data, organizationId: s.organizationId } })).id;
  revalidatePath(`/${org}/panel/cohortes`);
  redirect(`/${org}/panel/cohortes/${cohortId}`);
}

export async function addCohortMembers(form: FormData) {
  const org = req(form, "org");
  const s = await requireUser(org, ["ADMIN", "TUTOR"]);
  const cohortId = req(form, "cohortId");
  const cohort = await db.cohort.findFirst({ where: { id: cohortId, organizationId: s.organizationId } });
  if (!cohort) throw new Error("Cohorte no encontrada");
  const ids = form.getAll("studentIds").map(String);
  const valid = await db.studentProfile.findMany({ where: { id: { in: ids }, user: { organizationId: s.organizationId } }, select: { id: true } });
  for (const { id } of valid) {
    await db.cohortMember.upsert({
      where: { cohortId_studentId: { cohortId, studentId: id } },
      create: { cohortId, studentId: id },
      update: { status: "ACTIVE" },
    });
  }
  revalidatePath(`/${org}/panel/cohortes/${cohortId}`);
}

export async function setMemberStatus(form: FormData) {
  const org = req(form, "org");
  const s = await requireUser(org, ["ADMIN", "TUTOR"]);
  const id = req(form, "id");
  const member = await db.cohortMember.findFirst({ where: { id, cohort: { organizationId: s.organizationId } } });
  if (!member) return;
  await db.cohortMember.update({ where: { id }, data: { status: req(form, "status") } });
  revalidatePath(`/${org}/panel/cohortes/${member.cohortId}`);
}

// ---------- Proyectos ----------

function projectFields(form: FormData) {
  return {
    title: req(form, "title"),
    summary: req(form, "summary"),
    problem: str(form, "problem"),
    objectives: str(form, "objectives"),
    beneficiaries: str(form, "beneficiaries"),
    activities: str(form, "activities"),
    community: str(form, "community"),
  };
}

export async function createProject(form: FormData) {
  const org = req(form, "org");
  const s = await requireUser(org, ["STUDENT"]);
  const cohortId = req(form, "cohortId");
  const member = await db.cohortMember.findFirst({
    where: { cohortId, student: { userId: s.userId }, cohort: { organizationId: s.organizationId } },
    include: { cohort: true },
  });
  if (!member) throw new Error("No perteneces a esa cohorte");
  const project = await db.project.create({
    data: {
      ...projectFields(form),
      organizationId: s.organizationId,
      cohortId,
      studentId: member.studentId,
      tutorId: member.cohort.tutorId,
      status: form.get("submit") ? "SUBMITTED" : "DRAFT",
      submittedAt: form.get("submit") ? new Date() : null,
    },
  });
  revalidatePath(`/${org}/panel/proyectos`);
  redirect(`/${org}/panel/proyectos/${project.id}`);
}

export async function updateProject(form: FormData) {
  const org = req(form, "org");
  const s = await requireUser(org, ["STUDENT"]);
  const project = await scopedProject(s, req(form, "id"));
  if (!["DRAFT", "CHANGES_REQUESTED"].includes(project.status)) throw new Error("El proyecto ya no se puede editar");
  const submit = !!form.get("submit");
  await db.project.update({
    where: { id: project.id },
    data: { ...projectFields(form), ...(submit ? { status: "SUBMITTED", submittedAt: new Date() } : {}) },
  });
  revalidatePath(`/${org}/panel/proyectos`);
  redirect(`/${org}/panel/proyectos/${project.id}`);
}

export async function reviewProject(form: FormData) {
  const org = req(form, "org");
  const s = await requireUser(org, ["ADMIN", "TUTOR"]);
  const project = await scopedProject(s, req(form, "id"));
  const decision = req(form, "decision");
  if (!["APPROVED", "CHANGES_REQUESTED", "REJECTED", "COMPLETED"].includes(decision)) throw new Error("Decisión inválida");
  await db.$transaction([
    db.projectReview.create({ data: { projectId: project.id, tutorId: s.userId, decision, comment: req(form, "comment") } }),
    db.project.update({
      where: { id: project.id },
      data: {
        status: decision,
        tutorId: project.tutorId ?? s.userId,
        ...(decision === "APPROVED" ? { approvedAt: new Date() } : {}),
        ...(decision === "COMPLETED" ? { progress: 100 } : {}),
      },
    }),
  ]);
  revalidatePath(`/${org}/panel/proyectos/${project.id}`);
}

export async function addTutorNote(form: FormData) {
  const org = req(form, "org");
  const s = await requireUser(org, ["ADMIN", "TUTOR"]);
  const project = await scopedProject(s, req(form, "id"));
  const progress = num(form, "progress");
  await db.tutorNote.create({
    data: { projectId: project.id, tutorId: s.userId, content: req(form, "content"), kind: str(form, "kind") ?? "SEGUIMIENTO", progress },
  });
  if (progress !== null) await db.project.update({ where: { id: project.id }, data: { progress: Math.max(0, Math.min(100, progress)) } });
  revalidatePath(`/${org}/panel/proyectos/${project.id}`);
}

export async function addMilestone(form: FormData) {
  const org = req(form, "org");
  const s = await requireUser(org);
  const project = await scopedProject(s, req(form, "id"));
  await db.milestone.create({ data: { projectId: project.id, title: req(form, "title"), dueDate: date(form, "dueDate") } });
  revalidatePath(`/${org}/panel/proyectos/${project.id}`);
}

export async function toggleMilestone(form: FormData) {
  const org = req(form, "org");
  const s = await requireUser(org);
  const m = await db.milestone.findUnique({ where: { id: req(form, "milestoneId") } });
  if (!m) return;
  await scopedProject(s, m.projectId);
  await db.milestone.update({ where: { id: m.id }, data: { done: !m.done, doneAt: m.done ? null : new Date() } });
  revalidatePath(`/${org}/panel/proyectos/${m.projectId}`);
}

// ---------- Horas ----------

export async function logHours(form: FormData) {
  const org = req(form, "org");
  const s = await requireUser(org, ["STUDENT"]);
  const student = await db.studentProfile.findUnique({ where: { userId: s.userId } });
  if (!student) throw new Error("Perfil no encontrado");
  const projectId = str(form, "projectId");
  if (projectId) await scopedProject(s, projectId);
  const hours = num(form, "hours");
  if (!hours || hours <= 0 || hours > 24) throw new Error("Horas inválidas");
  await db.hourLog.create({
    data: {
      studentId: student.id,
      projectId,
      date: date(form, "date") ?? new Date(),
      hours,
      activity: req(form, "activity"),
      evidenceUrl: str(form, "evidenceUrl"),
    },
  });
  revalidatePath(`/${org}/panel/horas`);
}

export async function reviewHours(form: FormData) {
  const org = req(form, "org");
  const s = await requireUser(org, ["ADMIN", "TUTOR"]);
  const status = req(form, "status");
  if (!["APPROVED", "REJECTED", "PENDING"].includes(status)) throw new Error("Estado inválido");
  const ids = form.getAll("ids").map(String);
  const scope =
    s.role === "TUTOR"
      ? { student: { user: { organizationId: s.organizationId }, memberships: { some: { cohort: { tutorId: s.userId } } } } }
      : { student: { user: { organizationId: s.organizationId } } };
  await db.hourLog.updateMany({ where: { id: { in: ids }, ...scope }, data: { status } });
  revalidatePath(`/${org}/panel/horas`);
}
