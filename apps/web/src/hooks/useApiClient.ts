import { createApiClient, type ApiClient } from "@logue/shared/client";
import { useMemo } from "react";

export function useApiClient(apiBaseUrl: string): ApiClient {
  return useMemo(() => createApiClient({ baseUrl: apiBaseUrl }), [apiBaseUrl]);
}
