import { NextResponse } from "next/server";
import { CustomerPortal } from "@polar-sh/nextjs";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const accessToken = process.env.POLAR_ACCESS_TOKEN;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://vernix.app";

  if (!accessToken) {
    return NextResponse.json(
      { error: "Billing is not configured" },
      { status: 503 }
    );
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", appUrl));
  }

  const [user] = await db
    .select({ polarCustomerId: users.polarCustomerId })
    .from(users)
    .where(eq(users.id, session.user.id));

  if (!user?.polarCustomerId) {
    return NextResponse.redirect(
      new URL("/dashboard/settings?billing=no_subscription", appUrl)
    );
  }

  const handler = CustomerPortal({
    accessToken,
    returnUrl: `${appUrl}/dashboard/settings`,
    server: (process.env.POLAR_SERVER as "sandbox" | "production") ?? "sandbox",
    getCustomerId: async () => user.polarCustomerId ?? "",
  });

  return handler(req);
}
