import Link from "next/link";
import { Button } from "@/components/ui/button";
import { NotFoundContent } from "@/components/not-found-content";

export default function DashboardNotFound() {
  return (
    <div className="container mx-auto flex max-w-6xl flex-col items-center px-4 py-24 text-center">
      <NotFoundContent>
        <Button render={<Link href="/dashboard" />}>Back to dashboard</Button>
      </NotFoundContent>
    </div>
  );
}
