import { useEffect, useState } from "react";
import { fetchAll, updateDocById } from "../lib/firestoreCrud";
import { City, EventItem, Order } from "../types";
import { formatMoney } from "../utils/formatMoney";

const COLLECTION = "orders";

const Tag = ({ label, color }: { label: string; color: string }) => (
  <span
    style={{
      padding: "6px 10px",
      borderRadius: 999,
      fontSize: 12,
      background: color,
      color: "#0b1224",
      fontWeight: 700,
      boxShadow: "0 6px 14px rgba(0,0,0,0.25)",
    }}
  >
    {label}
  </span>
);

const Orders = () => {
  const [items, setItems] = useState<Order[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [cityFilter, setCityFilter] = useState<string>("");
  const [eventFilter, setEventFilter] = useState<string>("");
  const [orderSearch, setOrderSearch] = useState<string>("");

  const load = async () => {
    setLoading(true);
    const [ordersData, eventsData, citiesData] = await Promise.all([
      fetchAll<Order>(COLLECTION, "createdAt"),
      fetchAll<EventItem>("events", "title"),
      fetchAll<City>("cities", "name"),
    ]);
    setItems(ordersData);
    setEvents(eventsData);
    setCities(citiesData);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleStatusChange = async (id: string, status: string, paymentStatus?: string) => {
    setUpdatingId(id);
    await updateDocById(COLLECTION, id, { status, paymentStatus });
    await load();
    setUpdatingId(null);
  };

  const eventName = (eventId: string) =>
    events.find((ev) => ev.id === eventId)?.title ?? "N/A";

  const cityNameByEvent = (eventId: string) => {
    const ev = events.find((e) => e.id === eventId);
    if (!ev) return "-";
    const city = cities.find((c) => c.id === ev.cityId);
    return city?.name ?? ev.cityId ?? "-";
  };

  const filteredItems = items.filter((o) => {
    if (eventFilter && o.eventId !== eventFilter) return false;
    if (cityFilter) {
      const ev = events.find((e) => e.id === o.eventId);
      if (!ev || ev.cityId !== cityFilter) return false;
    }
    if (orderSearch.trim()) {
      const key = (o.orderId ?? o.id ?? "").toString().toLowerCase();
      if (!key.includes(orderSearch.trim().toLowerCase())) return false;
    }
    return true;
  });

  const totals = {
    count: filteredItems.length,
    waiting: filteredItems.filter((o) => o.status === "waiting_verify").length,
    pending: filteredItems.filter((o) => o.status === "pending_payment").length,
    completed: filteredItems.filter((o) => o.status === "completed").length,
    revenue: filteredItems
      .filter((o) => o.status === "completed")
      .reduce((s, o) => s + (o.totalPrice ?? 0), 0),
  };

  return (
    <div className="card">
      <h2>Đơn hàng</h2>
      <p style={{ color: "#cbd5e1", marginTop: -6, marginBottom: 12 }}>
        Theo dõi đơn, lọc theo thành phố/sự kiện, cập nhật trạng thái và xem tổng tiền (VND).
      </p>
      <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <select
          value={cityFilter}
          onChange={(e) => {
            setCityFilter(e.target.value);
            setEventFilter("");
          }}
          style={{ padding: 10, borderRadius: 10, border: "1px solid #cbd5e1" }}
        >
          <option value="">Tất cả thành phố</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={eventFilter}
          onChange={(e) => setEventFilter(e.target.value)}
          style={{ padding: 10, borderRadius: 10, border: "1px solid #cbd5e1" }}
        >
          <option value="">Tất cả sự kiện</option>
          {events
            .filter((ev) => (cityFilter ? ev.cityId === cityFilter : true))
            .map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title}
              </option>
            ))}
        </select>
        <input
          placeholder="Tìm mã đơn..."
          value={orderSearch}
          onChange={(e) => setOrderSearch(e.target.value)}
          style={{
            padding: 10,
            borderRadius: 10,
            border: "1px solid #cbd5e1",
            background: "rgba(255,255,255,0.03)",
            color: "#e2e8f0",
            minWidth: 200,
          }}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 16 }}>
        <Stat label="Tổng đơn" value={totals.count} />
        <Stat label="Chờ xác minh" value={totals.waiting} />
        <Stat label="Chờ thanh toán" value={totals.pending} />
        <Stat label="Hoàn tất" value={totals.completed} />
        <Stat label="Doanh thu (completed)" value={formatMoney(totals.revenue)} />
      </div>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden", background: "rgba(255,255,255,0.02)" }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 10px", padding: "12px" }}>
            <thead>
              <tr>
                <th align="left">Mã đơn</th>
                <th align="left">Sự kiện / Khu vực</th>
              <th align="left">Người mua / Số lượng</th>
                <th align="left">Tổng tiền</th>
                <th align="left">Trạng thái</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((o) => (
                <tr
                  key={o.id}
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    boxShadow: "0 6px 22px rgba(0,0,0,0.28)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <td style={{ padding: "12px" }}>
                    <div style={{ fontWeight: 700 }}>{o.orderId ?? o.id}</div>
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>{o.paymentMethod ?? "-"}</div>
                  </td>
                  <td style={{ padding: "12px" }}>
                    <div style={{ fontWeight: 600 }}>{eventName(o.eventId)}</div>
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>{cityNameByEvent(o.eventId)}</div>
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>{o.sectionName ?? o.sectionId ?? "-"}</div>
                  </td>
                  <td style={{ padding: "12px" }}>
                    <div style={{ fontWeight: 600 }}>{o.userEmail ?? o.userId ?? "-"}</div>
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>
                      Số lượng: {o.quantity ?? "-"}
                    </div>
                  </td>
                  <td style={{ padding: "12px", fontWeight: 700, color: "#c7d2fe" }}>
                    {formatMoney(o.totalPrice)}
                  </td>
                  <td style={{ padding: "12px" }}>
                    <div style={{ marginBottom: 6 }}>
                      <select
                        value={o.status ?? ""}
                        onChange={(e) => handleStatusChange(o.id, e.target.value, o.paymentStatus ?? "")}
                        disabled={updatingId === o.id}
                        style={{ width: "100%" }}
                      >
                        <option value="">Trạng thái</option>
                        <option value="waiting_verify">waiting_verify</option>
                        <option value="pending_payment">pending_payment</option>
                        <option value="completed">completed</option>
                      </select>
                    </div>
                    <Tag
                      label={o.status ?? "n/a"}
                      color={
                        o.status === "completed"
              ? "#8ef0c3"
                          : o.status === "pending_payment"
                ? "#c7d2fe"
                            : o.status === "waiting_verify"
                  ? "#fcd34d"
                  : "#e2e8f0"
                      }
                    />
                  </td>
                  <td align="right" style={{ padding: "12px", fontSize: 12, color: "#94a3b8" }}>
                    {updatingId === o.id ? "Đang lưu..." : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Orders;

const Stat = ({ label, value }: { label: string; value: number | string }) => (
  <div className="card" style={{ border: "1px solid rgba(255,255,255,0.08)", boxShadow: "none" }}>
    <div style={{ color: "#cbd5e1", fontSize: 13 }}>{label}</div>
    <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
  </div>
);

