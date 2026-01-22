import { useEffect, useState } from "react";
import { fetchAll } from "../lib/firestoreCrud";
import { UserDoc } from "../types";

const toDateString = (val: unknown) => {
  if (val && typeof val === "object" && "seconds" in (val as any)) {
    return new Date((val as any).seconds * 1000).toLocaleDateString("vi-VN");
  }
  if (typeof val === "string") return val;
  return "-";
};

const COLLECTION = "users";

const Users = () => {
  const [items, setItems] = useState<UserDoc[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await fetchAll<UserDoc>(COLLECTION, "email");
    setItems(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="card">
      <h2>Người dùng (chỉ xem)</h2>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table style={{ width: "100%" }}>
          <thead>
            <tr>
              <th align="left">Email</th>
              <th align="left">Tên</th>
              <th align="left">Số điện thoại</th>
              <th align="left">Ngày tạo</th>
            </tr>
          </thead>
          <tbody>
            {items.map((u) => (
              <tr key={u.id}>
                <td>{u.email}</td>
                <td>{u.name ?? u.displayName ?? "-"}</td>
                <td>{u.phone ?? "-"}</td>
                <td>{toDateString(u.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Users;

