"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Upload } from "lucide-react";
import { isBillingError } from "@/lib/billing/errors";
import {
  UpgradeDialog,
  detectPaywallTrigger,
  type PaywallTrigger,
} from "@/components/upgrade-dialog";

const ACCEPTED_TYPES = ".pdf,.docx,.txt,.md";
const MAX_SIZE_MB = 25; // Upper bound — server enforces per-plan limit

interface UploadDocumentDialogProps {
  onUpload: (file: File) => Promise<void>;
  uploading: boolean;
}

export function UploadDocumentDialog({
  onUpload,
  uploading,
}: UploadDocumentDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [paywallTrigger, setPaywallTrigger] = useState<PaywallTrigger | null>(
    null
  );
  const [paywallMessage, setPaywallMessage] = useState<string>("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`File too large. Maximum size is ${MAX_SIZE_MB}MB`);
      return;
    }

    setSelectedFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    try {
      await onUpload(selectedFile);
      setSelectedFile(null);
      if (inputRef.current) inputRef.current.value = "";
      setOpen(false);
    } catch (error) {
      if (isBillingError(error)) {
        const trigger = detectPaywallTrigger(
          error.message,
          error.isFeatureGate
        );
        setPaywallTrigger(trigger);
        setPaywallMessage(error.message);
      }
      // Other errors handled by hook toast
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Upload className="mr-2 h-4 w-4" />
        Upload Document
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_TYPES}
              onChange={handleFileChange}
              className="file:bg-primary file:text-primary-foreground block w-full text-sm file:mr-4 file:rounded file:border-0 file:px-4 file:py-2 file:text-sm file:font-medium"
            />
            <p className="text-muted-foreground text-xs">
              Supported: PDF, DOCX, TXT, Markdown.
            </p>
          </div>

          {selectedFile && (
            <p className="text-sm">
              Selected: <span className="font-medium">{selectedFile.name}</span>{" "}
              ({(selectedFile.size / 1024).toFixed(0)} KB)
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={!selectedFile || uploading}
          >
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </form>
      </DialogContent>
      {paywallTrigger && (
        <UpgradeDialog
          open
          onOpenChange={(v) => !v && setPaywallTrigger(null)}
          trigger={paywallTrigger}
          errorMessage={paywallMessage}
        />
      )}
    </Dialog>
  );
}
