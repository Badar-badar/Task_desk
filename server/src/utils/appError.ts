export class AppError extends Error {
  public statusCode: number;
  public code: string;

  constructor(statusCode: number, code: string, message?: string) {
    super(message ?? code);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

export class ApiError extends AppError {
  constructor(statusCode: number, message: string) {
    super(statusCode, "API_ERROR", message);
    this.name = "ApiError";
  }
}
