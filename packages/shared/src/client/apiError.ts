export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown) {
    super(`API error (status ${status})`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}
