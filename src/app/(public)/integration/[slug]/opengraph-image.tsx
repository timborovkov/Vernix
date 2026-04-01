import { generateOgImage, ogImageConfig } from "@/lib/og";
import { getIntegrations } from "@/lib/integrations/catalog";

export const { size, contentType } = ogImageConfig;

export async function generateStaticParams() {
  return getIntegrations().map((i) => ({ slug: i.id }));
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const integration = getIntegrations().find((i) => i.id === slug);
  if (!integration) {
    return generateOgImage(
      "Vernix Integration",
      "Connect your tools to video calls."
    );
  }

  return generateOgImage(
    `Vernix + ${integration.name}`,
    integration.description
  );
}
