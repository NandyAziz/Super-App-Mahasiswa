/**
 * Utilitas integrasi **Midtrans Snap — PRODUCTION**.
 *
 * Seluruh konfigurasi memakai environment variable produksi:
 *
 * - `MIDTRANS_MERCHANT_ID` & `MIDTRANS_SERVER_KEY` — sisi server (REST API).
 *   Merchant ID tidak dikirim sebagai header (otentikasi Midtrans murni
 *   `Authorization: Basic base64(ServerKey + ":")`), namun wajib terisi agar
 *   konfigurasi produksi lengkap & mudah diverifikasi lewat log.
 * - `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` & `NEXT_PUBLIC_MIDTRANS_SNAP_URL` —
 *   sisi browser (skrip `snap.js` + `window.snap.pay`).
 *
 * Endpoint produksi: `https://app.midtrans.com` (lihat dokumentasi Midtrans
 * "Switching to Production Mode"). Verifikasi notifikasi memakai
 * `SHA512(order_id + status_code + gross_amount + ServerKey)` sehingga berkas
 * ini bebas dependensi native (memakai Web Crypto global) dan aman di-import
 * dari Client Component maupun Route Handler.
 */
import type { OrderService } from "@/features/orders/types";

/** Basis domain API Midtrans untuk environment PRODUCTION. */
export const MIDTRANS_PRODUCTION_BASE_URL = "https://app.midtrans.com";

/** Nilai default `NEXT_PUBLIC_MIDTRANS_SNAP_URL` (skrip Snap produksi). */
export const MIDTRANS_SNAP_SCRIPT_URL_DEFAULT = `${MIDTRANS_PRODUCTION_BASE_URL}/snap/snap.js`;

/** Endpoint REST pembuatan token transaksi Snap (`POST`). */
export const MIDTRANS_SNAP_TRANSACTION_ENDPOINT = `${MIDTRANS_PRODUCTION_BASE_URL}/snap/v1/transactions`;

/**
 * Pemisah `service` dan UUID pada `order_id` Midtrans (`jastip_<uuid>`).
 * Aman karena nama layanan tidak pernah mengandung `_` dan UUID memakai `-`.
 */
const ORDER_ID_SEPARATOR = "_";

/** ID elemen `<script>` Snap.js agar pemuatan skrip bersifat idempoten. */
const SNAP_SCRIPT_ELEMENT_ID = "midtrans-snap-script";

/** Batas waktu satu panggilan REST Midtrans (ms). */
const MIDTRANS_REQUEST_TIMEOUT_MS = 15_000;

/** Kredensial server — TIDAK BOLEH diekspos ke browser. */
export interface MidtransServerEnv {
  merchantId: string;
  serverKey: string;
}

/** Konfigurasi publik untuk memuat `snap.js` di browser. */
export interface MidtransClientConfig {
  clientKey: string;
  snapScriptUrl: string;
}

