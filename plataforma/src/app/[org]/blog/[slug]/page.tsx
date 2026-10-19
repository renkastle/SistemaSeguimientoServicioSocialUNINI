import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getOrg } from "@/lib/auth";
import { SiteFooter, SiteHeader } from "@/components/site";
import { Markdown } from "@/components/markdown";
import { fmtDate } from "@/lib/labels";

export default async function PostPage({ params }: { params: Promise<{ org: string; slug: string }> }) {
  const { org: slug, slug: postSlug } = await params;
  const org = await getOrg(slug);
  const post = await db.post.findUnique({ where: { organizationId_slug: { organizationId: org.id, slug: postSlug } } });
  if (!post || !post.published) notFound();
  return (
    <>
      <SiteHeader org={org} />
      <article className="mx-auto max-w-3xl px-4 py-16">
        <div className="text-sm text-slate-500">{fmtDate(post.createdAt)}</div>
        <h1 className="mt-2 text-4xl font-bold text-slate-900">{post.title}</h1>
        <div className="prose-lite mt-8 text-lg leading-relaxed text-slate-700">
          <Markdown text={post.content} />
        </div>
      </article>
      <SiteFooter org={org} />
    </>
  );
}
