import { FormEvent, useEffect, useMemo, useState } from "react";
import { createDoc, deleteDocById, fetchAll, updateDocById } from "../lib/firestoreCrud";
import { EventItem, Section } from "../types";
import { formatMoney } from "../utils/formatMoney";

const COLLECTION = "sections";


const Sections = () => {
  const [items, setItems] = useState<Section[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [filterEventId, setFilterEventId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    eventId: "",
    price: "",
    totalSlots: "",
    availableSlots: "",
  });

  const load = async () => {
    setLoading(true);
    const [sectionsData, eventsData] = await Promise.all([
      fetchAll<Section>(COLLECTION, "name"),
      fetchAll<EventItem>("events", "title"),
    ]);
    setItems(sectionsData);
    setEvents(eventsData);
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
      price: form.price ? Number(form.price) : undefined,
      totalSlots: form.totalSlots ? Number(form.totalSlots) : undefined,
      availableSlots: form.availableSlots ? Number(form.availableSlots) : undefined,
    });
    setForm({ name: "", eventId: "", price: "", totalSlots: "", availableSlots: "" });
    await load();
    setSaving(false);
  };

  const filteredItems = useMemo(
    () => items.filter((sec) => (filterEventId ? sec.eventId === filterEventId : true)),
    [items, filterEventId],
  );

  const handleUpdate = async (id: string, data: Partial<Section>) => {
    await updateDocById(COLLECTION, id, data);
    await load();
  };

  const handleDelete = async (id: string) => {
    await deleteDocById(COLLECTION, id);
    await load();
  };

  return (
    <div className="card">
      <h2>Khu / Section</h2>
      <form className="form" onSubmit={handleCreate}>
        <input
          placeholder="Tên khu/section"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <select
          required
          value={form.eventId}
          onChange={(e) => setForm({ ...form, eventId: e.target.value })}
        >
          <option value="">Chọn sự kiện</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.title}
            </option>
          ))}
        </select>
        <input
          placeholder="Giá"
          type="number"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
        />
        <input
          placeholder="Tổng slot"
          type="number"
          value={form.totalSlots}
          onChange={(e) => setForm({ ...form, totalSlots: e.target.value })}
        />
        <input
          placeholder="Slot còn lại"
          type="number"
          value={form.availableSlots}
          onChange={(e) => setForm({ ...form, availableSlots: e.target.value })}
        />
        <button className="btn" type="submit" disabled={saving}>
          {saving ? "Đang lưu..." : "Thêm section"}
        </button>
      </form>

      <div style={{ marginTop: 12, marginBottom: 8 }}>
        <select
          value={filterEventId}
          onChange={(e) => setFilterEventId(e.target.value)}
          style={{ padding: 8, borderRadius: 8, border: "1px solid #cbd5e1" }}
        >
          <option value="">Lọc theo event</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.title}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table style={{ width: "100%", marginTop: 16 }}>
          <thead>
            <tr>
              <th align="left">Tên</th>
              <th align="left">Sự kiện</th>
              <th align="left">Giá</th>
              <th align="left">Tổng slot</th>
              <th align="left">Còn lại</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((sec) => (
              <SectionRow
                key={sec.id}
                section={sec}
                events={events}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

const SectionRow = ({
  section,
  events,
  onUpdate,
  onDelete,
}: {
  section: Section;
  events: EventItem[];
  onUpdate: (id: string, data: Partial<Section>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Section>(section);

  const save = async () => {
    await onUpdate(section.id, {
      ...draft,
      price: draft.price ? Number(draft.price) : undefined,
      totalSlots: draft.totalSlots ? Number(draft.totalSlots) : undefined,
      availableSlots: draft.availableSlots ? Number(draft.availableSlots) : undefined,
    });
    setEditing(false);
  };

  const eventName = events.find((e) => e.id === section.eventId)?.title ?? "N/A";

  return (
    <tr>
      <td>
        {editing ? (
          <input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        ) : (
          section.name
        )}
      </td>
      <td>
        {editing ? (
          <select
            value={draft.eventId}
            onChange={(e) => setDraft({ ...draft, eventId: e.target.value })}
          >
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name}
              </option>
            ))}
          </select>
        ) : (
          eventName
        )}
      </td>
      <td>
        {editing ? (
          <input
            type="number"
            value={draft.price ?? 0}
            onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })}
          />
        ) : (
          formatMoney(section.price)
        )}
      </td>
      <td>
        {editing ? (
          <input
            type="number"
            value={draft.totalSlots ?? 0}
            onChange={(e) => setDraft({ ...draft, totalSlots: Number(e.target.value) })}
          />
        ) : (
          section.totalSlots
        )}
      </td>
      <td>
        {editing ? (
          <input
            type="number"
            value={draft.availableSlots ?? 0}
            onChange={(e) => setDraft({ ...draft, availableSlots: Number(e.target.value) })}
          />
        ) : (
          section.availableSlots
        )}
      </td>
      <td align="right">
        {editing ? (
          <>
            <button className="btn" onClick={save} style={{ marginRight: 8 }}>
              Save
            </button>
            <button className="btn secondary" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </>
        ) : (
          <>
            <button className="btn" onClick={() => setEditing(true)} style={{ marginRight: 8 }}>
              Sửa
            </button>
            <button className="btn secondary" onClick={() => onDelete(section.id)}>
              Xoá
            </button>
          </>
        )}
      </td>
    </tr>
  );
};

export default Sections;

