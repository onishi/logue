import type { ApiClientOptions } from "./http";
import { createEntriesClient } from "./entries";
import { createMetricGroupsClient } from "./metricGroups";
import { createMetricsClient } from "./metrics";

export { ApiError } from "./apiError";
export type { ApiClientOptions } from "./http";
export type { ListEntriesParams } from "./entries";

export function createApiClient(options: ApiClientOptions) {
  return {
    metricGroups: createMetricGroupsClient(options),
    metrics: createMetricsClient(options),
    entries: createEntriesClient(options),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
