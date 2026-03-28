"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Check, Clock } from "lucide-react";
import type { Integration } from "@/lib/integrations/catalog";

interface IntegrationCardProps {
  integration: Integration;
  connected: boolean;
  onConnect: (integration: Integration) => void;
  onDisconnect: (integration: Integration) => void;
}

export function IntegrationCard({
  integration,
  connected,
  onConnect,
  onDisconnect,
}: IntegrationCardProps) {
  const isComingSoon = integration.status === "coming-soon";
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  return (
    <>
    <Card className={`transition-colors ${connected ? "border-ring/30" : ""}`}>
      <CardContent className="flex items-start gap-3 p-4">
        <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
          <Image
            src={integration.logo}
            alt={integration.name}
            width={24}
            height={24}
            className="dark:invert"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">{integration.name}</p>
            {connected && (
              <Badge
                variant="secondary"
                className="bg-green-500/10 text-green-600"
              >
                <Check className="mr-0.5 h-3 w-3" />
                Connected
              </Badge>
            )}
            {isComingSoon && (
              <Badge variant="outline">
                <Clock className="mr-0.5 h-3 w-3" />
                Soon
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
            {integration.description}
          </p>
          {integration.examplePrompts[0] && (
            <p className="text-muted-foreground mt-1.5 text-[11px] italic">
              &quot;{integration.examplePrompts[0]}&quot;
            </p>
          )}
        </div>
        <div className="shrink-0">
          {connected ? (
            <Button
              size="xs"
              variant="ghost"
              onClick={() => onDisconnect(integration)}
            >
              Disconnect
            </Button>
          ) : (
            <Button
              size="xs"
              variant={isComingSoon ? "outline" : "default"}
              disabled={isComingSoon}
              onClick={() => onConnect(integration)}
            >
              {isComingSoon ? "Soon" : "Connect"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
