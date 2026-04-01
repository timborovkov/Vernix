// ---------------------------------------------------------------------------
// Typed errors for the service layer — framework-agnostic
// ---------------------------------------------------------------------------

export class NotFoundError extends Error {
  constructor(resource: string) {
    super(`${resource} not found`);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends Error {
  readonly issues: unknown[];
  constructor(message: string, issues: unknown[] = []) {
    super(message);
    this.name = "ValidationError";
    this.issues = issues;
  }
}

export class BillingError extends Error {
  readonly statusCode: 403 | 429;
  constructor(reason: string, statusCode: 403 | 429 = 403) {
    super(reason);
    this.name = "BillingError";
    this.statusCode = statusCode;
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

export class SearchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SearchError";
  }
}
