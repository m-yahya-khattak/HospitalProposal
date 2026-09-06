import { Studio } from "@/components/control/studio";

export default async function ControlProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <Studio slug={slug} />;
}
