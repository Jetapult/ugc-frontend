import { Outlet } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import LoginDialog from "./components/ui/login-dialog";
import ErrorBoundary from "./components/ErrorBoundary";

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <LoginDialog />
        <Outlet />
      </AuthProvider>
    </ErrorBoundary>
  );
}
