import { describe, it, expect } from "vitest";
import { classifyFetchError } from "../seo-analyzer.service.js";

// undici enrobe les échecs réseau dans TypeError("fetch failed") avec la
// vraie cause (code Node) dans err.cause, parfois au fond d'un AggregateError.

function undiciError(cause: unknown): Error {
  return new TypeError("fetch failed", { cause });
}

function nodeError(code: string): Error {
  const err = new Error(`connect ${code}`);
  (err as NodeJS.ErrnoException).code = code;
  return err;
}

describe("classifyFetchError", () => {
  it("classifies DNS NXDOMAIN (ENOTFOUND) as unreachable", () => {
    expect(classifyFetchError(undiciError(nodeError("ENOTFOUND")))).toBe(
      "unreachable",
    );
  });

  it("classifies connection refused as unreachable", () => {
    expect(classifyFetchError(undiciError(nodeError("ECONNREFUSED")))).toBe(
      "unreachable",
    );
  });

  it("finds the code inside an AggregateError (multi-adresses IPv4/IPv6)", () => {
    const agg = new AggregateError([
      nodeError("ECONNREFUSED"),
      nodeError("ECONNREFUSED"),
    ]);
    expect(classifyFetchError(undiciError(agg))).toBe("unreachable");
  });

  it("classifies a timeout as transient", () => {
    const timeout = new DOMException("The operation was aborted due to timeout", "TimeoutError");
    expect(classifyFetchError(timeout)).toBe("transient");
  });

  it("classifies connection reset as transient", () => {
    expect(classifyFetchError(undiciError(nodeError("ECONNRESET")))).toBe(
      "transient",
    );
  });

  it("classifies unknown errors as transient (prudence : pas de SITE_DOWN à tort)", () => {
    expect(classifyFetchError(new Error("boom"))).toBe("transient");
  });
});
