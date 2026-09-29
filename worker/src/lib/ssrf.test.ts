import { describe, expect, it } from "vitest";
import { assertSafeHttpUrl, isBlockedHost } from "./ssrf.js";

describe("SSRF guard", () => {
  it("blocks loopback and private ranges", () => {
    expect(isBlockedHost("127.0.0.1")).toBe(true);
    expect(isBlockedHost("localhost")).toBe(true);
    expect(isBlockedHost("10.0.0.5")).toBe(true);
    expect(isBlockedHost("192.168.1.1")).toBe(true);
    expect(isBlockedHost("169.254.169.254")).toBe(true);
    expect(isBlockedHost("172.16.0.1")).toBe(true);
  });

  it("allows public hosts", () => {
    expect(isBlockedHost("news.google.com")).toBe(false);
    expect(() => assertSafeHttpUrl("https://example.com/feed.xml")).not.toThrow();
  });

  it("rejects file and metadata URLs", () => {
    expect(() => assertSafeHttpUrl("file:///etc/passwd")).toThrow();
    expect(() => assertSafeHttpUrl("http://127.0.0.1/secret")).toThrow(/blocked_host/);
    expect(() => assertSafeHttpUrl("http://169.254.169.254/latest")).toThrow();
  });
});
