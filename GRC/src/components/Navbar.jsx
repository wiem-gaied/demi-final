import { useState } from "react";
import LoginPage from "../pages/LoginPage";
import { useNavigate, useLocation } from "react-router-dom";


const C = {
  bg: "#F8FAFF", surface: "#FFFFFF", surfaceAlt: "#F0F4FF",
  border: "#E2E8F8", borderStrong: "#C7D2F0",
  wow: "#3B6FFF", accentLight: "#EEF2FF", accentHover: "#2D5CE8",
  purple: "#6D28D9", purpleLight: "#F5F0FF",
  success: "#059669", successLight: "#ECFDF5",
  warning: "#061585", warningLight: "#FFFBEB",
  danger: "#DC2626", dangerLight: "#FEF2F2",
  info: "#0891B2", infoLight: "#ECFEFF",
  text: "#0F172A", textMid: "#475569", textMuted: "#94A3B8",
  shadow: "0 1px 3px rgba(15,23,42,0.07)",
  shadowMd: "0 4px 12px rgba(15,23,42,0.09)",
  shadowLg: "0 10px 30px rgba(15,23,42,0.13)",
};
C.accent = `linear-gradient(135deg, ${C.wow}, ${C.warning})`;

export default function Navbar() {
  const [openLogin, setOpenLogin] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isAboutPage = location.pathname === "/About";
  const isContactPage = location.pathname === "/contact";

  const isDarkPage =
    location.pathname === "/About" || location.pathname === "/contact";

  const linkClass = isDarkPage
    ? "font-semibold text-slate-950 hover:text-black transition cursor-pointer"
    : "font-semibold text-blue-800 hover:text-purple-700 transition cursor-pointer";

  const buttonClass = isDarkPage
    ? "flex items-center  text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition border border-slate-700"
    : "flex items-center gap-2 bg-blue-800 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg transition";

  return (
    <>
      {/* Navbar */}
      <div className="fixed top-0 left-0 w-full z-[999] flex justify-between items-center px-6 sm:px-20 py-3 backdrop-blur-xl">

        {/* Left */}
        <div className="flex items-center gap-6">
          <h1 onClick={() => navigate(isAboutPage ? "/" : "/About")} className={linkClass}>
            {isAboutPage ? "Home" : "About"}
          </h1>

          <h1 onClick={() => navigate(isContactPage ? "/" : "/contact")} className={linkClass}>
            {isContactPage ? "Home" : "Contact"}
          </h1>
        </div>

        {/* Right */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => setOpenLogin(true)}   // ✅ FIX ICI
            className={buttonClass}
            style={isDarkPage ? { background: C.accent } : {}}
          >
            <span>Login</span>

            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-4 h-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 5l7 7-7 7M5 12h14"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Modal Login */}
      {openLogin && (
        <div style={MODAL_OVERLAY}>
          <LoginPage onClose={() => setOpenLogin(false)} />
        </div>
      )}
    </>
  );
}

/* Overlay */
const MODAL_OVERLAY = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(0, 0, 0, 0.5)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 9999,
};