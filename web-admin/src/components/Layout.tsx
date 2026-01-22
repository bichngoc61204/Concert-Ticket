import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import useAuth from "../hooks/useAuth";
import {
  House,
  MapPinLine,
  CalendarBlank,
  Ticket,
  UsersThree,
  SignOut,
  Robot,
} from "phosphor-react";

const Layout = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleSignOut = async () => {
    await signOut(auth);
    navigate("/login");
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h1>Concert Admin</h1>
        <NavLink to="/" end>
          <House size={18} style={{ marginRight: 8 }} />
          Trang tổng quan
        </NavLink>
        <NavLink to="/cities">
          <MapPinLine size={18} style={{ marginRight: 8 }} />
          Thành phố
        </NavLink>
        <NavLink to="/events">
          <CalendarBlank size={18} style={{ marginRight: 8 }} />
          Sự kiện
        </NavLink>
        <NavLink to="/sections">
          <Ticket size={18} style={{ marginRight: 8 }} />
          Khu/Section
        </NavLink>
        <NavLink to="/orders">
          <Ticket size={18} style={{ marginRight: 8 }} />
          Đơn hàng
        </NavLink>
        <NavLink to="/users">
          <UsersThree size={18} style={{ marginRight: 8 }} />
          Người dùng
        </NavLink>
        <NavLink to="/ai-assistant" className="mt-auto">
          <Robot size={18} style={{ marginRight: 8 }} />
          Trợ lý AI
        </NavLink>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 12, color: "#cbd5e1" }}>
          {user?.email ?? "Admin"}
        </div>
        <button className="btn secondary" onClick={handleSignOut} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <SignOut size={16} />
          Đăng xuất
        </button>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;

