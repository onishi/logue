import type { ChoiceOption, Entry, Metric, MetricGroup, MetricType } from "@logue/shared";

// jsdom (apps/web の Jest テスト環境) はグローバル Response を提供しないため、
// apiJson が参照する最小限の形（ok/status/json）だけを持つスタブを返す。
type MockResponse = { ok: boolean; status: number; json: () => Promise<unknown> };

/**
 * apps/api の metric-groups / metrics / entries エンドポイントを模した、テスト専用のインメモリ
 * fetch モック。実際の API を Miniflare なしで結合テストするための軽量スタブ。
 */
export function createMockApiServer(baseUrl: string) {
  let nextId = 1;
  const id = (prefix: string) => `${prefix}-${nextId++}`;

  const groups: MetricGroup[] = [];
  const metrics: Metric[] = [];
  const entries: Entry[] = [];

  function json(body: unknown, status = 200): MockResponse {
    return { ok: status < 400, status, json: async () => body };
  }

  function noContent(): MockResponse {
    return { ok: true, status: 204, json: async () => null };
  }

  function reorder<T extends { id: string; sortOrder: number }>(
    list: T[],
    orderedIds: string[],
  ): T[] {
    const byId = new Map(list.map((item) => [item.id, item]));
    orderedIds.forEach((itemId, index) => {
      const item = byId.get(itemId);
      if (item) item.sortOrder = index;
    });
    return [...list].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async function handle(input: string, init?: RequestInit): Promise<MockResponse> {
    const url = new URL(input);
    const path = url.pathname;
    const method = (init?.method ?? "GET").toUpperCase();
    const body = init?.body
      ? (JSON.parse(init.body as string) as Record<string, unknown>)
      : undefined;

    if (path === "/api/metric-groups" && method === "GET") {
      return json([...groups].sort((a, b) => a.sortOrder - b.sortOrder));
    }
    if (path === "/api/metric-groups" && method === "POST") {
      const created: MetricGroup = {
        id: id("g"),
        name: body?.name as string,
        sortOrder: (body?.sortOrder as number | undefined) ?? groups.length,
      };
      groups.push(created);
      return json(created, 201);
    }
    if (path === "/api/metric-groups/reorder" && method === "PUT") {
      reorder(groups, body?.orderedIds as string[]);
      return json([...groups].sort((a, b) => a.sortOrder - b.sortOrder));
    }
    const groupMatch = path.match(/^\/api\/metric-groups\/(.+)$/);
    if (groupMatch && method === "PATCH") {
      const group = groups.find((g) => g.id === groupMatch[1]);
      if (!group) return json({ error: "not_found" }, 404);
      if (typeof body?.name === "string") group.name = body.name;
      if (typeof body?.sortOrder === "number") group.sortOrder = body.sortOrder;
      return json(group);
    }
    if (groupMatch && method === "DELETE") {
      const index = groups.findIndex((g) => g.id === groupMatch[1]);
      if (index === -1) return json({ error: "not_found" }, 404);
      groups.splice(index, 1);
      metrics.forEach((m) => {
        if (m.metricGroupId === groupMatch[1]) m.metricGroupId = null;
      });
      return noContent();
    }

    if (path === "/api/metrics" && method === "GET") {
      return json([...metrics].sort((a, b) => a.sortOrder - b.sortOrder));
    }
    if (path === "/api/metrics" && method === "POST") {
      const choiceOptions: ChoiceOption[] = (
        (body?.choiceOptions as { label: string }[] | undefined) ?? []
      ).map((o, index) => ({ id: id("o"), label: o.label, sortOrder: index }));
      const created: Metric = {
        id: id("m"),
        metricGroupId: (body?.metricGroupId as string | null | undefined) ?? null,
        name: body?.name as string,
        type: body?.type as MetricType,
        unit: (body?.unit as string | null | undefined) ?? null,
        sortOrder: (body?.sortOrder as number | undefined) ?? metrics.length,
        isArchived: false,
        choiceOptions,
      };
      metrics.push(created);
      return json(created, 201);
    }
    if (path === "/api/metrics/reorder" && method === "PUT") {
      reorder(metrics, body?.orderedIds as string[]);
      return json([...metrics].sort((a, b) => a.sortOrder - b.sortOrder));
    }
    const metricMatch = path.match(/^\/api\/metrics\/(.+)$/);
    if (metricMatch && method === "PATCH") {
      const metric = metrics.find((m) => m.id === metricMatch[1]);
      if (!metric) return json({ error: "not_found" }, 404);
      if (typeof body?.name === "string") metric.name = body.name;
      if (body && "unit" in body) metric.unit = body.unit as string | null;
      if (body && "metricGroupId" in body)
        metric.metricGroupId = body.metricGroupId as string | null;
      if (typeof body?.sortOrder === "number") metric.sortOrder = body.sortOrder;
      if (typeof body?.isArchived === "boolean") metric.isArchived = body.isArchived;
      if (body?.choiceOptions) {
        metric.choiceOptions = (body.choiceOptions as { label: string }[]).map((o, index) => ({
          id: id("o"),
          label: o.label,
          sortOrder: index,
        }));
      }
      return json(metric);
    }
    if (metricMatch && method === "DELETE") {
      const index = metrics.findIndex((m) => m.id === metricMatch[1]);
      if (index === -1) return json({ error: "not_found" }, 404);
      metrics.splice(index, 1);
      return noContent();
    }

    if (path === "/api/entries" && method === "GET") {
      const metricId = url.searchParams.get("metricId");
      const from = url.searchParams.get("from");
      const to = url.searchParams.get("to");
      const filtered = entries
        .filter((e) => !metricId || e.metricId === metricId)
        .filter((e) => !from || e.recordedAt >= from)
        .filter((e) => !to || e.recordedAt <= to)
        .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
      return json(filtered);
    }
    if (path === "/api/entries" && method === "POST") {
      const created: Entry = {
        id: id("e"),
        metricId: body?.metricId as string,
        value: body?.value as string,
        recordedAt: body?.recordedAt as string,
      };
      entries.push(created);
      return json(created, 201);
    }
    const entryMatch = path.match(/^\/api\/entries\/(.+)$/);
    if (entryMatch && method === "PATCH") {
      const entry = entries.find((e) => e.id === entryMatch[1]);
      if (!entry) return json({ error: "not_found" }, 404);
      if (typeof body?.value === "string") entry.value = body.value;
      if (typeof body?.recordedAt === "string") entry.recordedAt = body.recordedAt;
      return json(entry);
    }
    if (entryMatch && method === "DELETE") {
      const index = entries.findIndex((e) => e.id === entryMatch[1]);
      if (index === -1) return json({ error: "not_found" }, 404);
      entries.splice(index, 1);
      return noContent();
    }

    throw new Error(`mockApiServer: unhandled request ${method} ${path}`);
  }

  const fetchMock = jest.fn((input: RequestInfo | URL, init?: RequestInit) =>
    handle(typeof input === "string" ? input : input.toString(), init),
  ) as unknown as typeof fetch;

  return { fetchMock, groups, metrics, entries, baseUrl };
}
