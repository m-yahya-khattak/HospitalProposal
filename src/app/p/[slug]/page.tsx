import { Proposal } from "@/components/display/proposal";

export default async function PublicProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <Proposal slug={slug} />;
}
