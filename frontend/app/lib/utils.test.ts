import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  capitalize,
  enumToSentenceCase,
  filterPublicationTypeTags,
  formatDate,
  formatTime,
  isCurrentYear,
  snakeToSpace,
  toSentenceCase
} from "./utils";

describe("snakeToSpace", () => {
  it("should replace underscores with spaces", () => {
    expect(snakeToSpace("not_actively_updating")).toBe("not actively updating");
  });

  it("should replace all underscores, not just the first", () => {
    expect(snakeToSpace("a_b_c")).toBe("a b c");
  });

  it("should leave strings without underscores unchanged", () => {
    expect(snakeToSpace("read")).toBe("read");
  });

  it("should handle an empty string", () => {
    expect(snakeToSpace("")).toBe("");
  });
});

describe("enumToSentenceCase", () => {
  it("should format an uppercase snake_case enum as sentence case", () => {
    expect(enumToSentenceCase("NOT_ACTIVELY_UPDATING")).toBe(
      "Not actively updating"
    );
  });

  it("should format a lowercase snake_case enum as sentence case", () => {
    expect(enumToSentenceCase("not_actively_updating")).toBe(
      "Not actively updating"
    );
  });

  it("should format a single-word enum as sentence case", () => {
    expect(enumToSentenceCase("READ")).toBe("Read");
  });

  it("should handle an empty string", () => {
    expect(enumToSentenceCase("")).toBe("");
  });

  it("should format a real notification state", () => {
    expect(enumToSentenceCase("NEW_PUBLICATION")).toBe("New publication");
    expect(enumToSentenceCase("UPDATED_PUBLICATION")).toBe(
      "Updated publication"
    );
    expect(enumToSentenceCase("COMMENT")).toBe("Comment");
    expect(enumToSentenceCase("REPLY")).toBe("Reply");
    expect(enumToSentenceCase("MESSAGE")).toBe("Message");
  });
});

describe("capitalize", () => {
  it("should uppercase the first letter", () => {
    expect(capitalize("hello")).toBe("Hello");
  });

  it("should leave the rest of the string untouched", () => {
    expect(capitalize("hello World")).toBe("Hello World");
    expect(capitalize("hELLO")).toBe("HELLO");
  });

  it("should leave an already-capitalized string unchanged", () => {
    expect(capitalize("Hello")).toBe("Hello");
  });

  it("should handle a single character", () => {
    expect(capitalize("a")).toBe("A");
  });

  it("should handle an empty string", () => {
    expect(capitalize("")).toBe("");
  });

  it("should leave a non-letter first character unchanged", () => {
    expect(capitalize("1st place")).toBe("1st place");
  });
});

describe("toSentenceCase", () => {
  it("should uppercase the first letter and lowercase the rest", () => {
    expect(toSentenceCase("hello world")).toBe("Hello world");
  });

  it("should lowercase an all-caps string apart from the first letter", () => {
    expect(toSentenceCase("HELLO WORLD")).toBe("Hello world");
  });

  it("should lowercase mixed-case text apart from the first letter", () => {
    expect(toSentenceCase("hELLO")).toBe("Hello");
  });

  it("should handle a single character", () => {
    expect(toSentenceCase("a")).toBe("A");
  });

  it("should handle an empty string", () => {
    expect(toSentenceCase("")).toBe("");
  });

  it("should normalize text that is already mixed case", () => {
    expect(toSentenceCase("already Capitalized TEXT")).toBe(
      "Already capitalized text"
    );
  });
});

describe("isCurrentYear", () => {
  const originalTz = process.env.TZ;

  beforeEach(() => {
    process.env.TZ = "UTC";
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-15T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    process.env.TZ = originalTz;
  });

  it("should return true for a date in the current year", () => {
    expect(isCurrentYear("2024-01-15T00:00:00.000Z")).toBe(true);
  });

  it("should return false for a date in a past year", () => {
    expect(isCurrentYear("2023-12-31T23:59:59.000Z")).toBe(false);
  });

  it("should return false for a date in a future year", () => {
    expect(isCurrentYear("2025-01-01T00:00:00.000Z")).toBe(false);
  });

  it("should return true for the first instant of the current year", () => {
    expect(isCurrentYear("2024-01-01T00:00:00.000Z")).toBe(true);
  });

  it("should return true for the last instant of the current year", () => {
    expect(isCurrentYear("2024-12-31T23:59:59.000Z")).toBe(true);
  });
});

describe("filterPublicationTypeTags", () => {
  it("should keep only tags on the publication-type allowlist", () => {
    expect(filterPublicationTypeTags(["preprint", "Dataset", "new"])).toEqual([
      "Dataset"
    ]);
  });

  it("should match case-insensitively while preserving original casing", () => {
    expect(filterPublicationTypeTags(["dataset", "IDEA", "ResourcE"])).toEqual([
      "dataset",
      "IDEA",
      "ResourcE"
    ]);
  });

  it("should preserve input order rather than allowlist order", () => {
    expect(filterPublicationTypeTags(["Result", "Idea", "Dataset"])).toEqual([
      "Result",
      "Idea",
      "Dataset"
    ]);
  });

  it("should return an empty array when no tags match", () => {
    expect(filterPublicationTypeTags(["preprint", "iced"])).toEqual([]);
  });

  it("should return an empty array for an empty list", () => {
    expect(filterPublicationTypeTags([])).toEqual([]);
  });

  it("should not mutate the input array", () => {
    const tags = ["Dataset", "preprint"];
    filterPublicationTypeTags(tags);
    expect(tags).toEqual(["Dataset", "preprint"]);
  });
});

describe("formatDate", () => {
  const originalTz = process.env.TZ;

  beforeEach(() => {
    process.env.TZ = "UTC";
  });

  afterEach(() => {
    process.env.TZ = originalTz;
  });

  it("should format with the default format string", () => {
    expect(formatDate("2024-06-15T14:30:00.000Z")).toBe("Jun 15, 2024 2:30 PM");
  });

  it("should format with a custom format string", () => {
    expect(formatDate("2024-06-15T14:30:00.000Z", "YYYY-MM-DD")).toBe(
      "2024-06-15"
    );
  });

  it("should convert from UTC to the local timezone, crossing a day boundary", () => {
    process.env.TZ = "America/New_York";
    expect(formatDate("2024-01-01T03:00:00.000Z")).toBe(
      "Dec 31, 2023 10:00 PM"
    );
  });
});

describe("formatTime", () => {
  const originalTz = process.env.TZ;

  beforeEach(() => {
    process.env.TZ = "UTC";
  });

  afterEach(() => {
    process.env.TZ = originalTz;
  });

  it("should format an afternoon time", () => {
    expect(formatTime("2024-06-15T14:05:00.000Z")).toBe("2:05 PM");
  });

  it("should pad single-digit minutes", () => {
    expect(formatTime("2024-06-15T09:07:00.000Z")).toBe("9:07 AM");
  });

  it("should format midnight as 12 AM", () => {
    expect(formatTime("2024-06-15T00:00:00.000Z")).toBe("12:00 AM");
  });

  it("should format noon as 12 PM", () => {
    expect(formatTime("2024-06-15T12:00:00.000Z")).toBe("12:00 PM");
  });
});
