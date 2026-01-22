import { FormEvent, useEffect, useMemo, useState } from "react";
import { createDoc, deleteDocById, fetchAll, updateDocById } from "../lib/firestoreCrud";
import { City, EventItem } from "../types";

const COLLECTION = "events";

const toDateString = (val: unknown) => {
  if (val && typeof val === "object" && "seconds" in (val as any)) {
    return new Date((val as any).seconds * 1000).toISOString().slice(0, 10);
  }
  if (typeof val === "string") return val;
  return "";
};

const normalizeEvent = (ev: any): EventItem => ({
  ...ev,
  date: toDateString(ev.date),
  time: typeof ev.time === "string" ? ev.time : "",
  artists: Array.isArray(ev.artists) ? ev.artists : [],
});

const Events = () => {
  const [items, setItems] = useState<EventItem[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    title: "",
    cityId: "",
    venue: "",
    date: "",
    time: "",
    description: "",
    bannerUrl: "",
    imageUrl: "",
    artists: "",
  });

  const load = async () => {
    setLoading(true);
    const [eventsData, citiesData] = await Promise.all([
      fetchAll<EventItem>(COLLECTION, "title"),
      fetchAll<City>("cities", "name"),
    ]);
    setItems(eventsData.map(normalizeEvent));
    setCities(citiesData);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await createDoc(COLLECTION, {
      ...form,
      artists: form.artists
        ? form.artists
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
    });
    setForm({
      title: "",
      cityId: "",
      venue: "",
      date: "",
      time: "",
      description: "",
      bannerUrl: "",
      imageUrl: "",
      artists: "",
    });
    await load();
    setSaving(false);
  };

  const handleUpdate = async (id: string, data: Partial<EventItem>) => {
    await updateDocById(COLLECTION, id, data);
    await load();
  };

  const handleDelete = async (id: string) => {
    await deleteDocById(COLLECTION, id);
    await load();
  };

  const eventsByCity = useMemo(() => {
    const agg: { cityId: string; cityName: string; count: number }[] = [];
    const map = new Map<string, number>();
    items.forEach((ev) => {
      map.set(ev.cityId, (map.get(ev.cityId) ?? 0) + 1);
    });
    map.forEach((count, cityId) => {
      const cityName = cities.find((c) => c.id === cityId)?.name ?? cityId;
      agg.push({ cityId, cityName, count });
    });
    return agg.sort((a, b) => b.count - a.count);
  }, [items, cities]);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((ev) => ev.title?.toLowerCase().includes(term));
  }, [items, search]);

  return (
    <div className="card">
      <h2>Sự kiện</h2>
      <form className="form" onSubmit={handleCreate} style={{ background: "rgba(255,255,255,0.03)", padding: 12, borderRadius: 12, marginBottom: 16 }}>
        <input
          placeholder="Tên sự kiện"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
        />
        <select
          required
          value={form.cityId}
          onChange={(e) => setForm({ ...form, cityId: e.target.value })}
        >
          <option value="">Chọn thành phố</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          placeholder="Địa điểm"
          value={form.venue}
          onChange={(e) => setForm({ ...form, venue: e.target.value })}
        />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            placeholder="Ngày (YYYY-MM-DD)"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
          <input
            placeholder="Giờ (HH:mm)"
            value={form.time}
            onChange={(e) => setForm({ ...form, time: e.target.value })}
          />
        </div>
        <input
          placeholder="Banner URL"
          value={form.bannerUrl}
          onChange={(e) => setForm({ ...form, bannerUrl: e.target.value })}
        />
        <input
          placeholder="Ảnh cover URL"
          value={form.imageUrl}
          onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
        />
        <textarea
          placeholder="Mô tả"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          style={{ minHeight: 80, padding: 10, borderRadius: 8, border: "1px solid #cbd5e1" }}
        />
        <input
          placeholder="Nghệ sĩ (ngăn cách dấu phẩy)"
          value={form.artists}
          onChange={(e) => setForm({ ...form, artists: e.target.value })}
        />
        <button className="btn" type="submit" disabled={saving}>
          {saving ? "Đang lưu..." : "Thêm sự kiện"}
        </button>
      </form>

      <div style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <input
          placeholder="Tìm kiếm sự kiện..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: 12,
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.03)",
            color: "#e2e8f0",
            minWidth: 240,
            flex: 1,
          }}
        />
      </div>

      <div className="card" style={{ background: "rgba(255,255,255,0.02)" }}>
        <h3>Danh sách sự kiện</h3>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
            {filteredItems.map((ev) => (
              <EventCard
                key={ev.id}
                event={ev}
                cities={cities}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Thống kê sự kiện theo khu vực</h3>
        <table style={{ width: "100%", marginTop: 8 }}>
          <thead>
            <tr>
              <th align="left">Thành phố / Khu vực</th>
              <th align="left">Số sự kiện</th>
            </tr>
          </thead>
          <tbody>
            {eventsByCity.map((row) => (
              <tr key={row.cityId}>
                <td>{row.cityName}</td>
                <td>{row.count}</td>
              </tr>
            ))}
            {eventsByCity.length === 0 ? (
              <tr>
                <td colSpan={2} style={{ color: "#94a3b8", textAlign: "center" }}>
                  Chưa có dữ liệu
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const EventCard = ({
  event,
  cities,
  onUpdate,
  onDelete,
}: {
  event: EventItem;
  cities: City[];
  onUpdate: (id: string, data: Partial<EventItem>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<EventItem>(normalizeEvent(event));
  const cityName = cities.find((c) => c.id === event.cityId)?.name ?? "N/A";

  const save = async () => {
    await onUpdate(event.id, {
      ...draft,
      artists: draft.artists ? draft.artists.map((s) => s.trim()).filter(Boolean) : [],
    });
    setEditing(false);
  };

  return (
    <div
      className="card"
      style={{
        padding: 0,
        overflow: "hidden",
        borderRadius: 14,
        background: "rgba(255,255,255,0.04)",
        position: "relative",
      }}
    >
      {event.bannerUrl || event.imageUrl ? (
        <div
          style={{
            height: 140,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundImage: `url(${event.bannerUrl || event.imageUrl})`,
            position: "relative",
          }}
        />
      ) : (
        <div style={{ height: 140, background: "rgba(255,255,255,0.04)" }} />
      )}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
        }}
      >
        <span className="chip" style={{ background: "rgba(99,102,241,0.25)", border: "1px solid rgba(99,102,241,0.5)" }}>
          {cityName}
        </span>
        <span className="chip" style={{ background: "rgba(52,211,153,0.2)", border: "1px solid rgba(52,211,153,0.4)", color: "#d1fae5" }}>
          {event.date ?? "-"} · {event.time ?? "-"}
        </span>
      </div>
      <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 6 }}>
        {editing ? (
          <input
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            style={{ padding: 8, borderRadius: 8 }}
          />
        ) : (
          <div style={{ fontWeight: 700, fontSize: 16 }}>{event.title}</div>
        )}
        <div style={{ fontSize: 13, color: "#cbd5e1" }}>{cityName}</div>
        <div style={{ fontSize: 13, color: "#cbd5e1" }}>{event.venue}</div>
        <div style={{ fontSize: 13, color: "#cbd5e1" }}>
          {event.date ?? "-"} · {event.time ?? "-"}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {(event.artists ?? []).map((a) => (
            <span
              key={a}
              style={{
                fontSize: 12,
                padding: "4px 8px",
                background: "rgba(99,102,241,0.15)",
                borderRadius: 999,
                color: "#e0e7ff",
              }}
            >
              {a}
            </span>
          ))}
        </div>
        {editing ? (
          <>
            <textarea
              value={draft.description ?? ""}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              style={{ minHeight: 60, borderRadius: 8, padding: 8 }}
            />
            <button className="btn" onClick={save}>
              Lưu
            </button>
            <button className="btn secondary" onClick={() => setEditing(false)}>
              Huỷ
            </button>
          </>
        ) : (
          <div style={{ fontSize: 13, color: "#e2e8f0", minHeight: 40 }}>
            {event.description}
          </div>
        )}
        {!editing && (
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button className="btn" onClick={() => setEditing(true)}>
              Sửa
            </button>
            <button className="btn secondary" onClick={() => onDelete(event.id)}>
              Xoá
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Events;

