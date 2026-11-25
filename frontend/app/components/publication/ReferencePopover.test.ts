import { describe, expect, it } from "vitest";
import { linkInfoLabel, sortedLinkInfos } from "./ReferencePopover";

describe("sortedLinkInfos", () => {
  it("should return items in ascending refNum order when passed in descending order", () => {
    const linkInfos = [
      { refNum: 3, url: "http://example.com/3", text: "Example 3" },
      { refNum: 2, url: "http://example.com/2", text: "Example 2" },
      { refNum: 1, url: "http://example.com/1", text: "Example 1" }
    ];
    expect(sortedLinkInfos(linkInfos).map((info) => info.refNum)).toEqual([
      1, 2, 3
    ]);
  });

  it("should return items in ascending refNum order when passed in mixed order", () => {
    const linkInfos = [
      { refNum: 5, url: "http://example.com/5", text: "Example 5" },
      { refNum: 1, url: "http://example.com/1", text: "Example 1" },
      { refNum: 3, url: "http://example.com/3", text: "Example 3" }
    ];
    expect(sortedLinkInfos(linkInfos).map((info) => info.refNum)).toEqual([
      1, 3, 5
    ]);
  });

  it("should not mutate the original array", () => {
    const linkInfos = [
      { refNum: 2, url: "http://example.com/2", text: "Example 2" },
      { refNum: 1, url: "http://example.com/1", text: "Example 1" }
    ];
    sortedLinkInfos(linkInfos);
    expect(linkInfos[0].refNum).toBe(2);
  });
});

describe("linkInfoLabel", () => {
  it("should group 3 or more consecutive reference numbers with an en dash", () => {
    const linkInfos = [
      { refNum: 1, url: "http://example.com/1", text: "Example 1" },
      { refNum: 2, url: "http://example.com/2", text: "Example 2" },
      { refNum: 3, url: "http://example.com/3", text: "Example 3" }
    ];
    expect(linkInfoLabel(linkInfos)).toBe("1–3");
  });

  it("should not group non-consecutive reference numbers", () => {
    const linkInfos = [
      { refNum: 1, url: "http://example.com/1", text: "Example 1" },
      { refNum: 3, url: "http://example.com/3", text: "Example 3" },
      { refNum: 6, url: "http://example.com/4", text: "Example 4" },
      { refNum: 8, url: "http://example.com/6", text: "Example 6" }
    ];
    expect(linkInfoLabel(linkInfos)).toBe("1,\u202F3,\u202F6,\u202F8");
  });

  it("should handle a mix of consecutive and non-consecutive reference numbers", () => {
    const linkInfos = [
      { refNum: 1, url: "http://example.com/1", text: "Example 1" },
      { refNum: 2, url: "http://example.com/2", text: "Example 2" },
      { refNum: 3, url: "http://example.com/3", text: "Example 3" },
      { refNum: 5, url: "http://example.com/5", text: "Example 5" },
      { refNum: 6, url: "http://example.com/6", text: "Example 6" },
      { refNum: 8, url: "http://example.com/8", text: "Example 8" }
    ];
    expect(linkInfoLabel(linkInfos)).toBe("1\u20133,\u202F5\u20136,\u202F8");
  });
});
