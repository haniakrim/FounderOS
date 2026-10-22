"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Trash2 } from "lucide-react";
import { GButton, GInput, GSectionHeader } from "@/components/g";
import { Label } from "@/components/terminal";

const DEMO_NOTE =
  "You are on the demo company, and demo data is not yours. Switch to real data above to export or delete.";

/** Delete state and call, shared by both trees of /setup. */
function useDeleteAll() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (typed !== "DELETE") return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/data/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE" }),
      });
      const body = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !body.ok)
        throw new Error(body.error ?? `Delete failed (${res.status})`);
      setDone(true);
      setOpen(false);
      setTyped("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return { open, setOpen, typed, setTyped, busy, error, done, submit };
}

const COPY = {
  blurb:
    "Export downloads a snapshot of your database and your brain folder as one .tar.gz. Delete wipes the database back to an empty install; export first, because it cannot be undone.",
  confirm: "Type DELETE to erase all of your data.",
  done: "All data deleted. The OS is back to an empty install.",
};

export function YourDataG({ demo }: { demo: boolean }) {
  const d = useDeleteAll();
  return (
    <div className="kg-setting">
      <p className="kg-body">{demo ? DEMO_NOTE : COPY.blurb}</p>
      <div className="kg-setting-actions">
        <GButton
          variant="sm"
          href="/api/data/export"
          download
          disabled={demo}
          disabledReason="Demo data is not yours"
        >
          <Download size={13} strokeWidth={1.8} /> Export everything
        </GButton>
        <GButton
          variant="danger"
          size="sm"
          onClick={() => d.setOpen(!d.open)}
          disabled={demo}
          disabledReason="Demo data is not yours"
        >
          <Trash2 size={13} strokeWidth={1.8} /> Delete all data
        </GButton>
      </div>
      {d.open && !demo ? (
        <form onSubmit={d.submit} className="kg-setting-actions">
          <GInput
            value={d.typed}
            onChange={(e) => d.setTyped(e.target.value)}
            placeholder="DELETE"
            aria-label="Type DELETE to confirm"
            autoComplete="off"
          />
          <GButton
            variant="danger"
            size="sm"
            type="submit"
            busy={d.busy}
            disabled={d.typed !== "DELETE"}
            disabledReason={COPY.confirm}
          >
            Delete forever
          </GButton>
        </form>
      ) : null}
      {d.error ? (
        <p className="kg-body" role="alert">
          {d.error}
        </p>
      ) : null}
      {d.done ? <p className="kg-body">{COPY.done}</p> : null}
    </div>
  );
}

const btn =
  "inline-flex items-center gap-1.5 rounded-[6px] border border-os-border-strong bg-os-surface2 px-3 py-1 text-[11.5px] text-os-muted transition-colors hover:bg-os-surface3 hover:text-os-text disabled:opacity-50";

export function YourDataClassic({ demo }: { demo: boolean }) {
  const d = useDeleteAll();
  return (
    <section className="mb-10 max-w-[860px]">
      <Label rule>Your data</Label>
      <p className="mb-3 mt-2 text-[12.5px] text-os-dim">
        {demo ? DEMO_NOTE : COPY.blurb}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {demo ? (
          <button type="button" disabled className={btn}>
            <Download size={12} strokeWidth={1.8} /> Export everything
          </button>
        ) : (
          <a href="/api/data/export" download className={btn}>
            <Download size={12} strokeWidth={1.8} /> Export everything
          </a>
        )}
        <button
          type="button"
          disabled={demo}
          onClick={() => d.setOpen(!d.open)}
          className={`${btn} text-os-warn`}
        >
          <Trash2 size={12} strokeWidth={1.8} /> Delete all data
        </button>
      </div>
      {d.open && !demo ? (
        <form
          onSubmit={d.submit}
          className="mt-3 flex flex-wrap items-center gap-2"
        >
          <input
            value={d.typed}
            onChange={(e) => d.setTyped(e.target.value)}
            placeholder="DELETE"
            aria-label="Type DELETE to confirm"
            autoComplete="off"
            className="rounded-[6px] border border-os-border-strong bg-os-surface2 px-3 py-1 text-[12.5px] text-os-text"
          />
          <button
            type="submit"
            disabled={d.busy || d.typed !== "DELETE"}
            className={`${btn} text-os-warn`}
          >
            {d.busy ? "Deleting" : "Delete forever"}
          </button>
        </form>
      ) : null}
      {d.error ? (
        <p className="mt-2 text-[11.5px] text-os-warn">{d.error}</p>
      ) : null}
      {d.done ? (
        <p className="mt-2 text-[11.5px] text-os-muted">{COPY.done}</p>
      ) : null}
    </section>
  );
}

/** The "Your data" section for either /setup tree. */
export function YourData({ demo, tree }: { demo: boolean; tree: 'glados' | 'classic' }) {
  if (tree === 'classic') return <YourDataClassic demo={demo} />;
  return (
    <section className="kg-section" id="your-data" aria-labelledby="setup-your-data">
      <GSectionHeader size={22} id="setup-your-data" title="Your data" caption="Take everything with you, or erase it." />
      <YourDataG demo={demo} />
    </section>
  );
}
