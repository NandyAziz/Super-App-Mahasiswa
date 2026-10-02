/**
 * Nilai status `order_status` (enum Postgres) pada alur pembayaran manual QRIS.
 *
 * Pemesan memindai QRIS merchant, mengunggah bukti transfer → status menjadi
 * `PENDING_VERIFICATION`; operator memverifikasi lalu menandainya `PAID`
 * (Jastip memakai `accepted` sebagai status "sudah dibayar").
 */
export const PENDING_VERIFICATION_STATUS = "PENDING_VERIFICATION";

/** Status "lunas" untuk layanan non-Jastip. */
export const PAID_ORDER_STATUS = "PAID";
