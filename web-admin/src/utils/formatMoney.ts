export const formatMoney = (val: unknown) => {
  if (typeof val === "number") return val.toLocaleString("vi-VN") + " ₫";
  if (typeof val === "string") {
    const n = Number(val.replace(/[^\d.-]/g, ""));
    if (!Number.isNaN(n)) return n.toLocaleString("vi-VN") + " ₫";
  }
  return "-";
};

