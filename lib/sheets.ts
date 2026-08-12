// Google Sheets writes for the exports: finished grids in, no schedule or score maths here. REST
// over fetch, with a GOOGLE_SHEETS_CLIENT_EMAIL/_PRIVATE_KEY service account the sheet is shared with.

// The credentials must never be reachable from a bundle — this fails the build if
// a client module imports it.
import "server-only";
import { isFormulaCell } from "./sheetGrid";
import type { Cell, SheetTabData } from "./sheetGrid";

const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/spreadsheets";

interface SheetsCredentials {
  clientEmail: string;
  privateKey: string;
}

// Null when the deployment has no service account configured, so the caller can
// report that state rather than a failed write.
export function sheetsCredentials(): SheetsCredentials | null {
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  // Dashboards and .env files store the PEM as one line with literal "\n"; the
  // JWT signer needs the real newlines back.
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey) return null;
  return { clientEmail, privateKey };
}

// The spreadsheet id out of what an organizer pasted into Settings — a browser URL far more often
// than a bare id, so both are accepted. A "published to web" /d/e/ link is excluded: not an id.
export function spreadsheetIdFromUrl(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  // A bare id: sheet ids are ~44 characters of the URL-safe alphabet, and the
  // length floor keeps a stray word from being mistaken for one.
  if (/^[A-Za-z0-9_-]{20,}$/.test(value)) return value;
  const match = value.match(/\/spreadsheets\/d\/(?!e\/)([A-Za-z0-9_-]+)/);
  return match ? match[1] : null;
}

// ---------- service-account access token ----------

const base64url = (bytes: Uint8Array): string => {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

// A service-account key is PKCS#8, which is what importKey wants — strip the armour and the
// newlines for the base64 DER. Returns the buffer, since importKey takes a BufferSource.
function pkcs8FromPem(pem: string): ArrayBuffer {
  const body = pem.replace(/-----(?:BEGIN|END) PRIVATE KEY-----/g, "").replace(/\s+/g, "");
  const der = atob(body);
  const bytes = new Uint8Array(der.length);
  for (let i = 0; i < der.length; i++) bytes[i] = der.charCodeAt(i);
  return bytes.buffer;
}

// Shared across invocations landing on the same warm instance: minting a token is a whole extra
// round trip and one lasts an hour. Keyed by account, so rotation can't serve a stale token.
let tokenCache: { key: string; token: string; expiresAt: number } | null = null;

async function accessToken(credentials: SheetsCredentials): Promise<string> {
  // A minute of headroom: the token has to outlive the calls made with it, not
  // just the moment it is read.
  if (tokenCache && tokenCache.key === credentials.clientEmail && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.token;
  }

  const issuedAt = Math.floor(Date.now() / 1000);
  const claims = {
    iss: credentials.clientEmail,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: issuedAt,
    exp: issuedAt + 3600,
  };
  const encoder = new TextEncoder();
  const signingInput = [
    base64url(encoder.encode(JSON.stringify({ alg: "RS256", typ: "JWT" }))),
    base64url(encoder.encode(JSON.stringify(claims))),
  ].join(".");

  const algorithm = { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" };
  let signature: ArrayBuffer;
  try {
    const key = await crypto.subtle.importKey("pkcs8", pkcs8FromPem(credentials.privateKey), algorithm, false, ["sign"]);
    signature = await crypto.subtle.sign(algorithm.name, key, encoder.encode(signingInput));
  } catch {
    // A malformed key fails here rather than as an opaque 400 from the token endpoint, which is the
    // difference between "fix the env var" and "the service account lost access".
    throw new Error("GOOGLE_SHEETS_PRIVATE_KEY is not a usable PKCS#8 private key");
  }
  const assertion = `${signingInput}.${base64url(new Uint8Array(signature))}`;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const body = (await res.json().catch(() => null)) as { access_token?: string; expires_in?: number } | null;
  if (!res.ok || !body?.access_token) {
    throw new Error(`Google token request failed (${res.status}): ${JSON.stringify(body)}`);
  }

  tokenCache = {
    key: credentials.clientEmail,
    token: body.access_token,
    expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000,
  };
  return body.access_token;
}

// ---------- REST helpers ----------

async function sheetsFetch<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${SHEETS_API}${path}`, {
    ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    // The response is per-write state; nothing about it should be reused.
    cache: "no-store",
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  // The message carries Google's own error body — the action logs it and shows the organizer one
  // line, so a "caller does not have permission" (sheet never shared) becomes diagnosable.
  if (!res.ok) throw new Error(`Sheets ${path} failed (${res.status}): ${text.slice(0, 500)}`);
  return body as T;
}

// A cell in the shape the API takes. Typed CellData rather than a valueInputOption: RAW kept
// "9:00 AM" literal but made a formula impossible. Per-cell typing gets both.
function cellData(cell: Cell): object {
  if (typeof cell === "number") {
    // A non-finite number is not expressible in JSON and would arrive as null, so
    // it lands as an empty cell either way; be explicit about it.
    return Number.isFinite(cell) ? { userEnteredValue: { numberValue: cell } } : {};
  }
  if (isFormulaCell(cell)) return { userEnteredValue: { formulaValue: cell.formula } };
  // No value at all, which with fields=userEnteredValue clears the cell.
  if (cell === "") return {};
  return { userEnteredValue: { stringValue: cell } };
}

const gridWidth = (rows: Cell[][]): number => rows.reduce((widest, row) => Math.max(widest, row.length), 0);

interface SheetProperties {
  sheetId?: number;
  title?: string;
  gridProperties?: { rowCount?: number; columnCount?: number };
}

// ---------- the read ----------

// A1 notation for a whole tab. Sheets wraps a title in single quotes, and a title
// that itself contains one escapes it by doubling.
const tabRange = (title: string): string => `'${title.replace(/'/g, "''")}'`;

