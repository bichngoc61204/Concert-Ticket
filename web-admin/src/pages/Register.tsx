import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "../firebase";

const Register = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const userCred = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );
      if (displayName) {
        await updateProfile(userCred.user, { displayName });
      }
      // TODO: set admin custom claim via server-side script
      navigate("/");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Register failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell" style={{ alignItems: "center", justifyContent: "center" }}>
      <div className="card" style={{ width: 380 }}>
        <h2>Đăng ký Quản trị</h2>
        <form className="form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Tên hiển thị (tuỳ chọn)"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <input
            type="email"
            placeholder="Email quản trị"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Mật khẩu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error ? <div style={{ color: "crimson", fontSize: 14 }}>{error}</div> : null}
          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Đang tạo..." : "Tạo tài khoản quản trị"}
          </button>
        </form>
        <p style={{ marginTop: 12, fontSize: 14 }}>
          Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;

