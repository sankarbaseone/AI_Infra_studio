/**
 * @typedef {Object} SharedState
 * @property {number} [effTokensT]         - effective training tokens (trillions), from TokenTab
 * @property {string} [inferGpu]           - GPU key chosen in InferenceTab (e.g. "h200")
 * @property {number} [inferGpus]          - GPU count provisioned (nodes * 8) per InferenceTab
 * @property {number} [aggregateTokPerSec] - aggregate output tok/s InferenceTab sized against
 * @property {number} [perGpuTps]          - per-GPU decode throughput, from InferenceTab's own `sized` result
 * @property {string} [bound]              - "memory-bound" | "throughput-bound", from InferenceTab's own `sized` result
 * @property {string} [model]              - model key used in InferenceTab (e.g. "llama3-70b")
 * @property {string} [precision]          - precision used in InferenceTab
 * @property {number} [contextWindow]      - context window (tokens) used in InferenceTab
 * @property {number} [users]              - concurrent users configured in InferenceTab
 * @property {number} [reqPerUserHr]       - requests/user/hour configured in InferenceTab
 * @property {number} [peakFactor]         - peak-to-average factor configured in InferenceTab
 * @property {string} [inferFabricKey]     - network fabric chosen in InferenceTab (new input)
 * @property {number} [inferStorageTB]     - storage capacity (TB) chosen in InferenceTab (new input)
 */

/** Fields required to build the "Your Configuration" BOM column. */
export const LIVE_CONFIG_REQUIRED_KEYS = [
  "inferGpu", "inferGpus", "aggregateTokPerSec", "inferFabricKey", "inferStorageTB",
];

/** @param {SharedState} shared */
export function isLiveConfigReady(shared) {
  return LIVE_CONFIG_REQUIRED_KEYS.every((k) => shared?.[k] != null);
}
