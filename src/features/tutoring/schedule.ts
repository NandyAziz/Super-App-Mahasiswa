const LOCAL_DATETIME_LENGTH = 16;

const scheduleFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

/**
 * Mengubah nilai `datetime-local` ("YYYY-MM-DDTHH:mm") menjadi ISO string.
 * Wall-clock dari input disimpan apa adanya (dianggap UTC) agar jam yang
 * dipilih mahasiswa tetap sama saat ditampilkan kembali.
 */
export function toScheduledAtIso(value: string): string {
  const withSeconds =
    value.length === LOCAL_DATETIME_LENGTH ? `${value}:00` : value;

  return new Date(`${withSeconds}Z`).toISOString();
}

/** Menampilkan jadwal sesi (konsisten dengan konvensi wall-clock UTC). */
export function formatSchedule(iso: string): string {
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime())
    ? "-"
    : scheduleFormatter.format(parsed);
}

/** Nilai awal input `datetime-local`: besok pukul 19:00 (wall-clock UTC). */
export function getDefaultScheduleValue(): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 1);
  date.setUTCHours(19, 0, 0, 0);

  return date.toISOString().slice(0, LOCAL_DATETIME_LENGTH);
}

