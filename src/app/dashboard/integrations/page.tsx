"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useMcpServers } from "@/hooks/use-mcp-servers";
import { useBilling } from "@/hooks/use-billing";
import { IntegrationCard } from "@/components/integration-card";
import { ConnectedServerCard } from "@/components/connected-server-card";
import { IntegrationConnectDialog } from "@/components/integration-connect-dialog";
import {
  UpgradeDialog,
  type PaywallTrigger,
} from "@/components/upgrade-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Plug, Plus } from "lucide-react";
import {
  getIntegrations,
  CATEGORIES,
  type Integration,
  type IntegrationCategory,
} from "@/lib/integrations/catalog";

export default function IntegrationsPage() {
  const {
    servers,
    addServer,
    deleteServer,
    toggleServer,
    testServer,
    startOAuth,
    oauthLoading,
  } = useMcpServers();
  const { billing, loading: billingLoading } = useBilling();
  const searchParams = useSearchParams();

  // Handle OAuth callback results (run once)
  const handledParams = useRef(false);
  useEffect(() => {
    if (handledParams.current) return;
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
    if (connected) {
      handledParams.current = true;
      toast.success(`Connected to ${connected}`);
      window.history.replaceState({}, "", "/dashboard/integrations");
    } else if (error) {
      handledParams.current = true;
      toast.error(`Connection failed: ${error}`);
      window.history.replaceState({}, "", "/dashboard/integrations");
    }
  }, [searchParams]);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<
    IntegrationCategory | "all"
  >("all");
  const [connectingIntegration, setConnectingIntegration] =
    useState<Integration | null>(null);
  const [paywallTrigger, setPaywallTrigger] = useState<PaywallTrigger | null>(
    null
  );

  const integrations = getIntegrations();
  // Default to true while billing loads so Pro users don't see a flash of disabled buttons
  const mcpEnabled = billingLoading
    ? true
    : (billing?.limits.mcpEnabled ?? false);

  // Match connected servers to catalog entries by catalogIntegrationId first, then name/URL fallback
  const connectedIds = new Set(
    servers
      .filter((s) => s.enabled)
      .map((s) => {
        if (s.catalogIntegrationId) return s.catalogIntegrationId;
        const match = integrations.find(
          (i) =>
            s.name.toLowerCase() === i.name.toLowerCase() ||
            s.url.toLowerCase().includes(i.id)
        );
        return match?.id;
      })
      .filter(Boolean) as string[]
  );

  // Custom servers: no catalogIntegrationId, or catalog match not found
  const customServers = servers.filter((s) => {
    if (s.catalogIntegrationId) {
      return !integrations.some((i) => i.id === s.catalogIntegrationId);
    }
    return !integrations.some(
      (i) =>
        s.name.toLowerCase() === i.name.toLowerCase() ||
        s.url.toLowerCase().includes(i.id)
    );
  });

  const filtered = integrations.filter((i) => {
    if (
      search &&
      !i.name.toLowerCase().includes(search.toLowerCase()) &&
      !i.description.toLowerCase().includes(search.toLowerCase()) &&
      !i.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
    )
      return false;
    if (categoryFilter !== "all" && i.category !== categoryFilter) return false;
    return true;
  });

  // Sort: connected first, then featured, then available, then coming-soon
  const sorted = [...filtered].sort((a, b) => {
    const aConnected = connectedIds.has(a.id) ? 0 : 1;
    const bConnected = connectedIds.has(b.id) ? 0 : 1;
    if (aConnected !== bConnected) return aConnected - bConnected;
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    if (a.status !== b.status) return a.status === "available" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  const handleConnect = (integration: Integration) => {
    if (!mcpEnabled) {
      setPaywallTrigger("api_access");
      return;
    }
    if (integration.status === "coming-soon") return;
    setConnectingIntegration(integration);
  };

  const handleDisconnect = (integration: Integration) => {
    const server = servers.find(
      (s) =>
        s.catalogIntegrationId === integration.id ||
        s.name.toLowerCase() === integration.name.toLowerCase() ||
        s.url.toLowerCase().includes(integration.id)
    );
    if (server) deleteServer(server.id);
  };

  const handleAddServer = async (params: Parameters<typeof addServer>[0]) => {
    await addServer(params);
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <Button variant="ghost" size="sm" render={<Link href="/dashboard" />}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Integrations</h1>
          <p className="text-muted-foreground text-sm">
            Connect your tools to get live answers during calls
          </p>
        </div>
      </div>

      {/* Custom MCP server */}
      <Card className="mb-6">
        <CardContent className="flex items-center justify-between p-4">
          <div>
            <p className="text-sm font-medium">Connect any MCP server</p>
            <p className="text-muted-foreground text-xs">
              Vernix works with any MCP-compatible server.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (!mcpEnabled) {
                setPaywallTrigger("api_access");
                return;
              }
              setConnectingIntegration({
                id: "custom",
                name: "Custom MCP Server",
                description: "",
                logo: "",
                category: "other",
                tags: [],
                featured: false,
                status: "available",
                serverUrl: null,
                authMode: "none",
                docsUrl: "https://modelcontextprotocol.io/introduction",
                setupInstructions:
                  "Enter the MCP server URL and choose an authentication method.",
                examplePrompts: [],
                sampleResponses: [],
              });
            }}
          >
            <Plus className="mr-1 h-3 w-3" />
            Add custom
          </Button>
        </CardContent>
      </Card>

      {/* Connected custom servers */}
      {customServers.length > 0 && (
        <div className="mb-6 space-y-2">
          <h2 className="text-sm font-medium">Your connections</h2>
          {customServers.map((server) => (
            <ConnectedServerCard
              key={server.id}
              server={server}
              onTest={testServer}
              onToggle={toggleServer}
              onDelete={deleteServer}
            />
          ))}
        </div>
      )}

      {/* Search + filters */}
      <div className="mb-6 space-y-3">
        <Input
          placeholder="Search integrations..."
          aria-label="Search integrations"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <div
          className="flex flex-wrap gap-1"
          role="group"
          aria-label="Filter by category"
        >
          <Button
            size="sm"
            variant={categoryFilter === "all" ? "accent" : "outline"}
            aria-pressed={categoryFilter === "all"}
            onClick={() => setCategoryFilter("all")}
          >
            All
          </Button>
          {CATEGORIES.map((cat) => (
            <Button
              key={cat.value}
              size="sm"
              variant={categoryFilter === cat.value ? "accent" : "outline"}
              aria-pressed={categoryFilter === cat.value}
              onClick={() => setCategoryFilter(cat.value)}
            >
              {cat.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Integration grid */}
      <div className="space-y-3">
        {sorted.map((integration) => (
          <IntegrationCard
            key={integration.id}
            integration={integration}
            connected={connectedIds.has(integration.id)}
            serverId={
              servers.find(
                (s) =>
                  s.catalogIntegrationId === integration.id ||
                  s.name.toLowerCase() === integration.name.toLowerCase()
              )?.id
            }
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            onTest={testServer}
          />
        ))}
      </div>

      {sorted.length === 0 && (
        <div className="text-muted-foreground py-12 text-center">
          <Plug className="mx-auto mb-3 h-12 w-12 opacity-40" />
          <p className="text-lg font-medium">No integrations found</p>
          <p className="text-sm">Try a different search or category.</p>
        </div>
      )}

      {/* Connect dialog */}
      <IntegrationConnectDialog
        integration={connectingIntegration}
        open={!!connectingIntegration}
        onOpenChange={(v) => !v && setConnectingIntegration(null)}
        onConnect={handleAddServer}
        onStartOAuth={startOAuth}
        oauthLoading={oauthLoading}
      />

      {/* Paywall dialog */}
      {paywallTrigger && (
        <UpgradeDialog
          open
          onOpenChange={(v) => !v && setPaywallTrigger(null)}
          trigger={paywallTrigger}
        />
      )}
    </div>
  );
}
