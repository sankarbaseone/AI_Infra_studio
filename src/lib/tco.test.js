import { describe, it, expect } from "vitest";
import { buildBom, financingComparison, unitEconomics } from "./tco.js";
import {
  NODES, FABRICS, PUE_DEFAULT, USD_INR, KWH_INR, TCO_YEARS, GAAS_DISCOUNT,
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

  it("prices GPU-as-a-Service at the reserved discount off the public cloud rate", () => {
    const bom = buildBom({ gpuKey: "h100", gpuCount: 128, fabricKey: "ib", storageTB: 100, storageCostPerTB: 700 });
    const fin = financingComparison({ bom, gpuKey: "h100", region: "us" });
    expect(fin.gaas.total3yr).toBeCloseTo(fin.cloud.total3yr * GAAS_DISCOUNT, 2);
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
