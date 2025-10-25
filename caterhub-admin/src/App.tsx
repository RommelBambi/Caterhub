import { useEffect, useState } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Container } from "./components/ui/Container";
import { Button } from "./components/ui/Button";
import { HomePage } from "./pages/HomePage";
import { PartnersPage } from "./pages/PartnersPage";
import { AdminShell } from "./components/admin/AdminShell";
import { LoginModal } from "./components/auth/LoginModal";
import { COLORS } from "./constants/colors";
import { STORAGE_KEYS, EMPTY_PARTNER_FORM } from "./constants/storage";
import { loadJSON, saveJSON, clearJSON } from "./utils/storage";
import { RouteKey, StepKey, PartnerForm, AuthUser } from "./types";

// Create a client
const queryClient = new QueryClient();

// Application submission function
async function sendApplicationToRecruitment(form: PartnerForm) {
  const applicant = {
    id: "APP-" + Date.now(),
    businessName: form.businessName,
    owner: form.ownerName,
    location: `${form.city || "—"}, PH`,
    status: "Pending" as const,
  };

  try {
    const raw = await loadJSON<any[]>(STORAGE_KEYS.APPLICANTS, []);
    const list = Array.isArray(raw) ? raw : [];
    list.unshift(applicant);
    await saveJSON(STORAGE_KEYS.APPLICANTS, list);
    console.log("[Recruitment] Applicant saved:", applicant);
  } catch (e) {
    console.log("[Recruitment] Applicants write error:", e);
  }

  try {
    const rawN = await loadJSON<any[]>(STORAGE_KEYS.NOTIF, []);
    const notifs = Array.isArray(rawN) ? rawN : [];
    notifs.unshift({
      id: "N-" + Date.now(),
      ts: new Date().toISOString(),
      type: "recruitment",
      title: "New caterer applicant",
      message: `${applicant.businessName} • ${applicant.owner}`,
      page: "recruitment" as const,
      read: false,
    });
    await saveJSON(STORAGE_KEYS.NOTIF, notifs.slice(0, 200));
    console.log("[Recruitment] Notification added");
  } catch (e) {
    console.log("[Recruitment] Notif write error:", e);
  }
}

function App() {
  const [route, setRoute] = useState<RouteKey>("home");
  const [step, setStep] = useState<StepKey>("hero");
  const [form, setForm] = useState<PartnerForm>(EMPTY_PARTNER_FORM);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [showLogin, setShowLogin] = useState(false);

  // Load user on mount
  useEffect(() => {
    loadJSON<AuthUser | null>(STORAGE_KEYS.AUTH, null).then((u) => {
      if (u?.username && (u.role === "admin" || u.role === "user")) {
        setUser(u);
      }
    });
  }, []);

  // Navigation functions
  const goHome = () => {
    setRoute("home");
    setStep("hero");
  };

  const goPartners = () => {
    setRoute("partners");
    setStep("hero");
  };

  const goAdmin = () => {
    if (!user) {
      setShowLogin(true);
      return;
    }
    setRoute("admin");
  };

  const handleLogin = (username: string, password: string) => {
    if (username === "admin" && password) {
      const newUser: AuthUser = { username, role: "admin" };
      setUser(newUser);
      saveJSON(STORAGE_KEYS.AUTH, newUser);
      setShowLogin(false);
      setRoute("admin");
    } else {
      alert("Invalid credentials");
    }
  };

  const handleLogout = () => {
    setUser(null);
    clearJSON();
    setRoute("home");
  };

  const handleFormChange = (updates: Partial<PartnerForm>) => {
    const newForm = { ...form, ...updates };
    setForm(newForm);
    saveJSON(STORAGE_KEYS.FORM, newForm);
  };

  const handleStepNext = () => {
    const steps: StepKey[] = ["hero", "step1", "step2", "step3", "step4", "step5", "success"];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const handleStepPrev = () => {
    const steps: StepKey[] = ["hero", "step1", "step2", "step3", "step4", "step5", "success"];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  const handleSubmit = async () => {
    try {
      await sendApplicationToRecruitment(form);
      setStep("success");
      clearJSON();
      setForm(EMPTY_PARTNER_FORM);
    } catch (error) {
      console.error("Submission error:", error);
      alert("Failed to submit application. Please try again.");
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div style={{ minHeight: "100vh", backgroundColor: COLORS.bg }}>
          {/* Top header (hidden inside Admin) */}
          {route !== "admin" && (
            <div style={{ backgroundColor: COLORS.primary }}>
              <Container>
                <div style={{ 
                  padding: "12px 20px", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "space-between" 
                }}>
                  <button 
                    onClick={goHome} 
                    style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      gap: "10px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#fff",
                      fontSize: "20px",
                      fontWeight: "900",
                      letterSpacing: "0.3px"
                    }}
                  >
                    <div style={{ 
                      width: "28px", 
                      height: "28px", 
                      backgroundColor: "#fff", 
                      borderRadius: "6px", 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center" 
                    }}>
                      <span style={{ color: COLORS.primary, fontWeight: "900", fontSize: "14px" }}>CH</span>
                    </div>
                    CaterHub
                  </button>
                  
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Button 
                      label="Location" 
                      variant="ghost" 
                      onPress={() => alert("Branch locator coming soon.")} 
                    />
                    <Button 
                      label="Contact us" 
                      variant="ghost" 
                      onPress={() => alert("support@caterhub.io")} 
                    />
                  </div>
                  
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <Button 
                      label="Partners" 
                      variant="outline" 
                      onPress={goPartners} 
                    />
                    <Button 
                      label="Admin" 
                      variant="solid" 
                      onPress={goAdmin} 
                    />
                  </div>
                </div>
              </Container>
            </div>
          )}

          {/* Main content */}
          <div style={{ flex: 1 }}>
            {route === "home" && <HomePage onNavigate={goPartners} />}
            {route === "partners" && (
              <PartnersPage
                step={step}
                form={form}
                onFormChange={handleFormChange}
                onStepNext={handleStepNext}
                onStepPrev={handleStepPrev}
                onSubmit={handleSubmit}
                onNavigate={goHome}
              />
            )}
            {route === "admin" && user && (
              <AdminShell user={user} onLogout={handleLogout} />
            )}
          </div>

          {/* Login Modal */}
          {showLogin && (
            <LoginModal
              onLogin={handleLogin}
              onClose={() => setShowLogin(false)}
            />
          )}
    </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;