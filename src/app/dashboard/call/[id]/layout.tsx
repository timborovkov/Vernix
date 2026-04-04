import type { Metadata } from "next";
import { db } from "@/lib/db";
import { meetings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  const [meeting] = await db
    .select({ title: meetings.title })
    .from(meetings)
    .where(eq(meetings.id, id));

  return {
    title: meeting?.title || "Call",
  };
}

export default function CallLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
