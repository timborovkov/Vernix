import { db } from "@/lib/db";
import { mcpServers } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { getIntegrations } from "@/lib/integrations/catalog";

// ---------------------------------------------------------------------------
// List user's connected integrations
// ---------------------------------------------------------------------------

export async function listConnectedIntegrations(userId: string) {
  const servers = await db
    .select({
      id: mcpServers.id,
      name: mcpServers.name,
      catalogIntegrationId: mcpServers.catalogIntegrationId,
      enabled: mcpServers.enabled,
      createdAt: mcpServers.createdAt,
    })
    .from(mcpServers)
    .where(eq(mcpServers.userId, userId))
    .orderBy(desc(mcpServers.createdAt));

  const catalog = getIntegrations();
  const catalogMap = new Map(catalog.map((i) => [i.id, i]));

  return servers.map((s) => {
    const catalogEntry = s.catalogIntegrationId
      ? catalogMap.get(s.catalogIntegrationId)
      : null;
    return {
      id: s.id,
      name: s.name,
      enabled: s.enabled,
      catalogIntegrationId: s.catalogIntegrationId,
      integrationName: catalogEntry?.name ?? null,
      integrationCategory: catalogEntry?.category ?? null,
      integrationLogo: catalogEntry?.logo ?? null,
      createdAt: s.createdAt,
    };
  });
}
