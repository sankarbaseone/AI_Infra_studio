// ============================================================================
//  Reference data — hardware, pricing, fabric, storage, tariffs.
//  Every category carries lastReviewed + source so staleness is auditable
//  (Roadmap §9: reference-data review cadence).
//  Figures are indicative 2025-2026 planning estimates. Validate against
//  live vendor quotes before any client submission.
// ============================================================================

export const DATA_META = {
  gpus: { lastReviewed: "2026-07", source: "Vendor datasheets; market pricing (indicative)" },
  nodes: { lastReviewed: "2026-07", source: "OEM reference designs" },
  fabric: { lastReviewed: "2026-07", source: "Vendor guidance; delivery experience" },
  storage: { lastReviewed: "2026-07", source: "Vendor / market pricing" },
  cloud: { lastReviewed: "2026-07", source: "Public cloud / GPU-cloud on-demand pricing" },
  costFactors: { lastReviewed: "2026-07", source: "Industry PUE benchmarks; regional tariffs" },
};

export const GPUS = {
  h100: { name: "NVIDIA H100 SXM", bf16: 989, fp8: 1979, hbm: 80, bw: 3.35, tdp: 700, price: 27500, vendor: "NVIDIA", class: 1 },
  h200: { name: "NVIDIA H200 SXM", bf16: 989, fp8: 1979, hbm: 141, bw: 4.8, tdp: 700, price: 31000, vendor: "NVIDIA", class: 1 },
  b200: { name: "NVIDIA B200", bf16: 2250, fp8: 4500, hbm: 192, bw: 8.0, tdp: 1000, price: 40000, vendor: "NVIDIA", class: 2 },
  gb200: { name: "NVIDIA GB200 (per GPU)", bf16: 2500, fp8: 5000, hbm: 192, bw: 8.0, tdp: 1200, price: 45000, vendor: "NVIDIA", class: 3 },
  mi300x: { name: "AMD Instinct MI300X", bf16: 1307, fp8: 2615, hbm: 192, bw: 5.3, tdp: 750, price: 20000, vendor: "AMD", class: 1 },
  mi325x: { name: "AMD Instinct MI325X", bf16: 1307, fp8: 2615, hbm: 256, bw: 6.0, tdp: 1000, price: 25000, vendor: "AMD", class: 2 },
};

// class: 1 = entry/mainstream accelerator tier, 2 = high-memory/high-throughput, 3 = rack-scale flagship
// Used to pick a tier-appropriate default GPU per vendor without hardcoding a single-vendor progression.
export const VENDOR_TIER_DEFAULT = {
  NVIDIA: { foundation: "h200", standard: "b200", enterprise: "b200" },
  AMD: { foundation: "mi300x", standard: "mi325x", enterprise: "mi325x" },
};

export const NODES = {
  h100: { server: "NVIDIA DGX H100 / HGX 8×H100", gpus: 8, hostCpu: "2× Intel Xeon Platinum", ram: 2048, nvme: 30, powerNode: 10200, priceNode: 300000 },
  h200: { server: "HGX H200 8-GPU (OEM)", gpus: 8, hostCpu: "2× Intel Xeon / AMD EPYC", ram: 2048, nvme: 30, powerNode: 10200, priceNode: 340000 },
  b200: { server: "NVIDIA DGX B200 8-GPU", gpus: 8, hostCpu: "2× Intel Xeon", ram: 4096, nvme: 60, powerNode: 14300, priceNode: 515000 },
  gb200: { server: "GB200 NVL72 (per 8-GPU equiv.)", gpus: 8, hostCpu: "Grace CPU", ram: 4096, nvme: 60, powerNode: 13500, priceNode: 440000 },
  mi300x: { server: "Dell XE9680 / Supermicro 8×MI300X", gpus: 8, hostCpu: "2× AMD EPYC / Xeon", ram: 2048, nvme: 30, powerNode: 10500, priceNode: 230000 },
  mi325x: { server: "8×MI325X platform", gpus: 8, hostCpu: "2× AMD EPYC", ram: 3072, nvme: 60, powerNode: 12000, priceNode: 290000 },
};

export const FABRICS = {
  ib: { name: "InfiniBand NDR 400G", mfuBonus: 0.0, costPerNode: 32000, note: "Best scaling; baseline for MFU bands" },
  roce: { name: "RoCE v2 / 400GbE", mfuBonus: -0.10, costPerNode: 18000, note: "~10-20% lower effective MFU at scale vs IB" },
  roce800: { name: "RoCE v2 / 800GbE", mfuBonus: -0.05, costPerNode: 26000, note: "Dual-rail 800G; narrows the gap to InfiniBand" },
  nvlink: { name: "NVLink/NVSwitch only (single node)", mfuBonus: 0.0, costPerNode: 0, note: "Intra-node only; no multi-node scale-out" },
};

