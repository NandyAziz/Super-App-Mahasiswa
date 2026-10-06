"use client";

import { useEffect } from "react";
import { markAllNotificationsReadAction } from "../actions";

/**
 * Menandai seluruh notifikasi sebagai dibaca begitu `/inbox` selesai mount.
 * Hanya berjalan sekali per mount sehingga tidak memicu update berulang.
 */
export function MarkAllNotificationsRead() {
  useEffect(() => {
    void markAllNotificationsReadAction();
  }, []);

  return null;
}
