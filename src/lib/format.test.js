import { describe, it, expect } from "vitest";
import { fmt, usd, inr, fmtBig, fmtTok, usdSmall } from "./format.js";

describe("fmt", () => {
  it("formats with thousands separators at the given decimal precision", () => {
    expect(fmt(1234567, 0)).toBe("1,234,567");
    expect(fmt(1234.5, 1)).toBe("1,234.5");
  });

  it("returns an em dash for null, undefined, or NaN — never a literal 'NaN' string", () => {
    expect(fmt(null)).toBe("—");
    expect(fmt(undefined)).toBe("—");
    expect(fmt(NaN)).toBe("—");
  });
});

describe("usd / inr", () => {
  it("prefixes with the currency symbol and rounds to a whole number", () => {
    expect(usd(1234.6)).toBe("$1,235");
    expect(inr(83500)).toBe("₹83,500");
  });
});

describe("fmtBig", () => {
  it("picks the correct FLOPs magnitude suffix per range", () => {
    expect(fmtBig(5e14)).toBe("500.00 TFLOPs");
    expect(fmtBig(5e17)).toBe("500.00 PFLOPs");
    expect(fmtBig(5e20)).toBe("500.00 EFLOPs");
    expect(fmtBig(5e23)).toBe("500.00 ZFLOPs");
  });

  it("falls back to plain fmt() below the TFLOPs threshold — no silent truncation at BOM-scale numbers", () => {
    expect(fmtBig(123456789)).toBe(fmt(123456789));
  });
});

describe("fmtTok", () => {
  it("picks the correct token-count magnitude suffix per range", () => {
    expect(fmtTok(2.5e12)).toBe("2.50T tok");
    expect(fmtTok(2.5e9)).toBe("2.50B tok");
    expect(fmtTok(2.5e6)).toBe("2.50M tok");
    expect(fmtTok(2500)).toBe(fmt(2500) + " tok");
  });
});

describe("usdSmall", () => {
  it("keeps 4-6 fractional digits for sub-cent per-token/per-inference pricing", () => {
    expect(usdSmall(0.00012345)).toBe("$0.000123");
  });
});
