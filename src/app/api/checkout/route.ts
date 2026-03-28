import { NextResponse, type NextRequest } from "next/server";
import { Checkout } from "@polar-sh/nextjs";

export async function GET(request: NextRequest) {
  const accessToken = process.env.POLAR_ACCESS_TOKEN;
  if (!accessToken) {
    return NextResponse.json(
      { error: "Billing is not configured" },
      { status: 503 }
    );
  }

  const handler = Checkout({
    accessToken,
    successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?billing=success&checkout_id={CHECKOUT_ID}`,
    server: (process.env.POLAR_SERVER as "sandbox" | "production") ?? "sandbox",
  });

  return handler(request);
}
