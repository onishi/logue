export const PACKAGE_NAME = "@logue/shared";

export type { User } from "./types/user";

export {
  metricGroupSchema,
  createMetricGroupInputSchema,
  updateMetricGroupInputSchema,
} from "./schemas/metricGroup";
export type {
  MetricGroup,
  CreateMetricGroupInput,
  UpdateMetricGroupInput,
} from "./schemas/metricGroup";

export {
  valueTypeSchema,
  choiceOptionSchema,
  metricSchema,
  createMetricInputSchema,
  updateMetricInputSchema,
} from "./schemas/metric";
export type {
  ValueType,
  ChoiceOption,
  Metric,
  CreateMetricInput,
  UpdateMetricInput,
} from "./schemas/metric";

export { entrySchema, createEntryInputSchema, updateEntryInputSchema } from "./schemas/entry";
export type { Entry, CreateEntryInput, UpdateEntryInput } from "./schemas/entry";
