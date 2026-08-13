"use client";

/**
 * Browser-side client for the public Google Sheets API.
 *
 * @remarks
 * The only data source in the app that is not a server action. It authenticates
 * with `NEXT_PUBLIC_GOOGLE_API_KEY`, which ships in the bundle by design — an
 * API key carries no identity, so it can only read a publicly viewable sheet.
 * Restrict it to your own domains in the Google Cloud console.
 *
 * Server-side Sheets access, including everything that touches a private sheet,
 * goes through {@link "lib/sheets"} and its service account instead.
 *
 * @packageDocumentation
 */

/** An `Error` carrying the failed response's status and parsed body. */
export interface ApiError extends Error {
  response?: { status: number; data: unknown };
}

interface SheetsRequestConfig {
  params?: Record<string, string>;
}

interface SheetsResponse<T = unknown> {
  data: T;
  status: number;
}

function buildError(status: number, data: unknown): ApiError {
  const err = new Error(`Request failed with status ${status}`) as ApiError;
  err.response = { status, data };
  return err;
}

/**
 * Minimal GET client for the Sheets REST API, with the API key appended.
 *
 * @throws An {@link ApiError} on any non-2xx response.
 */
const apiSheets = {
  get: async (url: string, config: SheetsRequestConfig = {}): Promise<SheetsResponse> => {
    const params = new URLSearchParams({
      ...(config.params || {}),
      key: process.env.NEXT_PUBLIC_GOOGLE_API_KEY || "",
    });
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets${url}?${params}`);
    const text = await res.text();
    const body = text ? JSON.parse(text) : null;
    if (!res.ok) throw buildError(res.status, body);
    return { data: body, status: res.status };
  },
};

export { apiSheets };
