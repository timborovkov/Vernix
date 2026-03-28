import { NextResponse, type NextRequest } from "next/server";
import { Polar } from "@polar-sh/sdk";
import { SDKError } from "@polar-sh/sdk/models/errors/sdkerror.js";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const accessToken = process.env.POLAR_ACCESS_TOKEN;
  if (!accessToken) {
    return NextResponse.json(
      { error: "Billing is not configured" },
      { status: 503 }
    );
  }

  // Authenticate: use session user, not query params, to prevent impersonation
  const session = await auth();
  if (!session?.user?.id) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://vernix.app";
    return NextResponse.redirect(new URL("/login", appUrl));
  }

  const url = new URL(request.url);
  const products = url.searchParams.getAll("products");
  if (products.length === 0) {
    return NextResponse.json(
      { error: "Missing products query param" },
      { status: 400 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://vernix.app";
  const server =
    (process.env.POLAR_SERVER as "sandbox" | "production") ?? "sandbox";

  try {
    const polar = new Polar({ accessToken, server });

    const result = await polar.checkouts.create({
      products,
      successUrl: `${appUrl}/dashboard/settings?billing=success&checkout_id={CHECKOUT_ID}`,
      externalCustomerId: session.user.id,
      customerEmail: session.user.email ?? undefined,
    });

    return NextResponse.redirect(result.url);
  } catch (error) {
    if (error instanceof SDKError && error.statusCode === 401) {
      console.error(
        "[Checkout] Polar access token is invalid or expired. Regenerate at polar.sh.",
        { status: error.statusCode, body: error.body }
      );
      return NextResponse.json(
        {
          error: "Billing authentication failed",
          details:
            "The Polar access token is invalid or expired. Contact support.",
        },
        { status: 502 }
      );
    }

    console.error("[Checkout] Failed to create checkout session:", error);
    return NextResponse.redirect(
      new URL("/pricing?error=checkout_failed", appUrl)
    );
  }
}
