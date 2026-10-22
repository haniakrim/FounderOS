import {
  SYNC_DETAIL,
  SYNC_LABEL,
  type SyncDirection,
} from "@/lib/connectors/sync";

const PATHS: Record<SyncDirection, string[]> = {
  read: ["M12 4v12", "M7 11l5 5 5-5", "M5 20h14"],
  write: ["M12 20V8", "M7 13l5-5 5 5", "M5 4h14"],
  "two-way": ["M7 4v14", "M3 14l4 4 4-4", "M17 20V6", "M13 10l4-4 4 4"],
  "webhook-in": ["M4 12h12", "M12 7l5 5-5 5", "M20 5v14"],
};

/** Inline stroke icon for a sync direction. */
export function SyncIcon({ sync }: { sync: SyncDirection }) {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {PATHS[sync].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

/** Classic-tree direction badge: icon plus text, token colours only. */
export function SyncBadge({
  sync,
  className,
}: {
  sync?: SyncDirection;
  className?: string;
}) {
  if (!sync) return null;
  return (
    <span
      data-sync={sync}
      title={SYNC_DETAIL[sync]}
      className={`inline-flex items-center gap-1 rounded-[8px] border border-os-border px-1.5 py-[1px] text-[11px] leading-tight text-os-dim ${className ?? ""}`}
    >
      <SyncIcon sync={sync} />
      {SYNC_LABEL[sync]}
    </span>
  );
}
