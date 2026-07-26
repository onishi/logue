import {
  aggregateByGranularity,
  mergeSeriesForChart,
  movingAverage,
  seriesColorVar,
  toDailySeries,
} from "../graphData";

describe("toDailySeries", () => {
  it("averages multiple entries on the same day and sorts by date", () => {
    const result = toDailySeries([
      { value: "72", recordedAt: "2026-07-02" },
      { value: "70", recordedAt: "2026-07-01" },
      { value: "74", recordedAt: "2026-07-02" },
    ]);
    expect(result).toEqual([
      { date: "2026-07-01", value: 70 },
      { date: "2026-07-02", value: 73 },
    ]);
  });

  it("ignores entries whose value is not numeric", () => {
    const result = toDailySeries([
      { value: "70", recordedAt: "2026-07-01" },
      { value: "unknown-option-id", recordedAt: "2026-07-02" },
    ]);
    expect(result).toEqual([{ date: "2026-07-01", value: 70 }]);
  });
});

describe("movingAverage", () => {
  it("returns the series unchanged for a window of 1 or less", () => {
    const series = [{ date: "2026-07-01", value: 10 }];
    expect(movingAverage(series, 1)).toEqual(series);
    expect(movingAverage(series, 0)).toEqual(series);
  });

  it("averages only points within the trailing calendar-day window", () => {
    const series = [
      { date: "2026-07-01", value: 10 },
      { date: "2026-07-02", value: 20 },
      { date: "2026-07-10", value: 90 },
    ];
    // window=7: 2026-07-10 の窓には 07-04〜07-10 のみが入り、07-01/07-02 は含まれない
    const result = movingAverage(series, 7);
    expect(result).toEqual([
      { date: "2026-07-01", value: 10 },
      { date: "2026-07-02", value: 15 },
      { date: "2026-07-10", value: 90 },
    ]);
  });

  it("computes a standard trailing average when points are dense", () => {
    const series = [
      { date: "2026-07-01", value: 10 },
      { date: "2026-07-02", value: 20 },
      { date: "2026-07-03", value: 30 },
    ];
    const result = movingAverage(series, 30);
    expect(result[2]).toEqual({ date: "2026-07-03", value: 20 });
  });
});

describe("aggregateByGranularity", () => {
  const daily = [
    { date: "2026-06-29", value: 10 }, // Monday
    { date: "2026-06-30", value: 20 }, // Tuesday, same ISO week as 06-29
    { date: "2026-07-06", value: 90 }, // next ISO week
  ];

  it("returns the series unchanged for day granularity", () => {
    expect(aggregateByGranularity(daily, "day")).toEqual(daily);
  });

  it("averages by ISO week", () => {
    const result = aggregateByGranularity(daily, "week");
    expect(result).toEqual([
      { date: "2026-W27", value: 15 },
      { date: "2026-W28", value: 90 },
    ]);
  });

  it("averages by calendar month", () => {
    const result = aggregateByGranularity(daily, "month");
    expect(result).toEqual([
      { date: "2026-06", value: 15 },
      { date: "2026-07", value: 90 },
    ]);
  });
});

describe("mergeSeriesForChart", () => {
  it("merges multiple metric series into rows keyed by date label", () => {
    const result = mergeSeriesForChart([
      {
        metricId: "m1",
        points: [
          { date: "2026-07-01", value: 70 },
          { date: "2026-07-02", value: 71 },
        ],
      },
      {
        metricId: "m2",
        points: [{ date: "2026-07-02", value: 5 }],
      },
    ]);
    expect(result).toEqual([
      { label: "2026-07-01", m1: 70 },
      { label: "2026-07-02", m1: 71, m2: 5 },
    ]);
  });
});

describe("seriesColorVar", () => {
  it("cycles through 8 color slots", () => {
    expect(seriesColorVar(0)).toBe("var(--series-1)");
    expect(seriesColorVar(7)).toBe("var(--series-8)");
    expect(seriesColorVar(8)).toBe("var(--series-1)");
  });
});
