import { ConvexReactClient } from 'convex/react'

const url = import.meta.env.VITE_CONVEX_URL as string | undefined

let cached: ConvexReactClient | null = null

export const getConvexClient = (): ConvexReactClient => {
  if (cached) return cached
  if (!url) {
    throw new Error(
      'VITE_CONVEX_URL is not set — add it to apps/web/.env.local',
    )
  }
  cached = new ConvexReactClient(url, {
    expectAuth: true,
    unsavedChangesWarning: false,
  })
  return cached
}
