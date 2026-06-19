import type { FerryProvider } from './provider'
import { MockFerryProvider } from './mock-provider'

/**
 * Fail-safe provider selector. Dentur ONLY when explicitly enabled
 * (USE_MOCK_FERRY === 'false') AND a token is present; every other state
 * (flag unset/empty/'true', or no token) falls back to mock. Mirrors the
 * insurance USE_MOCK_QUOTE convention.
 *
 * Async + dynamic import so the 'server-only' Dentur module is never pulled
 * into a client bundle by the mock path.
 */
export async function getFerryProvider(): Promise<FerryProvider> {
  const denturEnabled =
    process.env.USE_MOCK_FERRY === 'false' && !!process.env.DENTUR_API_TOKEN
  if (!denturEnabled) return MockFerryProvider
  const { DenturFerryProvider } = await import('./dentur-provider')
  return DenturFerryProvider
}
