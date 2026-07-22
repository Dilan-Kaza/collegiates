"use client";

// Client for the external Google Sheets API (the only remaining non-action
// data source). All internal data access now goes through server actions
// (functions/actions/) and cached server functions (functions/data.ts).

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
