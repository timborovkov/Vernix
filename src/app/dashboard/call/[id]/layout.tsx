import type { Metadata } from "next";
import { db } from "@/lib/db";
import { meetings } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) return { title: "Call" };

  const [meeting] = await db
    .select({ title: meetings.title })
    .from(meetings)
    .where(and(eq(meetings.id, id), eq(meetings.userId, userId)));

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