/** Satu baris item tagihan — selaras `item_details` API Midtrans. */
export interface MidtransItemDetail {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

/** Detail pembeli pada invoice — selaras `customer_details` API Midtrans. */
export interface MidtransCustomerDetails {
  first_name: string;
  email?: string;
  phone?: string;
}

/** Body request pembuatan token Snap. */
export interface MidtransSnapPayload {
  transaction_details: { order_id: string; gross_amount: number };
  item_details?: MidtransItemDetail[];
  customer_details?: MidtransCustomerDetails;
}

/** Hasil pembuatan token Snap: dipakai `window.snap.pay(token)`. */
export interface MidtransSnapToken {
  token: string;
  redirectUrl: string;
}

/** Hasil transaksi yang diterima callback `snap.pay`. */
export interface MidtransSnapTransactionResult {
  status_code: string;
  status_message: string;
  transaction_id: string;
  order_id: string;
  gross_amount: string;
  payment_type: string;
  transaction_time: string;
  transaction_status: string;
  fraud_status?: string;
}

/** Callback opsi `window.snap.pay(token, options)`. */
export interface MidtransSnapPayOptions {
  onSuccess?: (result: MidtransSnapTransactionResult) => void;
  onPending?: (result: MidtransSnapTransactionResult) => void;
  onError?: (result: MidtransSnapTransactionResult) => void;
  onClose?: () => void;
}

/** API global `window.snap` yang disuntikkan oleh `snap.js`. */
export interface MidtransSnap {
  pay(token: string, options?: MidtransSnapPayOptions): void;
}

declare global {
  interface Window {
    snap?: MidtransSnap;
  }
}

/**
 * Membaca env server Midtrans. Melempar error ramah bila salah satu belum
 * di-set di `.env.local` / dashboard hosting.
 */
export function getMidtransServerEnv(): MidtransServerEnv {
  const merchantId = process.env.MIDTRANS_MERCHANT_ID?.trim();
  const serverKey = process.env.MIDTRANS_SERVER_KEY?.trim();

  if (!merchantId || !serverKey) {
    throw new Error(
      "Kredensial Midtrans belum lengkap. Set MIDTRANS_MERCHANT_ID dan " +
        "MIDTRANS_SERVER_KEY (Production) di file .env.local.",
    );
  }

  return { merchantId, serverKey };
}

/**
 * Membaca konfigurasi publik Snap (client key + URL skrip). URL jatuh ke
 * endpoint produksi `https://app.midtrans.com/snap/snap.js` bila env kosong.
 */
export function getMidtransClientConfig(): MidtransClientConfig {
  const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY?.trim();
  const snapScriptUrl =
    process.env.NEXT_PUBLIC_MIDTRANS_SNAP_URL?.trim() ||
    MIDTRANS_SNAP_SCRIPT_URL_DEFAULT;

  if (!clientKey) {
    throw new Error(
      "Konfigurasi Snap Midtrans belum lengkap. Set " +
        "NEXT_PUBLIC_MIDTRANS_CLIENT_KEY (Production) di file .env.local.",
    );
  }

  return { clientKey, snapScriptUrl };
}

/** Base64 murni-JS (server key ASCII) — aman dipanggil di Node & browser. */
function base64Encode(value: string): string {
  return btoa(value);
}

/** SHA-512 hex dari teks memakai Web Crypto global (tanpa `node:crypto`). */
async function sha512Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-512", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

/** Perbandingan string berdurasi konstan (mencegah timing attack). */
function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let diff = 0;
  for (let index = 0; index < a.length; index += 1) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return diff === 0;
}

/** Pesan error ramah dari respons Midtrans (field `error_messages`). */
function readErrorMessage(body: unknown): string {
  if (typeof body === "object" && body !== null && "error_messages" in body) {
    const messages = (body as { error_messages?: unknown }).error_messages;
    if (Array.isArray(messages)) {
      return messages
        .filter((item): item is string => typeof item === "string")
        .join("; ");
    }
  }
  return "";
}

/**
 * Membuat token transaksi Snap (PRODUCTION) via REST Midtrans.
 *
 * Melempar error dengan pesan ramah bila konfigurasi hilang, jaringan gagal,
 * atau Midtrans menolak permintaan — ditangkap Server Action pemanggil.
 */
