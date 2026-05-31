import { describe, expect, it } from "vitest";
import { supportedOriginOf } from "./rtl";

describe("supportedOriginOf", () => {
  it("returns the origin for a normal web page", () => {
    expect(supportedOriginOf("https://example.com/path?q=1")).toBe(
      "https://example.com",
    );
  });

  it("rejects restricted browser pages", () => {
    expect(supportedOriginOf("chrome://extensions")).toBeUndefined();
    expect(supportedOriginOf("about:blank")).toBeUndefined();
    expect(
      supportedOriginOf("https://chromewebstore.google.com/detail/abc"),
    ).toBeUndefined();
  });

  it("rejects non-web pages", () => {
    expect(supportedOriginOf("file:///example/manual.html")).toBeUndefined();
  });

  it("rejects pdf documents", () => {
    expect(supportedOriginOf("file:///example/manual.pdf")).toBeUndefined();
    expect(supportedOriginOf("https://example.com/manual.pdf")).toBeUndefined();
    expect(
      supportedOriginOf("https://example.com/manual.PDF?download=1"),
    ).toBeUndefined();
  });

  it("returns undefined for missing or malformed urls", () => {
    expect(supportedOriginOf(undefined)).toBeUndefined();
    expect(supportedOriginOf("not a url")).toBeUndefined();
  });
});
