import { describe, it, expect } from "vitest";
import { buildBom, financingComparison, unitEconomics, controlNodeSpec } from "./tco.js";
import {
  NODES, FABRICS, PUE_DEFAULT, USD_INR, KWH_USD, KWH_INR, TCO_YEARS, GAAS_DISCOUNT,
  CLOUD_HR, COLO_PER_KW_MONTH,
} from "../data/reference.js";

describe("controlNodeSpec", () => {
  it("floors at 8 vCPU / 64 GB for a single compute node", () => {
    // Matches the tool's original Foundation-tier assumption at nodes=1, so the common
    // demo case (single-node tiers) doesn't visibly regress from this refactor.
    expect(controlNodeSpec(1)).toEqual({ vcpu: 8, ram: 64 });
  });

  it("scales +4 vCPU / +32 GB per additional compute node beyond the first", () => {
    expect(controlNodeSpec(2)).toEqual({ vcpu: 12, ram: 96 });
    expect(controlNodeSpec(4)).toEqual({ vcpu: 20, ram: 160 });
  });

  it("caps at 64 vCPU / 1024 GB for very large clusters", () => {
    const big = controlNodeSpec(1000);
    expect(big.vcpu).toBe(64);
    expect(big.ram).toBe(1024);
  });

  it("never goes below the floor for 0 or negative node counts (defensive)", () => {
    expect(controlNodeSpec(0)).toEqual({ vcpu: 8, ram: 64 });
  });
});

describe("buildBom", () => {
  it("sums hardware + fabric + storage + rack cost into capex", () => {
    const gpuKey = "h100", gpuCount = 16, fabricKey = "ib";
    const storageTB = 100, storageCostPerTB = 700;
    const bom = buildBom({ gpuKey, gpuCount, fabricKey, storageTB, storageCostPerTB });

    const node = NODES[gpuKey];
    const nodes = Math.ceil(gpuCount / 8);
    const hwCost = nodes * node.priceNode;
    const fabricCost = nodes * FABRICS[fabricKey].costPerNode;
    const storageCost = storageTB * storageCostPerTB;
    const rackCost = nodes * 12000;

    expect(bom.nodes).toBe(nodes);
    expect(bom.provisioned).toBe(nodes * 8);
    expect(bom.hwCost).toBe(hwCost);
    expect(bom.fabricCost).toBe(fabricCost);
    expect(bom.storageCost).toBe(storageCost);
    expect(bom.rackCost).toBe(rackCost);
    expect(bom.capex).toBe(hwCost + fabricCost + storageCost + rackCost);
  });

  it("includes control-node vCPU/RAM sizing derived from compute node count", () => {
    const bom = buildBom({ gpuKey: "h100", gpuCount: 16, fabricKey: "ib", storageTB: 0, storageCostPerTB: 0 });
    const expected = controlNodeSpec(bom.nodes);
    expect(bom.ctrlVcpu).toBe(expected.vcpu);
    expect(bom.ctrlRam).toBe(expected.ram);
  });

  it("rounds GPU count up to the next full 8-GPU node", () => {
    const bom = buildBom({ gpuKey: "h100", gpuCount: 9, fabricKey: "ib", storageTB: 0, storageCostPerTB: 0 });
    expect(bom.nodes).toBe(2);
    expect(bom.provisioned).toBe(16);
  });

  it("treats NVLink fabric as zero-cost (intra-node only, no scale-out fabric)", () => {
    const bom = buildBom({ gpuKey: "h100", gpuCount: 8, fabricKey: "nvlink", storageTB: 0, storageCostPerTB: 0 });
    expect(bom.fabricCost).toBe(0);
  });

  it("applies PUE on top of IT power draw for total facility power", () => {
    const bom = buildBom({ gpuKey: "h100", gpuCount: 8, fabricKey: "ib", storageTB: 0, storageCostPerTB: 0, pue: PUE_DEFAULT });
    const itKw = (1 * NODES.h100.powerNode) / 1000;
    expect(bom.itKw).toBeCloseTo(itKw, 6);
    expect(bom.totalKw).toBeCloseTo(itKw * PUE_DEFAULT, 6);
  });
});

