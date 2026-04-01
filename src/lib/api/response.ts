import { NextResponse } from "next/server";
import {
  NotFoundError,
  ValidationError,
  BillingError,
  ForbiddenError,
  ConflictError,
  SearchError,
} from "./errors";

// ---------------------------------------------------------------------------
// Standard API envelope responses
// ---------------------------------------------------------------------------

export interface ApiSuccessResponse<T> {
  data: T;
  meta?: object;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    issues?: unknown[];
  };
}

export function apiSuccess<T>(
  data: T,
  meta?: object,
  headers?: Record<string, string>
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json({ data, ...(meta && { meta }) }, { headers });
}

export function apiCreated<T>(
  data: T,
  headers?: Record<string, string>
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json({ data }, { status: 201, headers });
}

export function apiError(
  code: string,
  message: string,
  status: number,
  issues?: unknown[]
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    { error: { code, message, ...(issues && { issues }) } },
    { status }
  );
}

// ---------------------------------------------------------------------------
// Map service-layer errors to API responses
// ---------------------------------------------------------------------------

export function handleServiceError(error: unknown): NextResponse {
  if (error instanceof NotFoundError) {
    return apiError("NOT_FOUND", error.message, 404);
  }
  if (error instanceof ValidationError) {
    return apiError("VALIDATION_ERROR", error.message, 400, error.issues);
  }
  if (error instanceof BillingError) {
    const code = error.statusCode === 429 ? "RATE_LIMITED" : "BILLING_LIMIT";
    return apiError(code, error.message, error.statusCode);
  }
  if (error instanceof ForbiddenError) {
    return apiError("FORBIDDEN", error.message, 403);
  }
  if (error instanceof ConflictError) {
    return apiError("CONFLICT", error.message, 409);
  }
  if (error instanceof SearchError) {
    return apiError("SEARCH_ERROR", error.message, 500);
  }
  console.error("Unhandled API error:", error);
  return apiError("INTERNAL_ERROR", "Internal server error", 500);
}
