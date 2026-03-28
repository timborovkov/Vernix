import { NextResponse } from "next/server";
import { CustomerPortal } from "@polar-sh/nextjs";
import { getEnv } from "@/lib/env";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

const env = getEnv();

const portalHandler = CustomerPortal({
  accessToken: env.POLAR_ACCESS_TOKEN!,
  returnUrl: `${env.NEXT_PUBLIC_APP_URL}/dashboard/settings`,
  server: env.POLAR_SERVER as "sandbox" | "production",
  getCustomerId: async () => {
    // This is only called when we've already verified the customer exists
    const session = await auth();
    if (!session?.user?.id) return "";

    const [user] = await db
      .select({ polarCustomerId: users.polarCustomerId })
      .from(users)
      .where(eq(users.id, session.user.id));

    return user?.polarCustomerId ?? "";
  },
});

export async function GET(req: NextRequest) {
  // Pre-check: redirect gracefully if user has no Polar subscription
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", env.NEXT_PUBLIC_APP_URL));
  }

  const [user] = await db
    .select({ polarCustomerId: users.polarCustomerId })
    .from(users)
    .where(eq(users.id, session.user.id));

  if (!user?.polarCustomerId) {
    return NextResponse.redirect(
      new URL(
        "/dashboard/settings?billing=no_subscription",
        env.NEXT_PUBLIC_APP_URL
      )
    );
  }

  return portalHandler(req);
}