describe("financingComparison", () => {
  it("computes all four financing models with positive totals", () => {
    const bom = buildBom({ gpuKey: "h100", gpuCount: 128, fabricKey: "ib", storageTB: 100, storageCostPerTB: 700 });
    const fin = financingComparison({ bom, gpuKey: "h100", region: "us" });
    expect(fin.onPrem.total3yr).toBeGreaterThan(0);
    expect(fin.cloud.total3yr).toBeGreaterThan(0);
    expect(fin.gaas.total3yr).toBeGreaterThan(0);
    expect(fin.colo.total3yr).toBeGreaterThan(0);
  });

  it("On-Premises: exact formula = capex + (annualPowerUsd + annualSupport) * 3", () => {
    const bom = buildBom({ gpuKey: "h100", gpuCount: 128, fabricKey: "ib", storageTB: 100, storageCostPerTB: 700 });
    const fin = financingComparison({ bom, gpuKey: "h100", region: "us" });
    const expected = bom.capex + (fin.annualPowerUsd + bom.annualSupport) * TCO_YEARS;
    expect(fin.onPrem.total3yr).toBeCloseTo(expected, 4);
  });

  it("Public Cloud: exact formula = provisioned GPUs * $/GPU-hr * 8760 * 3", () => {
    const bom = buildBom({ gpuKey: "h100", gpuCount: 128, fabricKey: "ib", storageTB: 100, storageCostPerTB: 700 });
    const fin = financingComparison({ bom, gpuKey: "h100", region: "us" });
    const expected = bom.provisioned * CLOUD_HR.h100 * 8760 * TCO_YEARS;
    expect(fin.cloud.total3yr).toBeCloseTo(expected, 4);
  });

  it("GPU-as-a-Service: exact formula = 0.75 x Public Cloud total (reserved discount)", () => {
    const bom = buildBom({ gpuKey: "h100", gpuCount: 128, fabricKey: "ib", storageTB: 100, storageCostPerTB: 700 });
    const fin = financingComparison({ bom, gpuKey: "h100", region: "us" });
    expect(fin.gaas.total3yr).toBeCloseTo(fin.cloud.total3yr * GAAS_DISCOUNT, 2);
  });

  it("Colocation: exact formula = capex + (totalKw * $150/kW/month * 12 + annualSupport) * 3 years", () => {
    const bom = buildBom({ gpuKey: "h100", gpuCount: 128, fabricKey: "ib", storageTB: 100, storageCostPerTB: 700 });
    const fin = financingComparison({ bom, gpuKey: "h100", region: "us" });
    const expected = bom.capex + (bom.totalKw * COLO_PER_KW_MONTH * 12 + bom.annualSupport) * TCO_YEARS;
    expect(fin.colo.total3yr).toBeCloseTo(expected, 4);
  });

  it("picks the actual minimum as cheapestKey, not just the first option in the list", () => {
    const bom = buildBom({ gpuKey: "mi300x", gpuCount: 8, fabricKey: "ib", storageTB: 5000, storageCostPerTB: 1800 });
    const fin = financingComparison({ bom, gpuKey: "mi300x", region: "us" });
    const totals = { onPrem: fin.onPrem.total3yr, cloud: fin.cloud.total3yr, gaas: fin.gaas.total3yr, colo: fin.colo.total3yr };
    const actualMin = Object.entries(totals).sort((a, b) => a[1] - b[1])[0][0];
    expect(fin.cheapestKey).toBe(actualMin);
  });

  it("converts the India power tariff to USD for the on-prem calculation", () => {
    const bom = buildBom({ gpuKey: "h100", gpuCount: 8, fabricKey: "ib", storageTB: 0, storageCostPerTB: 0 });
    const finIn = financingComparison({ bom, gpuKey: "h100", region: "in" });
    const expectedAnnualPowerUsd = (bom.totalKw * 8760 * KWH_INR) / USD_INR;
    expect(finIn.annualPowerUsd).toBeCloseTo(expectedAnnualPowerUsd, 4);
  });

  it("annualPowerUsd is denominated in USD for the India region too — no INR conversion leaks out of tco.js", () => {
    // ARCHITECTURE.md: "raw math in USD, with an INR conversion applied only at display
    // time." Assert tco.js's own output is already USD-normalized (via the /USD_INR divide
    // in the region==="in" branch), not left in raw INR — that would be a currency-unit bug,
    // and the *83.5 redisplay-as-INR conversion belongs to the UI layer, not here. Locks in
    // the current separation of concerns before Backlog #6 (configurable currency) touches
    // this.
    const bom = buildBom({ gpuKey: "h100", gpuCount: 8, fabricKey: "ib", storageTB: 0, storageCostPerTB: 0 });
    const finIn = financingComparison({ bom, gpuKey: "h100", region: "in" });
    const effectiveUsdPerKwh = finIn.annualPowerUsd / (bom.totalKw * 8760);
    // (KWH_INR / USD_INR) ≈ 0.0958 $/kWh — a plausible USD electricity rate. If tco.js
    // accidentally left this in raw INR (forgot the /USD_INR divide), this would instead be
    // ≈ 8 (KWH_INR itself), off by ~83.5x.
    expect(effectiveUsdPerKwh).toBeCloseTo(KWH_INR / USD_INR, 6);
  });

  describe("cheapest-flagging — post-fix behavior (2026-07-06 colo support-cost fix)", () => {
    // Prior to the fix, "colo" was mathematically guaranteed to beat "onPrem" in every
    // scenario, because colo3 never carried annualSupport while onPremTco3 always did —
    // a missing line item, not a real facility-cost advantage (PRODUCT_BACKLOG.md #3).
    // With the fix, both formulas carry annualSupport symmetrically, so the comparison is
    // now decided purely by real power cost (onPrem) vs. the flat colo hosting-fee
    // equivalent (colo) — exactly as it should be.
    //
    // Empirically re-swept post-fix (all 6 GPU keys x 2 regions x 3 GPU counts x 2 storage
    // configs): "onPrem" now wins in every case under current constants, because
    // COLO_PER_KW_MONTH's annualized rate ($1,800/kW/yr) exceeds actual electricity cost
    // per kW in both regions (~$1,051/kW/yr in the US, ~$839/kW/yr in India) once support
    // cancels out of the comparison. "gaas" still surfaces once capex is driven high enough
    // (e.g. by storage) that onPrem/colo both inherit that capex while cloud/gaas — priced
    // purely off GPU count — don't. This means "colo" itself doesn't win under current
    // constants either, which is a separate, new observation worth a look (not this spec's
    // scope — this fix only removed the missing cost item; it did not tune
    // COLO_PER_KW_MONTH). "cloud" still never wins, unaffected by this fix (see below).

    it("GPU-as-a-Service always undercuts Public Cloud — 'cloud' can never be cheapestKey", () => {
      const bom = buildBom({ gpuKey: "b200", gpuCount: 64, fabricKey: "roce800", storageTB: 50, storageCostPerTB: 1600 });
      const fin = financingComparison({ bom, gpuKey: "b200", region: "us" });
      expect(fin.gaas.total3yr).toBeLessThan(fin.cloud.total3yr);
      expect(fin.cheapestKey).not.toBe("cloud");
    });

    it("Colo and On-Prem now carry annualSupport symmetrically — the gap is purely the facility-cost difference", () => {
      const gpuKeys = Object.keys(CLOUD_HR); // all 6 GPU keys with a defined cloud rate
      for (const gpuKey of gpuKeys) {
        for (const region of ["us", "in"]) {
          const bom = buildBom({ gpuKey, gpuCount: 128, fabricKey: "ib", storageTB: 0, storageCostPerTB: 0 });
          const fin = financingComparison({ bom, gpuKey, region });
          const kwh = region === "in" ? KWH_INR : KWH_USD;
          const annualPowerUsd = region === "in" ? (bom.totalKw * 8760 * kwh) / USD_INR : bom.totalKw * 8760 * kwh;
          const expectedGap = (bom.totalKw * COLO_PER_KW_MONTH * 12 - annualPowerUsd) * TCO_YEARS;
          expect(fin.colo.total3yr - fin.onPrem.total3yr).toBeCloseTo(expectedGap, 4);
        }
      }
    });

    it("cheapestKey is not structurally locked to colo/gaas — 'onPrem' can win now that real power cost beats colo's flat rate", () => {
      const bom = buildBom({ gpuKey: "h100", gpuCount: 128, fabricKey: "ib", storageTB: 0, storageCostPerTB: 0 });
      const fin = financingComparison({ bom, gpuKey: "h100", region: "us" });
      expect(fin.onPrem.total3yr).toBeLessThan(fin.colo.total3yr);
      expect(fin.cheapestKey).toBe("onPrem");
    });

    it("cheapestKey across a representative input sweep resolves to onPrem or gaas (never cloud, and no longer colo-by-construction)", () => {
      // "gaas" surfaces once capex is driven high enough (e.g. by storage) that onPrem/colo
      // both inherit that capex while cloud/gaas — priced purely off GPU count — don't.
      const gpuKeys = Object.keys(CLOUD_HR);
      const storageOptions = [
        { tb: 100, cost: 700 },
        { tb: 1_000_000, cost: 1800 }, // drives capex high enough for gaas to win
      ];
      const seen = new Set();
      for (const gpuKey of gpuKeys) {
        for (const region of ["us", "in"]) {
          for (const gpuCount of [8, 128, 1024]) {
            for (const s of storageOptions) {
              const bom = buildBom({ gpuKey, gpuCount, fabricKey: "ib", storageTB: s.tb, storageCostPerTB: s.cost });
              const fin = financingComparison({ bom, gpuKey, region });
              seen.add(fin.cheapestKey);
            }
          }
        }
      }
      expect(seen).toEqual(new Set(["onPrem", "gaas"]));
    });
  });
});

describe("unitEconomics", () => {
  it("computes cost per token and cost per inference from 3-year TCO and utilization", () => {
    const tco3yrUsd = 3_000_000;
    const aggregateTokPerSec = 50_000;
    const utilizationPct = 0.6;
    const outTokPerRequest = 500;
    const result = unitEconomics({ tco3yrUsd, aggregateTokPerSec, utilizationPct, outTokPerRequest });

    const secondsIn3yr = TCO_YEARS * 365 * 24 * 3600;
    const tokensServed3yr = aggregateTokPerSec * utilizationPct * secondsIn3yr;
    const costPerToken = tco3yrUsd / tokensServed3yr;

    expect(result.tokensServed3yr).toBeCloseTo(tokensServed3yr, 2);
    expect(result.costPerToken).toBeCloseTo(costPerToken, 10);
    expect(result.costPerInference).toBeCloseTo(costPerToken * outTokPerRequest, 8);
  });

  it("guards against division by zero when aggregate throughput is zero", () => {
    const result = unitEconomics({ tco3yrUsd: 1_000_000, aggregateTokPerSec: 0 });
    expect(result.tokensServed3yr).toBe(0);
    expect(result.costPerToken).toBe(0);
    expect(result.costPerInference).toBe(0);
  });
});
