import { NO_SOURCES_LABEL, NO_WHY_LABEL } from "@/lib/agents/provenance";

/**
 * Under every agent result: why the agent said it, and what it read to get
 * there. A gap is stated, never filled ("No sources given").
 */
export function RunProvenance({
  why,
  sources,
}: {
  why: string | null | undefined;
  sources: readonly string[] | undefined;
}) {
  const list = sources ?? [];
  return (
    <dl
      className="ml-[22px] mt-1.5 flex flex-col gap-0.5 text-[11.5px] leading-snug text-os-dim"
      data-testid="run-provenance"
    >
      <div className="flex gap-1.5">
        <dt className="shrink-0 text-os-muted">Why</dt>
        <dd className="min-w-0">{why ?? NO_WHY_LABEL}</dd>
      </div>
      <div className="flex gap-1.5">
        <dt className="shrink-0 text-os-muted">Sources</dt>
        <dd className="min-w-0 break-words">
          {list.length ? list.join(" · ") : NO_SOURCES_LABEL}
        </dd>
      </div>
    </dl>
  );
}
