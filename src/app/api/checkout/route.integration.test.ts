/**
 * Integration test: actually hits Polar sandbox API.
 * Run with: pnpm test:integration -- src/app/api/checkout/route.integration.test.ts
 * Requires .env.local with valid POLAR_ACCESS_TOKEN and product IDs.
 */
import { describe, it, expect } from "vitest";
import { GET } from "./route";
import { NextRequest } from "next/server";

const PRODUCT_ID = process.env.NEXT_PUBLIC_POLAR_PRODUCT_ID_PRO_MONTHLY;
const HAS_POLAR = !!process.env.POLAR_ACCESS_TOKEN && !!PRODUCT_ID;

describe.skipIf(!HAS_POLAR)("Checkout integration (Polar sandbox)", () => {
  it("creates a checkout session and redirects to Polar", async () => {
    // Polar production validates email domains, so use a real domain
    const url = `http://localhost:3000/api/checkout?products=${PRODUCT_ID}&customerExternalId=test-user-123&customerEmail=integration-test@vernix.app`;
    const req = new NextRequest(url);

    const res = await GET(req);

    // Should be a redirect (307) or a 502 if token is expired
    if (res.status === 502) {
      const data = await res.json();
      throw new Error(
        `Polar token is invalid/expired: ${data.details}. Regenerate at polar.sh.`
      );
    }

    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    expect(location).toBeTruthy();
    expect(location).toContain("polar.sh");
  });

  it("returns 400 when no product ID is provided", async () => {
    const req = new NextRequest("http://localhost:3000/api/checkout");
    const res = await GET(req);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("products");
  });
});
