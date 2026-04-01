import Link from "next/link";
import { Button } from "@/components/ui/button";
import { NotFoundContent } from "@/components/not-found-content";
import { VernixLogo } from "@/components/ui/vernix-logo";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4">
      <VernixLogo size={48} className="mb-8" />
      <div className="flex flex-col items-center text-center">
        <NotFoundContent>
          <Button render={<Link href="/" />}>Go home</Button>
        </NotFoundContent>
      </div>
    </div>
  );
}
