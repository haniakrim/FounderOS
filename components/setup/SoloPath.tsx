import type { ReactNode } from "react";
import type { SystemSetup } from "@/lib/system-setup";

/**
 * Solo-first setup: the next one or two open steps up front, every other step
 * behind "Show all steps". The full list stays in the DOM (a native <details>),
 * so nothing is removed and every step id stays reachable.
 */
export function SoloPath({
  setup,
  children,
}: {
  setup: SystemSetup;
  children: ReactNode;
}) {
  const next = setup.phases
    .flatMap((p) => p.steps)
    .filter((s) => s.status === "open")
    .slice(0, 2);
  return (
    <div data-testid="solo-path">
      <div className="mb-4" data-testid="solo-next">
        <p className="text-[12.5px] text-os-dim">
          {next.length > 0 ? "Next for you" : "Every step is done."}
        </p>
        {next.length > 0 && (
          <ol className="mt-2 space-y-2">
            {next.map((s) => (
              <li
                key={s.id}
                className="rounded-lg-t border px-4 py-3"
                style={{ borderColor: "var(--accent-line)" }}
              >
                <a
                  href={`#setup-step-${s.id}`}
                  className="text-[13.5px] font-medium text-os-accent"
                >
                  {s.title}
                </a>
                <p className="mt-1 text-[12.5px] text-os-muted">{s.detail}</p>
              </li>
            ))}
          </ol>
        )}
      </div>
      <details data-testid="all-steps">
        <summary className="cursor-pointer text-[12.5px] text-os-dim">
          Show all steps
        </summary>
        <div className="mt-4">{children}</div>
      </details>
    </div>
  );
}
