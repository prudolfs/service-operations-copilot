/**
 * Test helpers for convex-test. Real test cases (auth rules, mutation
 * authorization, etc.) start in Phase 1.
 */
import { convexTest } from 'convex-test'
import schema from '../convex/schema'

export const setupTest = () => convexTest(schema)
