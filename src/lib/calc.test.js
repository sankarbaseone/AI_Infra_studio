import { describe, it, expect } from "vitest";
import {
  bytesFor, trainingFlops, clusterPeak, trainingMemGB,
  kvCacheGB, inferenceMemGB, tokPerSecPerGpu, sizeInference,
} from "./calc.js";
import { GPUS, MODELS, FABRICS } from "../data/reference.js";

describe("bytesFor", () => {
  it("returns 2 bytes for fp16", () => expect(bytesFor("fp16")).toBe(2));
  it("returns 1 byte for fp8", () => expect(bytesFor("fp8")).toBe(1));
  it("returns 0.5 bytes for int4", () => expect(bytesFor("int4")).toBe(0.5));
  it("defaults to 2 bytes for any other precision (e.g. bf16)", () => expect(bytesFor("bf16")).toBe(2));
});

describe("trainingFlops", () => {
  it("computes 6 x params x tokens (decoder-only scaling law)", () => {
    // 70B params, 2T tokens -> 6 * 70e9 * 2e12 = 8.4e23
    expect(trainingFlops(70, 2)).toBeCloseTo(8.4e23, -15);
  });
});

describe("clusterPeak", () => {
  it("uses BF16 TFLOPS by default", () => {
    expect(clusterPeak("h100", 128, "bf16")).toBeCloseTo(GPUS.h100.bf16 * 1e12 * 128, -5);
  });
  it("uses FP8 TFLOPS when precision is fp8", () => {
    expect(clusterPeak("h100", 128, "fp8")).toBeCloseTo(GPUS.h100.fp8 * 1e12 * 128, -5);
  });
});

describe("trainingMemGB", () => {
  it("applies the ~18 bytes/param Adam mixed-precision rule", () => {
    expect(trainingMemGB(70)).toBeCloseTo(70 * 18, 6);
  });
});

describe("kvCacheGB", () => {
  const llama70b = MODELS["llama3-70b"]; // layers 80, hidden 8192, kvHeads 8, heads 64 (GQA)

  it("is GQA-aware — uses kvHeads, not heads, in the per-token byte count", () => {
    const ctx = 8192, batch = 1, prec = "fp8";
    const headDim = llama70b.hidden / llama70b.heads;
    const perTok = 2 * llama70b.layers * llama70b.kvHeads * headDim * bytesFor(prec);
    const expected = (perTok * ctx * batch) / 1e9;
    expect(kvCacheGB(llama70b, ctx, batch, prec)).toBeCloseTo(expected, 6);
  });

  it("scales linearly with context length", () => {
    const half = kvCacheGB(llama70b, 4096, 1, "fp8");
    const full = kvCacheGB(llama70b, 8192, 1, "fp8");
    expect(full).toBeCloseTo(half * 2, 6);
  });

  it("scales linearly with batch size", () => {
    const single = kvCacheGB(llama70b, 8192, 1, "fp8");
    const batched = kvCacheGB(llama70b, 8192, 4, "fp8");
    expect(batched).toBeCloseTo(single * 4, 6);
  });
});

describe("inferenceMemGB", () => {
  it("adds a 1.2x weight overhead on top of raw weight bytes, plus KV cache", () => {
    const paramsB = 70, prec = "fp8", kvGB = 10;
    const weights = (paramsB * 1e9 * bytesFor(prec)) / 1e9;
    expect(inferenceMemGB(paramsB, prec, kvGB)).toBeCloseTo(weights * 1.2 + kvGB, 6);
  });
});

describe("tokPerSecPerGpu", () => {
  it("derives per-GPU throughput from HBM bandwidth / (2 * params * bytes), x18 batching multiplier", () => {
    const g = GPUS.h100;
    const paramsB = 70, prec = "fp8";
    const base = (g.bw * 1e12) / (2 * paramsB * 1e9 * bytesFor(prec));
    expect(tokPerSecPerGpu(paramsB, "h100", prec)).toBeCloseTo(base * 18, 2);
  });

  it("roughly doubles when switching from FP16 to FP8 (half the bytes per param)", () => {
    const paramsB = 70;
    const fp16 = tokPerSecPerGpu(paramsB, "h100", "fp16");
    const fp8 = tokPerSecPerGpu(paramsB, "h100", "fp8");
    expect(fp8).toBeCloseTo(fp16 * 2, 2);
  });
});

describe("sizeInference", () => {
  const llama70b = MODELS["llama3-70b"];

  it("is throughput-bound when peak demand is very high relative to memory need", () => {
    const result = sizeInference({
      model: llama70b, gpuKey: "h100", prec: "fp8",
      peakOutTokPerSec: 1_000_000, ctx: 2048,
    });
    expect(result.bound).toBe("throughput-bound");
    expect(result.gpusForTput).toBeGreaterThan(result.gpusForMem);
    expect(result.gpusNeeded).toBe(Math.max(result.gpusForMem, result.gpusForTput, 1));
  });

  it("is memory-bound when context/concurrency dominates over a tiny throughput ask", () => {
    const result = sizeInference({
      model: llama70b, gpuKey: "h100", prec: "fp16",
      peakOutTokPerSec: 1, ctx: 128000,
    });
    expect(result.bound).toBe("memory-bound");
    expect(result.gpusForMem).toBeGreaterThan(result.gpusForTput);
  });

  it("never returns fewer than 1 GPU even for a trivial workload", () => {
    const result = sizeInference({
      model: llama70b, gpuKey: "h100", prec: "fp8",
      peakOutTokPerSec: 0, ctx: 1,
    });
    expect(result.gpusNeeded).toBeGreaterThanOrEqual(1);
  });
});

describe("training time anchor regression (70B params / 2T tokens / 128xH100 / 50% MFU / IB fabric)", () => {
  it("matches the validated ~154 day reference figure recorded in docs/PROJECT_STATE.md", () => {
    const paramsB = 70, tokensT = 2, gpuKey = "h100", count = 128, prec = "bf16";
    const mfu = 0.5;
    const effMfu = Math.max(0.1, mfu + FABRICS.ib.mfuBonus); // IB fabric bonus is 0.0
    const flops = trainingFlops(paramsB, tokensT);
    const peak = clusterPeak(gpuKey, count, prec);
    const eff = peak * effMfu;
    const days = flops / eff / 86400;
    expect(days).toBeGreaterThan(150);
    expect(days).toBeLessThan(158);
  });
});
