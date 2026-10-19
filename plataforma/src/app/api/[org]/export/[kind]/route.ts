import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, projectScope } from "@/lib/auth";
import { hoursByStudent } from "@/lib/stats";

function csv(rows: (string | number | null | undefined)[][]) {
  const esc = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + rows.map((r) => r.map(esc).join(",")).join("\n");
}

export async function GET(req: Request, { params }: { params: Promise<{ org: string; kind: string }> }) {
  const { org, kind } = await params;
  const s = await getSession();
  if (!s || s.orgSlug !== org || s.role === "STUDENT") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  let rows: (string | number | null | undefined)[][];
  if (kind === "estudiantes") {
    const students = await db.studentProfile.findMany({
      where: {
        user: { organizationId: s.organizationId },
        ...(s.role === "TUTOR" ? { memberships: { some: { cohort: { tutorId: s.userId } } } } : {}),
      },
      include: { user: true, university: true, memberships: { include: { cohort: true } } },
    });
    const hours = await hoursByStudent(students.map((x) => x.id));
    rows = [
      ["nombre", "correo", "universidad", "sede", "pais_universidad", "pais_residencia", "carrera", "matricula", "semestre", "cohortes", "horas_validadas", "horas_pendientes"],
      ...students.map((st) => [
        st.user.name,
        st.user.email,
        st.university?.name,
        st.university?.campus,
        st.university?.country,
        st.country,
        st.career,
        st.studentNumber,
        st.semester,
        st.memberships.map((m) => m.cohort.name).join(" | "),
        hours.get(st.id)!.approved,
        hours.get(st.id)!.pending,
      ]),
    ];
  } else if (kind === "proyectos") {
    const cohorte = new URL(req.url).searchParams.get("cohorte");
    const projects = await db.project.findMany({
      where: { ...projectScope(s), ...(cohorte ? { cohortId: cohorte } : {}) },
      include: { student: { include: { user: true, university: true } }, cohort: true, tutor: true, milestones: true, notes: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
    const hours = await hoursByStudent([...new Set(projects.map((p) => p.studentId))]);
    rows = [
      ["proyecto", "estudiante", "universidad", "cohorte", "tutor", "estado", "avance_pct", "hitos_completados", "hitos_totales", "horas_validadas", "horas_requeridas", "comunidad", "ultima_nota"],
      ...projects.map((p) => [
        p.title,
        p.student.user.name,
        p.student.university?.name,
        p.cohort.name,
        p.tutor?.name,
        p.status,
        p.progress,
        p.milestones.filter((m) => m.done).length,
        p.milestones.length,
        hours.get(p.studentId)!.approved,
        p.cohort.requiredHours,
        p.community,
        p.notes[0]?.content,
      ]),
    ];
  } else {
    return NextResponse.json({ error: "Tipo desconocido" }, { status: 404 });
  }

  return new Response(csv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${kind}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
