export const fmt = (n, d = 0) => {
  if (n === null || n === undefined || isNaN(n)) return "—";
  return Number(n).toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: d });
};
export const usd = (n) => "$" + fmt(Math.round(n));
export const inr = (n) => "₹" + fmt(Math.round(n));
export const fmtBig = (n) => {
  if (n >= 1e24) return (n / 1e24).toFixed(2) + " YFLOPs";
  if (n >= 1e21) return (n / 1e21).toFixed(2) + " ZFLOPs";
  if (n >= 1e18) return (n / 1e18).toFixed(2) + " EFLOPs";
  if (n >= 1e15) return (n / 1e15).toFixed(2) + " PFLOPs";
  if (n >= 1e12) return (n / 1e12).toFixed(2) + " TFLOPs";
  return fmt(n);
};
export const fmtTok = (n) => {
  if (n >= 1e12) return (n / 1e12).toFixed(2) + "T tok";
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B tok";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M tok";
  return fmt(n) + " tok";
};
export const usdSmall = (n) => "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 6 });
