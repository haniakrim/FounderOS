import { Badge } from "@/components/terminal";
import { SetupLink } from "@/components/SetupLink";

/** "Write to the maker": a mailto to a human. Unset shows Not configured + Set up. */
export function SupportContact({ email }: { email: string | null }) {
  if (!email) {
    return (
      <p className="flex flex-wrap items-center gap-2 text-[12.5px] text-os-dim">
        Write to the maker
        <Badge tone="warn">Not configured</Badge>
        <SetupLink
          href="/setup#support"
          hint="Set MATCHCO_SUPPORT_EMAIL in .env.local"
        />
      </p>
    );
  }
  return (
    <p className="text-[12.5px] text-os-dim">
      <a
        href={`mailto:${email}`}
        className="text-os-accent underline-offset-2 hover:underline"
      >
        Write to the maker
      </a>
    </p>
  );
}
