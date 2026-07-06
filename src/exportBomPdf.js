import { DELOITTE_LOGO } from "./theme.js";
import { GPUS, VENDOR_TIER_DEFAULT, STORAGE, FABRICS } from "./data/reference.js";
import { fmt, usdSmall } from "./lib/format.js";

export function exportTieredBomPdf({ client, vendor, tiers, results, storageTB, region, cur, usd, inr }) {
  const date = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  const colHeaders = tiers.map((t) => `<th>${t.label}<br/><span style="font-weight:400;font-size:10px">${t.usersMin}-${t.usersMax} users</span></th>`).join("");

  function row(label, cells, remark) {
    return "<tr><td class=\"layer\">" + label + "</td>" +
      cells.map((c) => "<td>" + c.replace(/\n/g, "<br/>") + "</td>").join("") +
      "<td class=\"remark\">" + remark + "</td></tr>";
  }

  const rowsHtml =
    row("Training", results.map((r) => r.bom.provisioned + "\u00d7 " + GPUS[VENDOR_TIER_DEFAULT[vendor][r.tier.key]].name), "Shared pool sized to concurrent serving demand.") +
    row("Inference", results.map((r) => r.bom.provisioned + "\u00d7 " + GPUS[VENDOR_TIER_DEFAULT[vendor][r.tier.key]].name + ", " + GPUS[VENDOR_TIER_DEFAULT[vendor][r.tier.key]].hbm + " GB VRAM"), "Sized live from concurrent users, context length and precision.") +
    row("Token Processing", results.map((r) => "~" + fmt(r.aggregateTokPerSec) + " tok/s aggregate"), "Memory-bandwidth-bound estimate.") +
    row("Storage", results.map((r, i) => fmt(storageTB[i]) + " TB"), "Capacity only \u2014 throughput sizing is part of the detailed engagement.") +
    row("Control Nodes", results.map((r) => "3\u00d7 nodes (HA cluster)"), "Standard HA control-plane sizing default.") +
    row("Network Fabric", results.map((r) => FABRICS[r.tier.fabricDefault].name), "Fabric choice directly affects achievable MFU.") +
    row("Concurrent Users", results.map((r) => r.tier.usersMin + "\u2013" + r.tier.usersMax), "Fixed tier bands.") +
    row("3-Year TCO (on-prem)", results.map((r) => usd(r.fin.onPrem.total3yr)), "CapEx + power + support over 3 years.") +
    row("Cost / 1K tokens", results.map((r) => usdSmall(r.unit.costPerToken * 1000)), "At configured average utilization.");

  const html =
    "<html><head><title>Deloitte AI Infra Studio \u2014 Tiered BOM</title><style>" +
    "*{font-family:Segoe UI,Calibri,Arial,sans-serif;box-sizing:border-box}" +
    "body{margin:0;padding:36px;color:#53565A}" +
    "h1{font-size:20px;color:#101413;margin:0 0 4px}" +
    ".sub{font-size:12px;color:#75787B;margin-bottom:16px}" +
    "table{width:100%;border-collapse:collapse;font-size:11px;margin:10px 0}" +
    "th{background:#101413;color:#fff;text-align:left;padding:7px 9px;font-size:11px}" +
    "td{padding:7px 9px;border-bottom:1px solid #D0D0CE;vertical-align:top}" +
    "td.layer{font-weight:700;color:#fff;background:#101413;white-space:nowrap}" +
    "td.remark{font-style:italic;color:#75787B;font-size:10px}" +
    ".foot{margin-top:18px;padding-top:10px;border-top:1px solid #D0D0CE;font-size:10px;color:#75787B;font-style:italic}" +
    "@media print{body{padding:16px}}" +
    "</style></head><body>" +
    "<img src=\"" + DELOITTE_LOGO + "\" style=\"height:30px;margin-bottom:12px\"/>" +
    "<h1>AI Infrastructure Sizing \u2014 Tiered Bill of Materials &amp; TCO</h1>" +
    "<div class=\"sub\">" + (client ? "Client: <b>" + client + "</b> &nbsp;|&nbsp; " : "") + "Date: " + date + " &nbsp;|&nbsp; Vendor: " + vendor + "</div>" +
    "<table><thead><tr><th>Layer</th>" + colHeaders + "<th>Remark</th></tr></thead><tbody>" + rowsHtml + "</tbody></table>" +
    "<div class=\"foot\">Indicative planning estimate, computed live from the sizing engine \u2014 validate against live vendor quotations before client submission. Deloitte Touche Tohmatsu India LLP \u2014 AI Infrastructure Advisory. Workload notes, where selected, are a qualitative framework pending COE-calibrated multipliers.</div>" +
    "</body></html>";

  const w = window.open("", "_blank");
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(function () { w.print(); }, 400);
}