// Reads whole tabs for the live scoring page, formulas resolved to their current values — which
// is the live result. Service-account authed since the sheet is private; unknown titles skipped.
export async function readSheetTabs(
  spreadsheetId: string,
  titles: string[],
): Promise<Map<string, (string | number)[][]>> {
  const credentials = sheetsCredentials();
  if (!credentials) throw new Error("Google Sheets is not configured");
  const token = await accessToken(credentials);

  const meta = await sheetsFetch<{ sheets?: { properties?: SheetProperties }[] }>(
    `/${spreadsheetId}?fields=sheets.properties.title`,
    token,
  );
  const present = new Set((meta.sheets ?? []).map((s) => s.properties?.title).filter((t): t is string => !!t));
  const wanted = titles.filter((t) => present.has(t));

  const values = new Map<string, (string | number)[][]>();
  if (wanted.length === 0) return values;

  // UNFORMATTED_VALUE keeps a score a number rather than a locale-formatted
  // string, so the page never has to parse "9,25" back into 9.25.
  const ranges = wanted.map((t) => `ranges=${encodeURIComponent(tabRange(t))}`).join("&");
  const read = await sheetsFetch<{ valueRanges?: { values?: (string | number)[][] }[] }>(
    `/${spreadsheetId}/values:batchGet?${ranges}&valueRenderOption=UNFORMATTED_VALUE`,
    token,
  );

  // batchGet answers in the order the ranges were given, so the titles pair back up by index.
  // Trailing empty rows and cells are omitted by the API, so every reader must tolerate a short row.
  (read.valueRanges ?? []).forEach((range, i) => {
    values.set(wanted[i], range.values ?? []);
  });
  return values;
}

// ---------- the write ----------

// Writes each tab starting at A1, creating the tab when it does not exist yet, and returns the
// spreadsheet URL. Throws on a Sheets failure — the action wraps this in actionError.
export async function writeSheetTabs(spreadsheetId: string, tabs: SheetTabData[]): Promise<string> {
  const credentials = sheetsCredentials();
  if (!credentials) throw new Error("Google Sheets is not configured");
  const token = await accessToken(credentials);

  // Which tabs exist decides create-vs-clear, and their grid size whether one must be grown first:
  // updateCells fails against the grid rather than extending it. `fields` keeps the response small.
  const meta = await sheetsFetch<{ sheets?: { properties?: SheetProperties }[] }>(
    `/${spreadsheetId}?fields=sheets.properties(sheetId,title,gridProperties(rowCount,columnCount))`,
    token,
  );
  const existing = new Map<string, SheetProperties>();
  for (const sheet of meta.sheets ?? []) {
    if (sheet.properties?.title) existing.set(sheet.properties.title, sheet.properties);
  }

  // Ids for new tabs are assigned here rather than read back from a separate addSheet call — that
  // is what lets create, clear and fill be one batchUpdate. Requests in a batch run in order.
  let nextSheetId = Math.max(0, ...[...existing.values()].map((p) => p.sheetId ?? 0)) + 1;

  const requests: object[] = [];
  const fills: object[] = [];

  for (const tab of tabs) {
    const rowCount = tab.rows.length;
    const columnCount = gridWidth(tab.rows);
    const current = existing.get(tab.title);
    let sheetId: number;

    if (current?.sheetId === undefined) {
      sheetId = nextSheetId++;
      // Sized with the usual 26 columns and some slack below the data, so a fresh
      // tab looks like a normal sheet rather than a grid cropped to the export.
      requests.push({
        addSheet: {
          properties: {
            sheetId,
            title: tab.title,
            gridProperties: { rowCount: Math.max(rowCount + 20, 100), columnCount: Math.max(columnCount, 26) },
          },
        },
      });
    } else {
      sheetId = current.sheetId;
      // Re-exporting a shorter schedule must not leave the previous run's tail below it, so a tab that
      // already existed is emptied first. Only values are cleared; the organizer's formatting survives.
      requests.push({ repeatCell: { range: { sheetId }, cell: {}, fields: "userEnteredValue" } });

      // Grow the grid when this export is bigger than the last one was.
      const haveRows = current.gridProperties?.rowCount ?? 0;
      const haveColumns = current.gridProperties?.columnCount ?? 0;
      if (rowCount > haveRows) {
        requests.push({ appendDimension: { sheetId, dimension: "ROWS", length: rowCount - haveRows } });
      }
      if (columnCount > haveColumns) {
        requests.push({ appendDimension: { sheetId, dimension: "COLUMNS", length: columnCount - haveColumns } });
      }
    }

    // Held back so every fill runs after every create and clear — a tab being
    // cleared and a tab being created are both prerequisites of writing into one.
    fills.push({
      updateCells: {
        start: { sheetId, rowIndex: 0, columnIndex: 0 },
        rows: tab.rows.map((row) => ({ values: row.map(cellData) })),
        fields: "userEnteredValue",
      },
    });
  }

  await sheetsFetch(`/${spreadsheetId}:batchUpdate`, token, {
    method: "POST",
    body: JSON.stringify({ requests: [...requests, ...fills] }),
  });

  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
}
