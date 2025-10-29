import { useEffect, useState } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminShell } from "./components/admin/AdminShell";
import { COLORS } from "./constants/colors";
import { loadUser, saveUser, clearUser } from "./utils/storage";
import { AuthUser } from "./types";
import { LoginPage } from "./pages/LoginPage";

const queryClient = new QueryClient();

function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    loadUser().then((savedUser) => {
      if (savedUser?.role === "admin") {
        setUser(savedUser);
      }
    });
  }, []);

  const handleLogin = (username: string, password: string) => {
    const normalized = username.trim().toLowerCase();
    const hasPassword = Boolean(password.trim());

    if (normalized === "admin" && hasPassword) {
      const newUser: AuthUser = { username, role: "admin" };
      setUser(newUser);
      saveUser(newUser);
      setLoginError(null);
    } else {
      setLoginError("Invalid credentials. Please try again.");
    }
  };

  const handleLogout = () => {
    setUser(null);
    clearUser();
  };

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div style={{ minHeight: "100vh", backgroundColor: COLORS.bg }}>
          {user ? (
            <AdminShell user={user} onLogout={handleLogout} />
          ) : (
            <LoginPage onSubmit={handleLogin} error={loginError ?? undefined} />
          )}
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
