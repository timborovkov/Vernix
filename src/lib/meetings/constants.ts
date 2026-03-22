export const statusVariant: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  pending: "outline",
  joining: "secondary",
  active: "default",
  processing: "secondary",
  completed: "default",
  failed: "destructive",
};
