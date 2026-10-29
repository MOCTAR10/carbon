// Feature switches for modules that are paused but kept in the codebase.
// Disabled modules are hidden from navigation and blocked in middleware (pages redirect, APIs 404).
// Re-enable at build time with NEXT_PUBLIC_FEATURE_*=true (inlined into both server and client bundles).

export const FEATURES = {
  /** Partner portal, carbon projects, VVB verification, credits, withdrawals, marketplace, Puro.earth */
  carbonMarket: process.env.NEXT_PUBLIC_FEATURE_CARBON_MARKET === 'true',
  /** RAG assistant (Groq) for companies and partners */
  aiAssistant: process.env.NEXT_PUBLIC_FEATURE_AI_ASSISTANT === 'true',
}

const CARBON_MARKET_PATHS = [
  '/partner',
  '/dashboard/market', '/dashboard/partners',
  '/admin/market', '/admin/partners', '/admin/projects', '/admin/verification',
  '/admin/credits', '/admin/withdrawals', '/admin/documents',
  '/api/partner', '/api/partners', '/api/market', '/api/puro', '/api/vvb-registry',
  '/api/admin/projects', '/api/admin/credits', '/api/auth/partner-me',
]

const AI_ASSISTANT_PATHS = [
  '/dashboard/assistant', '/partner/methodology-assistant',
  '/api/rag', '/api/admin/rag',
]

function matches(pathname: string, prefixes: string[]) {
  return prefixes.some(p => pathname === p || pathname.startsWith(p + '/'))
}

/** True when the path belongs to a module that is currently switched off. */
export function isDisabledPath(pathname: string): boolean {
  if (!FEATURES.carbonMarket && matches(pathname, CARBON_MARKET_PATHS)) return true
  if (!FEATURES.aiAssistant && matches(pathname, AI_ASSISTANT_PATHS)) return true
  return false
}
