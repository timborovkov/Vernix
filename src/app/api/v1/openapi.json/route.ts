import { NextResponse } from "next/server";
import { buildOpenApiSpec } from "@/lib/api/openapi";

export async function GET() {
  const spec = buildOpenApiSpec();
  return NextResponse.json(spec, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
