import type { UpdateUserSettingsInput, UserSettings } from "@logue/shared";
import { apiJson, jsonRequestInit } from "./apiClient";

export function getUserSettings(baseUrl: string): Promise<UserSettings> {
  return apiJson(baseUrl, "/api/user-settings");
}

export function updateUserSettings(
  baseUrl: string,
  input: UpdateUserSettingsInput,
): Promise<UserSettings> {
  return apiJson(baseUrl, "/api/user-settings", jsonRequestInit("PATCH", input));
}