export const STORAGE = {
  none: { name: "Reuse existing / not scoped", costPerTB: 0 },
  beegfs: { name: "BeeGFS (NVMe)", costPerTB: 900 },
  lustre: { name: "Lustre parallel FS", costPerTB: 1100 },
  weka: { name: "WEKA", costPerTB: 1800 },
  vast: { name: "VAST Data", costPerTB: 1600 },
  gpfs: { name: "IBM Storage Scale (GPFS)", costPerTB: 1500 },
  san: { name: "NVMe Gen5 SAN", costPerTB: 700 },
};

export const CLOUD_HR = { h100: 3.5, h200: 4.2, b200: 6.5, gb200: 7.0, mi300x: 2.8, mi325x: 3.4 };

export const MFU_BANDS = [
  { k: "poor", label: "Poor tuning (25-35%)", v: 0.30 },
  { k: "good", label: "Good tuning (40-50%)", v: 0.45 },
  { k: "megatron", label: "Megatron-LM (50-60%)", v: 0.55 },
  { k: "sota", label: "State-of-the-art (65-72%)", v: 0.68 },
];

export const MODELS = {
  "llama3-8b": { name: "Llama 3.1 8B", params: 8, layers: 32, hidden: 4096, kvHeads: 8, heads: 32 },
  "llama3-70b": { name: "Llama 3.1 70B", params: 70, layers: 80, hidden: 8192, kvHeads: 8, heads: 64 },
  "llama3-405b": { name: "Llama 3.1 405B", params: 405, layers: 126, hidden: 16384, kvHeads: 8, heads: 128 },
  "mixtral-8x7b": { name: "Mixtral 8x7B (MoE)", params: 47, layers: 32, hidden: 4096, kvHeads: 8, heads: 32 },
  "qwen-72b": { name: "Qwen2.5 72B", params: 72, layers: 80, hidden: 8192, kvHeads: 8, heads: 64 },
  custom: { name: "Custom model", params: 70, layers: 80, hidden: 8192, kvHeads: 8, heads: 64 },
};

// ---- Tiered BOM defaults (fixed tiers — see roadmap §6 decision) ----------
// Note: ctrlVcpu/ctrlRam used to be static per-tier constants here. They're now derived
// live from GPU compute-node count via controlNodeSpec() in lib/tco.js, applied uniformly
// across all BOM columns (including the "Your Configuration" live column) — see
// docs/DECISIONS.md D10.
export const TIERS = [
  { key: "foundation", label: "Foundation", usersMin: 200, usersMax: 300, usersMid: 250, storageDefaultTB: 10, fabricDefault: "roce" },
  { key: "standard", label: "Standard", usersMin: 300, usersMax: 500, usersMid: 400, storageDefaultTB: 200, fabricDefault: "roce800" },
  { key: "enterprise", label: "Enterprise", usersMin: 500, usersMax: 800, usersMid: 650, storageDefaultTB: 500, fabricDefault: "ib" },
];

// ---- Cost/financing factors ------------------------------------------------
export const USD_INR = 83.5;
export const PUE_DEFAULT = 1.4;
export const KWH_USD = 0.12;
export const KWH_INR = 8.0;
export const SUPPORT_PCT = 0.10;
export const TCO_YEARS = 3;
export const GAAS_DISCOUNT = 0.75;      // GPU-as-a-Service reserved-capacity rate vs on-demand cloud
export const COLO_PER_KW_MONTH = 150;   // USD indicative colocation power+space+cooling bundle

// ---- Workload framework (qualitative — NOT numeric multipliers) -----------
// Roadmap §6 Phase 2B honesty caveat: sizing deltas for these workload types
// are not standardized formulas. This is a qualitative framework only, until
// the COE supplies and owns calibrated multipliers from delivery experience.
export const WORKLOAD_TYPES = {
  rag: { label: "RAG", note: "Add vector-database storage and retrieval latency budget; increases Storage and Token Processing headroom." },
  finetune: { label: "Fine-tuning", note: "Requires dedicated training capacity concurrent with serving; consider a separate Training allocation." },
  agentic: { label: "Agentic AI", note: "Multi-step tool calls increase concurrent request fan-out; add headroom to Concurrent Users and Network Fabric." },
  multimodal: { label: "Multi-modal", note: "Image/audio/video tokens are more expensive per request; re-check Token Processing capacity against real payload sizes." },
  digitaltwin: { label: "Digital Twin", note: "Often pairs simulation/telemetry ingestion with inference; validate Storage throughput, not just capacity." },
  genai: { label: "GenAI Inference", note: "Standard text-generation serving; the default assumption behind this tier's baseline sizing." },
};
export const WORKLOAD_FRAMEWORK_DISCLAIMER =
  "Workload notes are a qualitative planning framework, not calibrated numeric multipliers. " +
  "COE-validated sizing deltas per workload type are a roadmap item (Phase 2B) pending delivery-data calibration.";
