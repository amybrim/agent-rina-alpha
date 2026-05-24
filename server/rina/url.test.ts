import { describe, expect, it } from "vitest";
import { normalizeUrl } from "./url";

describe("normalizeUrl", () => {
  it("rejects empty input", () => {
    expect(normalizeUrl("")).toBeNull();
    expect(normalizeUrl("   ")).toBeNull();
  });

  it("rejects bare hostnames without a TLD", () => {
    expect(normalizeUrl("localhost")).toBeNull();
    expect(normalizeUrl("foo")).toBeNull();
  });

  it("adds https:// when missing", () => {
    expect(normalizeUrl("example.com")).toBe("https://example.com/");
    expect(normalizeUrl("brimm.co")).toBe("https://brimm.co/");
  });

  it("preserves explicit protocol", () => {
    expect(normalizeUrl("http://example.com")).toBe("http://example.com/");
    expect(normalizeUrl("https://example.com/path?q=1")).toBe(
      "https://example.com/path?q=1"
    );
  });

  it("trims whitespace", () => {
    expect(normalizeUrl("  example.com  ")).toBe("https://example.com/");
  });

  it("rejects malformed input", () => {
    expect(normalizeUrl("https://")).toBeNull();
  });
});
