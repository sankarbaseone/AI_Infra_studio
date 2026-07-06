import { describe, it, expect } from "vitest";
import { buildBom, financingComparison, unitEconomics } from "./tco.js";
import {
  NODES, FABRICS, PUE_DEFAULT, USD_INR, KWH_INR, TCO_YEARS, GAAS_DISCOUNT,
  CLOUD_HR, COLO_PER_KW_MONTH,
} from "../data/reference.js";

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

  it("Colocation: exact formula = capex + totalKw * $150/kW/month * 36 months", () => {
    const bom = buildBom({ gpuKey: "h100", gpuCount: 128, fabricKey: "ib", storageTB: 100, storageCostPerTB: 700 });
    const fin = financingComparison({ bom, gpuKey: "h100", region: "us" });
    const expected = bom.capex + bom.totalKw * COLO_PER_KW_MONTH * 36;
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

  describe("cheapest-flagging — documented current behavior (2026-07-06 discrepancy note)", () => {
    // FINDING (empirically verified via a sweep across all 6 GPUs x 2 regions x 3 GPU
    // counts x 3 storage configs — see PR description): under the CURRENT constants,
    // "onPrem" and "cloud" NEVER win cheapestKey. Only "colo" and "gaas" are ever flagged
    // cheapest. This is a structural property of the formulas, not a fluke of any one input:
    //
    //  - "cloud" can mathematically never be cheapest, because gaas = 0.75 x cloud is
    //    always strictly less than cloud whenever both are computed from the same bom —
    //    gaas will always undercut it.
    //  - "onPrem" loses to "colo" for every current GPU/node profile in NODES, in both
    //    regions, because SUPPORT_PCT (10%/yr of hardware cost) plus power cost consistently
    //    exceeds COLO_PER_KW_MONTH's flat hosting-fee equivalent for these price/power
    //    ratios. Since capex is identical in both formulas, this comparison is actually
    //    independent of GPU count and storage — it depends only on gpuKey and region.
    //
    // Per the spec's instruction: this is not fixed here. It's pinned as current behavior
    // and flagged for Sankar to decide whether the SUPPORT_PCT/COLO_PER_KW_MONTH constants
    // need recalibration, or whether this is working as intended.

    it("GPU-as-a-Service always undercuts Public Cloud — 'cloud' can never be cheapestKey", () => {
      const bom = buildBom({ gpuKey: "b200", gpuCount: 64, fabricKey: "roce800", storageTB: 50, storageCostPerTB: 1600 });
      const fin = financingComparison({ bom, gpuKey: "b200", region: "us" });
      expect(fin.gaas.total3yr).toBeLessThan(fin.cloud.total3yr);
      expect(fin.cheapestKey).not.toBe("cloud");
    });

    it("Colocation beats On-Premises for every current GPU/node profile, in both regions", () => {
      const gpuKeys = Object.keys(CLOUD_HR); // all 6 GPU keys with a defined cloud rate
      for (const gpuKey of gpuKeys) {
        for (const region of ["us", "in"]) {
          const bom = buildBom({ gpuKey, gpuCount: 128, fabricKey: "ib", storageTB: 0, storageCostPerTB: 0 });
          const fin = financingComparison({ bom, gpuKey, region });
          expect(fin.colo.total3yr).toBeLessThan(fin.onPrem.total3yr);
        }
      }
    });

    it("cheapestKey only ever resolves to colo or gaas across a representative input sweep", () => {
      // "gaas" surfaces once capex is driven high enough (e.g. by storage) that colo/onPrem
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
      expect(seen).toEqual(new Set(["colo", "gaas"]));
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
