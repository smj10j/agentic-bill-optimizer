import type { ApiResponse } from "@orbit/shared";

export function ok<T>(data: T): ApiResponse<T> {
  return { data, error: null };
}

export function err(code: string, message: string): ApiResponse<never> {
  return { data: null, error: { code, message } };
}