export async function createSnapTransaction(
  payload: MidtransSnapPayload,
): Promise<MidtransSnapToken> {
  const { merchantId, serverKey } = getMidtransServerEnv();

  let response: Response;
  try {
    response = await fetch(MIDTRANS_SNAP_TRANSACTION_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Basic ${base64Encode(`${serverKey}:`)}`,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(MIDTRANS_REQUEST_TIMEOUT_MS),
    });
  } catch (cause) {
    console.error("[Midtrans] Gagal menghubungi Snap API:", {
      merchantId,
      orderId: payload.transaction_details.order_id,
      message: cause instanceof Error ? cause.message : String(cause),
    });
    throw new Error(
      "Tidak dapat terhubung ke Midtrans. Periksa koneksi lalu coba lagi.",
    );
  }

  const body = (await response.json().catch(() => null)) as {
    token?: unknown;
    redirect_url?: unknown;
    error_messages?: unknown;
  } | null;
  const token = typeof body?.token === "string" ? body.token : "";
  const upstreamMessage = readErrorMessage(body);

  if (!response.ok || !token) {
    console.error("[Midtrans] Snap API menolak transaksi:", {
      merchantId,
      status: response.status,
      detail: upstreamMessage || " respons tidak berisi token.",
    });
    throw new Error(
      upstreamMessage ||
        "Midtrans menolak permintaan pembayaran. Silakan coba lagi nanti.",
    );
  }

  return {
    token,
    redirectUrl:
      typeof body?.redirect_url === "string" ? body.redirect_url : "",
  };
}

/** Input verifikasi `signature_key` notifikasi HTTP Midtrans. */
export interface MidtransSignatureInput {
  orderId: string;
  statusCode: string;
  grossAmount: string;
  signatureKey: string;
}

/**
 * Memverifikasi notifikasi webhook Midtrans dengan rumus resmi:
 * `SHA512(order_id + status_code + gross_amount + ServerKey)`.
 *
 * Melempar error bila `MIDTRANS_SERVER_KEY` belum dikonfigurasi.
 */
export async function verifyMidtransSignature(
  input: MidtransSignatureInput,
): Promise<boolean> {
  const { serverKey } = getMidtransServerEnv();
  const digest = await sha512Hex(
    `${input.orderId}${input.statusCode}${input.grossAmount}${serverKey}`,
  );
  return constantTimeEquals(digest, input.signatureKey.trim().toLowerCase());
}

/**
 * Menyusun `order_id` Midtrans dari layanan + UUID pesanan
 * (mis. `printing_9f2c…`), maksimum 45 karakter ≤ limit 50 Midtrans.
 */
export function buildMidtransOrderId(
  service: OrderService,
  orderId: string,
): string {
  return `${service}${ORDER_ID_SEPARATOR}${orderId}`;
}

/** Hasil parse `order_id` Midtrans; validasi layanan dilakukan pemanggil. */
export interface ParsedMidtransOrderId {
  service: string;
  orderId: string;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Membongkar `order_id` hasil `buildMidtransOrderId`.
 * Mengembalikan `null` bila format tidak dikenal (bukan `layanan_<uuid>`).
 */
export function parseMidtransOrderId(
  raw: string,
): ParsedMidtransOrderId | null {
  const value = raw.trim();
  const separatorIndex = value.indexOf(ORDER_ID_SEPARATOR);
  if (separatorIndex <= 0) {
    return null;
  }

  const service = value.slice(0, separatorIndex);
  const orderId = value.slice(separatorIndex + 1);
  if (!/^[a-z]+$/.test(service) || !UUID_PATTERN.test(orderId)) {
    return null;
  }

  return { service, orderId };
}

/** Hasil pembayaran yang perlu ditindaklanjuti oleh webhook. */
export type MidtransPaymentOutcome = "paid" | "cancelled";

/**
 * Menerjemahkan `transaction_status` notifikasi menjadi aksi status pesanan:
 * `settlement`/`capture` → lunas; `deny`/`cancel`/`expire`/`failure` → batal;
 * status lain (`pending`, refund, dsb.) diabaikan (`null`).
 */
export function resolveMidtransPaymentOutcome(
  transactionStatus: string,
  fraudStatus?: string,
): MidtransPaymentOutcome | null {
  if (fraudStatus === "deny") {
    return "cancelled";
  }

  switch (transactionStatus) {
    case "settlement":
    case "capture":
      return "paid";
    case "deny":
    case "cancel":
    case "expire":
    case "failure":
      return "cancelled";
    default:
      return null;
  }
}

/** Promise pemuatan `snap.js` yang sedang berjalan (di-cache lintas modal). */
let snapScriptPromise: Promise<void> | null = null;

/**
 * Memuat skrip `snap.js` sekali per halaman dan menunggu `window.snap` siap.
 * Melempar error ramah bila env client hilang atau skrip gagal dimuat
 * (mis. diblokir jaringan) agar modal pembayaran dapat menampilkan retry.
 */
export function loadMidtransSnapScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("Snap.js hanya dapat dimuat di browser."),
    );
  }

  if (window.snap) {
    return Promise.resolve();
  }

  if (snapScriptPromise) {
    return snapScriptPromise;
  }

  let config: MidtransClientConfig;
  try {
    config = getMidtransClientConfig();
  } catch (cause) {
    return Promise.reject(
      cause instanceof Error
        ? cause
        : new Error("Konfigurasi Midtrans Snap belum lengkap."),
    );
  }

  snapScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(SNAP_SCRIPT_ELEMENT_ID);
    const script =
      existing instanceof HTMLScriptElement
        ? existing
        : document.createElement("script");

    script.id = SNAP_SCRIPT_ELEMENT_ID;
    script.src = config.snapScriptUrl;
    script.async = true;
    script.setAttribute("data-client-key", config.clientKey);

    script.onload = () => {
      if (window.snap) {
        resolve();
        return;
      }
      snapScriptPromise = null;
      reject(new Error("Snap.js dimuat tapi API pembayaran tidak tersedia."));
    };

    script.onerror = () => {
      snapScriptPromise = null;
      script.remove();
      reject(
        new Error(
          "Gagal memuat skrip pembayaran Midtrans. Periksa koneksi Anda.",
        ),
      );
    };

    if (!existing) {
      document.head.appendChild(script);
    }
  });

  return snapScriptPromise;
}
