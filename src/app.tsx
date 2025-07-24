import { Outlet } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import LoginDialog from "@/components/ui/login-dialog";

export default function App() {
  return (
    <AuthProvider>
      <LoginDialog />
      <Outlet />
    </AuthProvider>
  );
}
