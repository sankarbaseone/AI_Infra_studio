import { DELOITTE_LOGO } from "./theme.js";
import { GPUS, FABRICS } from "./data/reference.js";
import { fmt, usdSmall } from "./lib/format.js";

export function exportTieredBomPdf({ client, vendor, columns, results, liveReady, region, cur, usd, inr }) {
  const date = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  // Only include the live "Your Configuration" column when it's actually populated \u2014 never
  // print a placeholder/"not configured" column in a client-facing PDF.
  const cols = liveReady ? columns : columns.slice(0, 3);
  const rows = liveReady ? results : results.slice(0, 3);

  const colHeaders = cols.map((c) => `<th>${c.label}<br/><span style="font-weight:400;font-size:10px">${c.sub}</span></th>`).join("");

  function row(label, cells, remark) {
    return "<tr><td class=\"layer\">" + label + "</td>" +
      cells.map((c) => "<td>" + c.replace(/\n/g, "<br/>") + "</td>").join("") +
      "<td class=\"remark\">" + remark + "</td></tr>";
  }

  const rowsHtml =
    row("Training", rows.map((r) => r.bom.provisioned + "\u00d7 " + GPUS[r.gpuKey].name), "Shared pool sized to concurrent serving demand.") +
    row("Inference", rows.map((r) => r.bom.provisioned + "\u00d7 " + GPUS[r.gpuKey].name + ", " + GPUS[r.gpuKey].hbm + " GB VRAM"), "Sized live from concurrent users, context length and precision.") +
    row("Token Processing", rows.map((r) => "~" + fmt(r.aggregateTokPerSec) + " tok/s aggregate"), "Memory-bandwidth-bound estimate.") +
    row("Storage", rows.map((r) => fmt(r.storageTB) + " TB"), "Capacity only \u2014 throughput sizing is part of the detailed engagement.") +
    row("Control Nodes", rows.map(() => "3\u00d7 nodes (HA cluster)"), "Standard HA control-plane sizing default.") +
    row("Network Fabric", rows.map((r) => FABRICS[r.fabricKey].name), "Fabric choice directly affects achievable MFU.") +
    row("Concurrent Users", cols.map((c) => c.sub), "Fixed tier bands; Your Configuration reflects the exact input.") +
    row("3-Year TCO (on-prem)", rows.map((r) => usd(r.fin.onPrem.total3yr)), "CapEx + power + support over 3 years.") +
    row("Cost / 1K tokens", rows.map((r) => usdSmall(r.unit.costPerToken * 1000)), "At configured average utilization.");

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
