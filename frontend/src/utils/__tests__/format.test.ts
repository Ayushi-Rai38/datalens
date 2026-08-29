import { describe, expect, it } from "vitest";
import { formatBytes, formatPercent, scoreColor } from "../format";

describe("formatBytes", () => {
  it("formats zero bytes", () => {
    expect(formatBytes(0)).toBe("0 B");
  });

  it("formats kilobytes", () => {
    expect(formatBytes(2048)).toBe("2.0 KB");
  });
});

describe("formatPercent", () => {
  it("returns dash for null", () => {
    expect(formatPercent(null)).toBe("-");
  });

  it("formats a percentage", () => {
    expect(formatPercent(12.345)).toBe("12.3%");
  });
});

describe("scoreColor", () => {
  it("colors high scores green", () => {
    expect(scoreColor(90)).toContain("emerald");
  });

  it("colors low scores red", () => {
    expect(scoreColor(30)).toContain("red");
  });
});
