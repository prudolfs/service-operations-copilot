import type { z } from 'zod'

export type StepDefinition<TData extends Record<string, unknown>> = {
  id: string
  title: string
  fields: (keyof TData)[]
  schema: z.ZodType
  component: React.ComponentType
}
