import { FormEvent, useEffect, useState } from "react";
import { createDoc, deleteDocById, fetchAll, updateDocById } from "../lib/firestoreCrud";
import { City } from "../types";

const COLLECTION = "cities";

const Cities = () => {
  const [items, setItems] = useState<City[]>([]);
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await fetchAll<City>(COLLECTION, "name");
    setItems(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await createDoc(COLLECTION, { name, country });
    setName("");
    setCountry("");
    await load();
    setSaving(false);
  };

  const handleUpdate = async (id: string, newName: string, newCountry?: string) => {
    await updateDocById(COLLECTION, id, { name: newName, country: newCountry });
    await load();
  };

  const handleDelete = async (id: string) => {
    await deleteDocById(COLLECTION, id);
    await load();
  };

  return (
    <div className="card">
      <h2>Thành phố</h2>
      <form className="form" onSubmit={handleCreate}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tên thành phố"
          required
        />
        <input
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          placeholder="Quốc gia (tuỳ chọn)"
        />
        <button className="btn" type="submit" disabled={saving}>
          {saving ? "Đang lưu..." : "Thêm thành phố"}
        </button>
      </form>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table style={{ width: "100%", marginTop: 16 }}>
          <thead>
            <tr>
              <th align="left">Tên</th>
              <th align="left">Quốc gia</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <CityRow key={c.id} city={c} onUpdate={handleUpdate} onDelete={handleDelete} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

const CityRow = ({
  city,
  onUpdate,
  onDelete,
}: {
  city: City;
  onUpdate: (id: string, name: string, country?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) => {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(city.name);
  const [country, setCountry] = useState(city.country ?? "");

  const save = async () => {
    await onUpdate(city.id, name, country);
    setEditing(false);
  };

  return (
    <tr>
      <td>
        {editing ? (
          <input value={name} onChange={(e) => setName(e.target.value)} />
        ) : (
          city.name
        )}
      </td>
      <td>
        {editing ? (
          <input value={country} onChange={(e) => setCountry(e.target.value)} />
        ) : (
          country
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
            <button className="btn secondary" onClick={() => onDelete(city.id)}>
              Xoá
            </button>
          </>
        )}
      </td>
    </tr>
  );
};

export default Cities;

