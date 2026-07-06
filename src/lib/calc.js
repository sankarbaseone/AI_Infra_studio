import { GPUS } from "../data/reference.js";

export const bytesFor = (prec) => (prec === "fp16" ? 2 : prec === "fp8" ? 1 : prec === "int4" ? 0.5 : 2);

export function trainingFlops(paramsB, tokensT) {
  return 6 * paramsB * 1e9 * tokensT * 1e12;
}
export function clusterPeak(gpuKey, count, precision) {
  const g = GPUS[gpuKey];
  const perGpu = (precision === "fp8" ? g.fp8 : g.bf16) * 1e12;
  return perGpu * count;
}
export function trainingMemGB(paramsB) {
  return (paramsB * 1e9 * 18) / 1e9; // ~18 bytes/param, Adam mixed precision
}
export function kvCacheGB(model, ctx, batch, prec) {
  const headDim = model.hidden / model.heads;
  const bytes = bytesFor(prec);
  const perTok = 2 * model.layers * model.kvHeads * headDim * bytes;
  return (perTok * ctx * batch) / 1e9;
}
export function inferenceMemGB(paramsB, prec, kvGB) {
  const weights = (paramsB * 1e9 * bytesFor(prec)) / 1e9;
  return weights * 1.2 + kvGB;
}
export function tokPerSecPerGpu(paramsB, gpuKey, prec) {
  const g = GPUS[gpuKey];
  const bytes = bytesFor(prec);
  const base = (g.bw * 1e12) / (2 * paramsB * 1e9 * bytes);
  return base * 18; // continuous-batching aggregate multiplier (vLLM/TRT-LLM class)
}

/** Given a workload's demand, return the GPU count required and which constraint bound it. */
export function sizeInference({ model, gpuKey, prec, peakOutTokPerSec, ctx, concurrencySeqPerGpu = 32 }) {
  const g = GPUS[gpuKey];
  const perGpuTps = tokPerSecPerGpu(model.params, gpuKey, prec);
  const kv = kvCacheGB(model, ctx, 1, prec);
  const memNeeded = inferenceMemGB(model.params, prec, kv * concurrencySeqPerGpu);
  const gpusForMem = Math.ceil(memNeeded / (g.hbm * 0.85));
  const gpusForTput = Math.ceil(peakOutTokPerSec / perGpuTps);
  const gpusNeeded = Math.max(gpusForMem, gpusForTput, 1);
  const bound = gpusForMem >= gpusForTput ? "memory-bound" : "throughput-bound";
  return { perGpuTps, kv, memNeeded, gpusForMem, gpusForTput, gpusNeeded, bound };
}
