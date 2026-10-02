/**
 * Timeout wajar untuk seluruh request jaringan Supabase (auth, db, storage).
 * Mencegah UI/server menggantung 10+ detik pada jaringan lambat.
 */
export const SUPABASE_FETCH_TIMEOUT_MS = 5000;

/** Pesan error timeout — dipakai juga oleh pemetaan error auth. */
export const SUPABASE_TIMEOUT_MESSAGE =
  "Permintaan ke server melebihi batas waktu. " +
  "Periksa koneksi internet Anda lalu coba lagi.";

function resolveTimeoutSignal(
  incoming: AbortSignal | null | undefined,
  timeoutMs: number,
): AbortSignal {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);

  if (!incoming) {
    return timeoutSignal;
  }

  if (typeof AbortSignal.any === "function") {
    return AbortSignal.any([incoming, timeoutSignal]);
  }

  return timeoutSignal;
}

function isTimeoutAbort(error: unknown, signal: AbortSignal): boolean {
  if (signal.aborted) {
    return true;
  }

  return error instanceof DOMException && error.name === "TimeoutError";
}

/**
 * `fetch` pengganti untuk Supabase client (`global.fetch` — dipakai oleh
 * auth, PostgREST, dan storage).
 * Membatalkan request yang melebihi `SUPABASE_FETCH_TIMEOUT_MS` via
 * `AbortSignal.timeout`, lalu melempar error timeout yang ramah.
 */
export function fetchWithSupabaseTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs: number = SUPABASE_FETCH_TIMEOUT_MS,
): Promise<Response> {
  const signal = resolveTimeoutSignal(init?.signal ?? null, timeoutMs);

  return fetch(input, { ...init, signal }).catch((error: unknown) => {
    if (isTimeoutAbort(error, signal)) {
      throw new Error(SUPABASE_TIMEOUT_MESSAGE);
    }

    throw error;
  });
}

