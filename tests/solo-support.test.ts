import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, test } from "vitest";
import { SoloPath } from "@/components/setup/SoloPath";
import { SupportContact } from "@/components/SupportContact";
import { resolveSupportEmail } from "@/lib/creds";
import type { SystemSetup } from "@/lib/system-setup";

const step = (id: string, status: "open" | "verified") => ({
  id,
  title: `T ${id}`,
  detail: `D ${id}`,
  status,
  auto: true,
});

describe("F6 solo-first setup", () => {
  const setup = {
    totals: { total: 4, verified: 1, marked: 0, open: 3 },
    phases: [
      {
        n: 1,
        title: "P",
        blurb: "",
        steps: [
          step("a", "verified"),
          step("b", "open"),
          step("c", "open"),
          step("d", "open"),
        ],
      },
    ],
  } as unknown as SystemSetup;
  const all = setup.phases[0].steps.map((s) =>
    createElement("i", { key: s.id, id: `setup-step-${s.id}` }),
  );

  test("shows two next open steps and keeps every step id in the DOM behind the toggle", () => {
    const html = renderToStaticMarkup(
      createElement(SoloPath, { setup, children: all }),
    );
    const next = html.split('data-testid="all-steps"')[0];
    expect(next).toContain('href="#setup-step-b"');
    expect(next).toContain('href="#setup-step-c"');
    expect(next).not.toContain('href="#setup-step-d"');
    expect(html).toContain("Show all steps");
    for (const id of ["a", "b", "c", "d"])
      expect(html).toContain(`id="setup-step-${id}"`);
  });
});

describe("F7 write to the maker", () => {
  const prev = process.env.MATCHCO_SUPPORT_EMAIL;
  afterEach(() => {
    if (prev === undefined) delete process.env.MATCHCO_SUPPORT_EMAIL;
    else process.env.MATCHCO_SUPPORT_EMAIL = prev;
  });

  test("unset shows Not configured with a Set up link", () => {
    const html = renderToStaticMarkup(
      createElement(SupportContact, { email: null }),
    );
    expect(html).toContain("Not configured");
    expect(html).toContain("Set up");
    expect(html).not.toContain("mailto:");
  });

  test("set shows a mailto link", () => {
    const html = renderToStaticMarkup(
      createElement(SupportContact, { email: "maker@example.com" }),
    );
    expect(html).toContain('href="mailto:maker@example.com"');
    expect(html).not.toContain("Not configured");
  });

  test("resolver reads env and rejects junk", () => {
    process.env.MATCHCO_SUPPORT_EMAIL = "not an email";
    expect(resolveSupportEmail()).toBeNull();
    process.env.MATCHCO_SUPPORT_EMAIL = "maker@example.com";
    expect(resolveSupportEmail()).toBe("maker@example.com");
  });
});
