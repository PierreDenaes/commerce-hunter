import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { isBillingEnabled } from "../billing-status.js";

const ORIGINAL_ENV = { ...process.env };

function setEnv(vars: Record<string, string | undefined>) {
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.BILLING_ENABLED;
  for (const [key, value] of Object.entries(vars)) {
    if (value !== undefined) process.env[key] = value;
  }
}

describe("isBillingEnabled", () => {
  beforeEach(() => setEnv({}));
  afterAll(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("is disabled without STRIPE_SECRET_KEY", () => {
    expect(isBillingEnabled()).toBe(false);
  });

  it("is enabled with STRIPE_SECRET_KEY", () => {
    setEnv({ STRIPE_SECRET_KEY: "sk_test_abc" });
    expect(isBillingEnabled()).toBe(true);
  });

  it("BILLING_ENABLED=false overrides a configured key", () => {
    setEnv({ STRIPE_SECRET_KEY: "sk_test_abc", BILLING_ENABLED: "false" });
    expect(isBillingEnabled()).toBe(false);
  });

  it("stays disabled with BILLING_ENABLED=true but no key", () => {
    setEnv({ BILLING_ENABLED: "true" });
    expect(isBillingEnabled()).toBe(false);
  });

  it("ignores an empty STRIPE_SECRET_KEY", () => {
    setEnv({ STRIPE_SECRET_KEY: "" });
    expect(isBillingEnabled()).toBe(false);
  });
});
