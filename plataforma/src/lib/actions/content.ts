"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { req, str } from "./helpers";

// ---------- Base de conocimiento ----------

export async function saveKnowledgeDoc(form: FormData) {
  const org = req(form, "org");
  const s = await requireUser(org, ["ADMIN", "TUTOR"]);
  const id = str(form, "id");
  const data = {
    title: req(form, "title"),
    category: str(form, "category") ?? "General",
    content: req(form, "content"),
    sourceUrl: str(form, "sourceUrl"),
  };
  if (id) await db.knowledgeDoc.updateMany({ where: { id, organizationId: s.organizationId }, data });
  else await db.knowledgeDoc.create({ data: { ...data, organizationId: s.organizationId } });
  revalidatePath(`/${org}/panel/conocimiento`);
  redirect(`/${org}/panel/conocimiento`);
}

export async function deleteKnowledgeDoc(form: FormData) {
  const org = req(form, "org");
  const s = await requireUser(org, ["ADMIN", "TUTOR"]);
  await db.knowledgeDoc.deleteMany({ where: { id: req(form, "id"), organizationId: s.organizationId } });
  revalidatePath(`/${org}/panel/conocimiento`);
  redirect(`/${org}/panel/conocimiento`);
}

// ---------- Sitio web / organización ----------

export async function saveOrganization(form: FormData) {
  const org = req(form, "org");
  const s = await requireUser(org, ["ADMIN"]);
  const statsJson = (str(form, "stats") ?? "")
    .split("\n")
    .map((l) => l.split("|").map((x) => x.trim()))
    .filter(([v, l]) => v && l)
    .map(([value, label]) => ({ value, label }));
  await db.organization.update({
    where: { id: s.organizationId },
    data: {
      name: req(form, "name"),
      shortName: str(form, "shortName"),
      tagline: str(form, "tagline"),
      about: str(form, "about"),
      mission: str(form, "mission"),
      vision: str(form, "vision"),
      transparency: str(form, "transparency"),
      logoUrl: str(form, "logoUrl"),
      primaryColor: str(form, "primaryColor") ?? "#0f766e",
      accentColor: str(form, "accentColor") ?? "#f59e0b",
      contactEmail: str(form, "contactEmail"),
      website: str(form, "website"),
      facebookUrl: str(form, "facebookUrl"),
      instagramUrl: str(form, "instagramUrl"),
      xUrl: str(form, "xUrl"),
      youtubeUrl: str(form, "youtubeUrl"),
      agentPrompt: str(form, "agentPrompt"),
      statsJson: JSON.stringify(statsJson),
    },
  });
  revalidatePath(`/${org}`, "layout");
  redirect(`/${org}/panel/sitio?ok=1`);
}

export async function savePost(form: FormData) {
  const org = req(form, "org");
  const s = await requireUser(org, ["ADMIN"]);
  const id = str(form, "id");
  const title = req(form, "title");
  const slug =
    str(form, "slug") ??
    title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  const data = { title, slug, excerpt: str(form, "excerpt"), content: req(form, "content"), published: form.get("published") === "on" };
  if (id) await db.post.updateMany({ where: { id, organizationId: s.organizationId }, data });
  else await db.post.create({ data: { ...data, organizationId: s.organizationId } });
  revalidatePath(`/${org}`, "layout");
  redirect(`/${org}/panel/sitio`);
}

export async function saveAnnouncement(form: FormData) {
  const org = req(form, "org");
  const s = await requireUser(org, ["ADMIN", "TUTOR"]);
  await db.announcement.create({
    data: { organizationId: s.organizationId, title: req(form, "title"), body: req(form, "body"), audience: str(form, "audience") ?? "ALL" },
  });
  revalidatePath(`/${org}/panel`);
}
