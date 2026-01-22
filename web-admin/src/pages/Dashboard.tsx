import { useEffect, useMemo, useState } from "react";
import { fetchAll } from "../lib/firestoreCrud";
import { City, EventItem, Order, UserDoc } from "../types";
import { formatMoney } from "../utils/formatMoney";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const toDateObj = (val: unknown): Date | null => {
  if (val && typeof val === "object" && "seconds" in (val as any)) {
    const ms = ((val as any).seconds ?? 0) * 1000;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof val === "string") {
    const d = new Date(val);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
};

const formatDateDisplay = (val: unknown) => {
  const d = toDateObj(val);
  if (!d) return "-";
  return d.toLocaleDateString("vi-VN");
};

const Dashboard = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);
  const [cityFilter, setCityFilter] = useState<string>("");

  const load = async () => {
    setLoading(true);
    const [orderData, eventData, userData, cityData] = await Promise.all([
      fetchAll<Order>("orders", "createdAt"),
      fetchAll<EventItem>("events", "title"),
      fetchAll<UserDoc>("users", "email"),
      fetchAll<City>("cities", "name"),
    ]);
    setOrders(orderData);
    setEvents(eventData);
    setUsers(userData);
    setCities(cityData);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const eventCityMap = useMemo(() => {
    const map = new Map<string, string>();
    events.forEach((ev) => {
      if (ev.id && ev.cityId) map.set(ev.id, ev.cityId);
    });
    return map;
  }, [events]);

  const filteredOrders = useMemo(
    () =>
      orders.filter((o) => {
        if (!cityFilter) return true;
        const cityId = eventCityMap.get(o.eventId);
        return cityId === cityFilter;
      }),
    [orders, eventCityMap, cityFilter],
  );

  const filteredEvents = useMemo(
    () => (cityFilter ? events.filter((ev) => ev.cityId === cityFilter) : events),
    [events, cityFilter],
  );

  const statusBuckets = useMemo(() => {
    const counts = {
      waiting_verify: 0,
      pending_payment: 0,
      completed: 0,
      other: 0,
    };
    filteredOrders.forEach((o) => {
      const s = o.status ?? "";
      if (s === "waiting_verify") counts.waiting_verify += 1;
      else if (s === "pending_payment") counts.pending_payment += 1;
      else if (s === "completed") counts.completed += 1;
      else counts.other += 1;
    });
    return counts;
  }, [filteredOrders]);

  const revenue = useMemo(
    () =>
      filteredOrders
        .filter((o) => o.status === "completed")
        .reduce((sum, o) => sum + (o.totalPrice ?? 0), 0),
    [filteredOrders],
  );

  const now = new Date();
  const upcoming = filteredEvents.filter((ev) => {
    const d = toDateObj(ev.date);
    if (!d) return false;
    return d >= now;
  });
  const past = filteredEvents.filter((ev) => {
    const d = toDateObj(ev.date);
    if (!d) return false;
    return d < now;
  });

  const chartData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredOrders.forEach((o) => {
      const d = toDateObj(o.createdAt);
      if (!d) return;
      const key = d.toISOString().slice(0, 10);
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => (a.date > b.date ? 1 : -1));
  }, [filteredOrders]);

  const statusPie = [
    { name: "waiting_verify", value: statusBuckets.waiting_verify },
    { name: "pending_payment", value: statusBuckets.pending_payment },
    { name: "completed", value: statusBuckets.completed },
  ];

  const statusColors: Record<string, string> = {
    waiting_verify: "#fcd34d",
    pending_payment: "#c7d2fe",
    completed: "#8ef0c3",
  };

  const byCity = useMemo(() => {
    const agg: Record<
      string,
      { cityName: string; events: number; orders: number; completed: number; revenue: number }
    > = {};
    filteredOrders.forEach((o) => {
      const cityId = eventCityMap.get(o.eventId) ?? "unknown";
      const cityName = cities.find((c) => c.id === cityId)?.name ?? cityId;
      if (!agg[cityId]) agg[cityId] = { cityName, events: 0, orders: 0, completed: 0, revenue: 0 };
      agg[cityId].orders += 1;
      if (o.status === "completed") {
        agg[cityId].completed += 1;
        agg[cityId].revenue += o.totalPrice ?? 0;
      }
    });
    filteredEvents.forEach((ev) => {
      const bucket = agg[ev.cityId] ?? {
        cityName: cities.find((c) => c.id === ev.cityId)?.name ?? ev.cityId,
        events: 0,
        orders: 0,
        completed: 0,
        revenue: 0,
      };
      bucket.events += 1;
      agg[ev.cityId] = bucket;
    });
    return Object.values(agg);
  }, [filteredOrders, filteredEvents, eventCityMap, cities]);

  return (
    <div className="card">
      <h2>Tổng quan</h2>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <div style={{ marginBottom: 12 }}>
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              style={{ padding: 10, borderRadius: 10, border: "1px solid #cbd5e1" }}
            >
              <option value="">Tất cả thành phố</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <Stat label="Sự kiện" value={filteredEvents.length} />
            <Stat label="Users" value={users.length} />
            <Stat label="Orders" value={filteredOrders.length} />
            <Stat label="Waiting verify" value={statusBuckets.waiting_verify} />
            <Stat label="Pending payment" value={statusBuckets.pending_payment} />
            <Stat label="Completed" value={statusBuckets.completed} />
            <Stat label="Doanh thu (completed)" value={revenue.toLocaleString("vi-VN")} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginTop: 16 }}>
            <div className="card">
              <h3>Biểu đồ đơn hàng theo ngày</h3>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#60a5fa" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="count" name="Số đơn" stroke="#60a5fa" fill="url(#colorOrders)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="card">
              <h3>Tỷ lệ trạng thái</h3>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={statusPie}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    label
                  >
                    {statusPie.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={statusColors[entry.name] || "#cbd5e1"} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ marginTop: 16 }} className="card">
            <h3>Thống kê theo thành phố</h3>
            <table style={{ width: "100%", marginTop: 8 }}>
              <thead>
                <tr>
                  <th align="left">Thành phố</th>
                  <th align="left">Sự kiện</th>
                  <th align="left">Orders</th>
                  <th align="left">Completed</th>
                  <th align="left">Doanh thu</th>
                </tr>
              </thead>
              <tbody>
                {byCity.map((row) => (
                  <tr key={row.cityName}>
                    <td>{row.cityName}</td>
                    <td>{row.events}</td>
                    <td>{row.orders}</td>
                    <td>{row.completed}</td>
                    <td>{row.revenue.toLocaleString("vi-VN")}</td>
                  </tr>
                ))}
                {byCity.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", color: "#94a3b8" }}>
                      Không có dữ liệu
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="card">
              <h3>Sự kiện sắp tới</h3>
              {upcoming.length === 0 ? (
                <div style={{ color: "#94a3b8" }}>Không có sự kiện sắp tới</div>
              ) : (
                upcoming.map((ev) => (
                  <div key={ev.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{ev.title}</div>
                      <div style={{ color: "#cbd5e1", fontSize: 13 }}>
                        {ev.cityId} · {formatDateDisplay(ev.date)}
                      </div>
                    </div>
                    <div style={{ color: "#cbd5e1" }}>{ev.time ?? "-"}</div>
                  </div>
                ))
              )}
            </div>
            <div className="card">
              <h3>Sự kiện đã qua</h3>
              {past.length === 0 ? (
                <div style={{ color: "#94a3b8" }}>Chưa có sự kiện đã qua</div>
              ) : (
                past.map((ev) => (
                  <div key={ev.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{ev.title}</div>
                      <div style={{ color: "#cbd5e1", fontSize: 13 }}>
                        {ev.cityId} · {formatDateDisplay(ev.date)}
                      </div>
                    </div>
                    <div style={{ color: "#cbd5e1" }}>{ev.time ?? "-"}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: number | string }) => (
  <div className="card" style={{ border: "1px solid #e2e8f0", boxShadow: "none" }}>
    <div style={{ color: "#64748b", fontSize: 14 }}>{label}</div>
    <div style={{ fontSize: 24, fontWeight: 700 }}>{value}</div>
  </div>
);

export default Dashboard;

