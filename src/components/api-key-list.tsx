"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Key, Trash2, Plus, Copy, Check } from "lucide-react";

interface ApiKeyInfo {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  createdAt: string;
}

interface ApiKeyListProps {
  keys: ApiKeyInfo[];
  onCreate: (name: string) => Promise<string | null>;
  onDelete: (id: string) => void;
}

export function ApiKeyList({ keys, onCreate, onDelete }: ApiKeyListProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    const raw = await onCreate(name.trim());
    setCreating(false);
    if (raw) {
      setNewKey(raw);
      setName("");
    }
  };

  const handleCopy = () => {
    if (newKey) {
      navigator.clipboard.writeText(newKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setNewKey(null);
    setName("");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">API Keys</h3>
        <Dialog
          open={open}
          onOpenChange={(v) => (v ? setOpen(true) : handleClose())}
        >
          <DialogTrigger render={<Button size="sm" />}>
            <Plus className="mr-1 h-4 w-4" />
            Generate Key
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {newKey ? "API Key Created" : "Generate API Key"}
              </DialogTitle>
            </DialogHeader>
            {newKey ? (
              <div className="space-y-3">
                <p className="text-sm text-amber-600">
                  Copy this key now — it won&apos;t be shown again.
                </p>
                <div className="flex gap-2">
                  <code className="bg-muted flex-1 rounded px-3 py-2 text-sm break-all">
                    {newKey}
                  </code>
                  <Button size="sm" variant="outline" onClick={handleCopy}>
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <Button className="w-full" onClick={handleClose}>
                  Done
                </Button>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="keyName">Key Name</Label>
                  <Input
                    id="keyName"
                    placeholder="e.g. Claude Desktop"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={creating || !name.trim()}
                >
                  {creating ? "Generating..." : "Generate"}
                </Button>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {keys.length === 0 ? (
        <p className="text-muted-foreground text-sm italic">
          No API keys yet. Generate one to connect from Claude Desktop or other
          MCP clients.
        </p>
      ) : (
        keys.map((key) => (
          <Card key={key.id}>
            <CardContent className="flex items-center gap-3 py-2.5">
              <Key className="text-muted-foreground h-4 w-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{key.name}</p>
                <p className="text-muted-foreground text-xs">
                  <code>{key.keyPrefix}...</code>
                  {key.lastUsedAt && (
                    <span className="ml-2">
                      Last used: {new Date(key.lastUsedAt).toLocaleDateString()}
                    </span>
                  )}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(key.id)}
                className="text-muted-foreground hover:text-destructive shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
