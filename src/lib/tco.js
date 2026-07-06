import { NODES, FABRICS, CLOUD_HR, USD_INR, PUE_DEFAULT, KWH_USD, KWH_INR, SUPPORT_PCT, TCO_YEARS, GAAS_DISCOUNT, COLO_PER_KW_MONTH } from "../data/reference.js";

/**
 * HA control-plane sizing per replica node, as a function of GPU compute node count.
 * Floor (1 compute node) matches the tool's original Foundation-tier assumption (8 vCPU /
 * 64 GB); scales +4 vCPU / +32 GB per additional compute node, capped at 64 vCPU / 1024 GB
 * for very large clusters. Internal COE planning assumption, not sourced from a vendor doc —
 * same status as the $12k/node rack cost or the 85%-usable-HBM constant elsewhere in calc.js.
 */
export function controlNodeSpec(nodes) {
  const vcpu = Math.min(64, 8 + 4 * Math.max(0, nodes - 1));
  const ram = Math.min(1024, 64 + 32 * Math.max(0, nodes - 1));
  return { vcpu, ram };
}

/** Build the costed BOM line items + power/TCO figures for one hardware config. */
export function buildBom({ gpuKey, gpuCount, fabricKey, storageTB, storageCostPerTB, pue = PUE_DEFAULT }) {
  const node = NODES[gpuKey];
  const nodes = Math.ceil(gpuCount / 8);
  const provisioned = nodes * 8;

  const hwCost = nodes * node.priceNode;
  const fabricCost = fabricKey === "nvlink" ? 0 : nodes * FABRICS[fabricKey].costPerNode;
  const storageCost = storageTB * storageCostPerTB;
  const rackCost = nodes * 12000;
  const capex = hwCost + fabricCost + storageCost + rackCost;

  const itKw = (nodes * node.powerNode) / 1000;
  const totalKw = itKw * pue;
  const annualKwh = totalKw * 8760;
  const annualSupport = hwCost * SUPPORT_PCT;
  const { vcpu: ctrlVcpu, ram: ctrlRam } = controlNodeSpec(nodes);

  return { node, nodes, provisioned, hwCost, fabricCost, storageCost, rackCost, capex, itKw, totalKw, annualKwh, annualSupport, ctrlVcpu, ctrlRam };
}

/** 4-way financing comparison: On-Prem, Cloud rental, GPU-as-a-Service, Colocation. */
export function financingComparison({ bom, gpuKey, region = "in" }) {
  const kwh = region === "in" ? KWH_INR : KWH_USD;
  const annualPower = bom.totalKw * 8760 * kwh;
  const annualPowerUsd = region === "in" ? annualPower / USD_INR : annualPower;

  const onPremTco3 = bom.capex + (annualPowerUsd + bom.annualSupport) * TCO_YEARS;

  const cloudHr = CLOUD_HR[gpuKey];
  const cloud3 = bom.provisioned * cloudHr * 8760 * TCO_YEARS;
  const gaas3 = cloud3 * GAAS_DISCOUNT;
  const colo3 = bom.capex + bom.totalKw * COLO_PER_KW_MONTH * 36; // hardware owned + hosting fee bundle

  const breakEvenMonths = cloudHr > 0 ? bom.capex / (bom.provisioned * cloudHr * 730) : 0;

  return {
    annualPowerUsd,
    onPrem: { label: "On-Premises", total3yr: onPremTco3, note: "Full ownership; capex + power + support over 3 years" },
    cloud: { label: "Public Cloud (on-demand)", total3yr: cloud3, note: `${cloudHr.toFixed(2)}/GPU-hr on-demand, 24×7` },
    gaas: { label: "GPU-as-a-Service (reserved)", total3yr: gaas3, note: "Indicative reserved-capacity rate, no hardware ownership" },
    colo: { label: "Colocation", total3yr: colo3, note: "Hardware owned; power/space/cooling hosted at a per-kW/month bundle rate" },
    breakEvenMonths,
    cheapestKey: ["onPrem", "cloud", "gaas", "colo"].reduce((best, k) => {
      const val = k === "onPrem" ? onPremTco3 : k === "cloud" ? cloud3 : k === "gaas" ? gaas3 : colo3;
      return best.val === undefined || val < best.val ? { k, val } : best;
    }, {}).k,
  };
}

/** Cost per token / cost per inference, given 3-year TCO and realistic utilization. */
export function unitEconomics({ tco3yrUsd, aggregateTokPerSec, utilizationPct = 0.6, outTokPerRequest = 500 }) {
  const secondsIn3yr = TCO_YEARS * 365 * 24 * 3600;
  const tokensServed3yr = aggregateTokPerSec * utilizationPct * secondsIn3yr;
  const costPerToken = tokensServed3yr > 0 ? tco3yrUsd / tokensServed3yr : 0;
  const costPerInference = costPerToken * outTokPerRequest;
  return { tokensServed3yr, costPerToken, costPerInference };
}
