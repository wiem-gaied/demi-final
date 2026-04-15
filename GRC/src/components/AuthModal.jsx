import { useNavigate, useLocation } from "react-router-dom";
import LoginPage from "../pages/LoginPage";
import ForgotPasswordPage from "../pages/ForgotPasswordPage";
import Home from "../pages/Home";

export default function AuthModal() {
  const navigate = useNavigate();
  const location = useLocation();

  const isForgot = location.pathname === "/forgot";
  const isReset = location.pathname.startsWith("/reset-password");

  const handleClose = (e) => {
    if (e.target === e.currentTarget) {
      navigate("/");
    }
  };

  return (
    <>
      <Home />

      <div
        onClick={handleClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15,23,42,0.35)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
        }}
      >
        <div onClick={(e) => e.stopPropagation()}>
          {isReset ? (
            <ForgotPasswordPage />
          ) : isForgot ? (
            <ForgotPasswordPage />
          ) : (
            <LoginPage />
          )}
        </div>
      </div>
    </>
  );
}