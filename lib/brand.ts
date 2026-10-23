/**
 * The product name and mark this deployment shows. Both builds now ship as
 * Match & CO.; the ids stay so env, cookies and appearance defaults keep working. One codebase ships as two
 * products: the operator's own instance (GLADOS_BRAND=glados) and the
 * invite-only client build, which is the default so a fresh clone needs no
 * setting. next.config.mjs inlines GLADOS_BRAND at build, so this reads the
 * same on the server and in the browser.
 */
export type Brand = { id: 'glados' | 'founderos'; name: string; title: string; mark: string; slug: string };

const BRANDS: Record<Brand['id'], Brand> = {
  glados: { id: 'glados', name: 'Founder OS By Match & CO.', title: 'FOUNDER OS BY MATCH & CO.', mark: '/brand/matchco/matchco-symbol.svg', slug: 'MatchCo' },
  founderos: { id: 'founderos', name: 'Founder OS By Match & CO.', title: 'FOUNDER OS BY MATCH & CO.', mark: '/brand/matchco/matchco-symbol.svg', slug: 'MatchCo' },
};

export function brandFor(raw: string | undefined): Brand {
  return raw?.trim().toLowerCase() === 'glados' ? BRANDS.glados : BRANDS.founderos;
}

export const BRAND: Brand = brandFor(process.env.GLADOS_BRAND);
