import { cn } from "@/lib/utils";
import { getOrderServiceMeta } from "@/features/orders/service-meta";
import type { AppNotification, NotificationTone } from "../types";

interface NotificationItemProps {
  notification: AppNotification;
}

const TONE_DOT: Record<NotificationTone, string> = {
  info: "bg-blue-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-rose-500",
};

export function NotificationItem({ notification }: NotificationItemProps) {
  const serviceMeta = getOrderServiceMeta(notification.service);
  const Icon = serviceMeta.icon;

  return (
    <li className="flex gap-3 rounded-3xl border border-white/20 bg-white/70 p-4 shadow-sm backdrop-blur-md">
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
          serviceMeta.tint,
        )}
      >
        <Icon className="h-5 w-5" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", TONE_DOT[notification.tone])} />
          <p className="truncate text-sm font-semibold text-zinc-900">
            {notification.title}
          </p>
        </div>
        <p className="mt-0.5 truncate text-xs text-zinc-500">
          {notification.body}
        </p>
        <p className="mt-1 text-[0.65rem] text-zinc-400">
          {serviceMeta.label} · {notification.createdLabel}
        </p>
      </div>
    </li>
  );
}
