import { describe, expect, it, vi, afterEach } from "vitest";
import { WORKER_UA, fetchWithRetry } from "./http.js";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("fetchWithRetry", () => {
  it("always sends a contact User-Agent", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);
    await fetchWithRetry("https://example.com/x");
    const headers = new Headers(fetchMock.mock.calls[0][1]?.headers);
    expect(headers.get("User-Agent")).toBe(WORKER_UA);
    expect(WORKER_UA).toMatch(/banglarvoice24news@gmail\.com/);
  });

  it("retries a timeout-like 408 then succeeds", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 408 })
      .mockResolvedValueOnce({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);
    const pending = fetchWithRetry("https://example.com/slow", {}, { retries: 1, timeoutMs: 1000 });
    await vi.runAllTimersAsync();
    const res = await pending;
    expect(res?.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry a 403", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 403 });
    vi.stubGlobal("fetch", fetchMock);
    const res = await fetchWithRetry("https://example.com/forbidden");
    expect(res?.status).toBe(403);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries 5xx with backoff then returns the last response", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);
    const pending = fetchWithRetry("https://example.com/flaky", {}, { retries: 1, timeoutMs: 1000 });
    await vi.runAllTimersAsync();
    const res = await pending;
    expect(res?.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
