import { describe, it, expect } from "vitest";
import {
  apiSuccess,
  apiCreated,
  apiError,
  handleServiceError,
} from "./response";
import {
  NotFoundError,
  ValidationError,
  BillingError,
  ForbiddenError,
  ConflictError,
} from "./errors";

describe("apiSuccess", () => {
  it("returns 200 with data envelope", async () => {
    const response = apiSuccess({ id: "1", name: "Test" });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toEqual({ id: "1", name: "Test" });
  });

  it("includes meta when provided", async () => {
    const response = apiSuccess([1, 2], { hasMore: true, nextCursor: "abc" });
    const body = await response.json();
    expect(body.meta).toEqual({ hasMore: true, nextCursor: "abc" });
  });

  it("omits meta when not provided", async () => {
    const response = apiSuccess("ok");
    const body = await response.json();
    expect(body.meta).toBeUndefined();
  });
});

describe("apiCreated", () => {
  it("returns 201 with data envelope", async () => {
    const response = apiCreated({ id: "new" });
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.data.id).toBe("new");
  });
});

describe("apiError", () => {
  it("returns error envelope with code and message", async () => {
    const response = apiError("NOT_FOUND", "Meeting not found", 404);
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error.code).toBe("NOT_FOUND");
    expect(body.error.message).toBe("Meeting not found");
  });

  it("includes issues when provided", async () => {
    const response = apiError("VALIDATION_ERROR", "Bad input", 400, [
      { path: "title", message: "required" },
    ]);
    const body = await response.json();
    expect(body.error.issues).toHaveLength(1);
  });
});

describe("handleServiceError", () => {
  it("maps NotFoundError to 404", async () => {
    const response = handleServiceError(new NotFoundError("Meeting"));
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("maps ValidationError to 400 with issues", async () => {
    const response = handleServiceError(
      new ValidationError("Invalid", [{ field: "x" }])
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.issues).toHaveLength(1);
  });

  it("maps BillingError 403 to BILLING_LIMIT", async () => {
    const response = handleServiceError(
      new BillingError("Pro plan required", 403)
    );
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error.code).toBe("BILLING_LIMIT");
  });

  it("maps BillingError 429 to RATE_LIMITED", async () => {
    const response = handleServiceError(
      new BillingError("Daily limit reached", 429)
    );
    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body.error.code).toBe("RATE_LIMITED");
  });

  it("maps ForbiddenError to 403", async () => {
    const response = handleServiceError(new ForbiddenError());
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("maps ConflictError to 409", async () => {
    const response = handleServiceError(new ConflictError("Already exists"));
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error.code).toBe("CONFLICT");
  });

  it("maps unknown errors to 500", async () => {
    const response = handleServiceError(new Error("unexpected"));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error.code).toBe("INTERNAL_ERROR");
  });
});
