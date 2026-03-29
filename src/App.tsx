import { useState, useEffect } from "react";
import { Routes, Route, useNavigate, Navigate } from "react-router-dom";
import "./App.css";
import { UserProvider, useUser } from "./contexts/UserContext";
import HistoryModal from "./components/HistoryModal";
import Dashboard from "./pages/Dashboard";
import Home from "./pages/Home";
import Login, { LoginCallback } from "./pages/Login";

// Optional: Decode JWT to get user info
// const parseJwt = (token: string) => {
//   try {
//     return JSON.parse(atob(token.split('.')[1]));
//   } catch (e) {
//     return null;
//   }
// };

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem("authToken");
  return token ? <>{children}</> : <Navigate to="/login" replace />;
};

function App() {
  const [analysisData, setAnalysisData] = useState<any>(null);
  const navigate = useNavigate();

  const handleAnalyzeSuccess = (data: any) => {
    setAnalysisData(data);
    try {
      localStorage.setItem("analysisData", JSON.stringify(data));
    } catch (e) {
      console.warn("Could not persist analysisData to localStorage", e);
    }
    navigate("/dashboard");
  };

  const handleBack = () => {
    setAnalysisData(null);
    try {
      localStorage.removeItem("analysisData");
    } catch (e) {}
    navigate("/");
  };

  // Load persisted analysis on app start so dashboard survives reloads
  useEffect(() => {
    try {
      const raw = localStorage.getItem("analysisData");
      if (raw) setAnalysisData(JSON.parse(raw));
    } catch (e) {
      console.warn("Could not load persisted analysisData", e);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    navigate("/login");
  };

  return (
    <div className="App">
      <UserProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/login/callback" element={<LoginCallback />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Home
                  onAnalyzeSuccess={handleAnalyzeSuccess}
                  headerRight={<HeaderUser onLogout={handleLogout} />}
                />
              </PrivateRoute>
            }
          />
          <Route
            path="/dashboard/*"
            element={
              <PrivateRoute>
                <Dashboard data={analysisData} onBack={handleBack} />
              </PrivateRoute>
            }
          />
        </Routes>
      </UserProvider>
    </div>
  );
}

export default App;

const HeaderUser: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  try {
    const { user } = useUser();
    const [historyOpen, setHistoryOpen] = useState(false);
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {user && user.name ? (
          <span className="header-username">{user.name}</span>
        ) : null}
        <button
          className="history-btn"
          onClick={() => setHistoryOpen(true)}
          style={{ padding: "8px 12px", borderRadius: 8 }}
        >
          History
        </button>
        <button className="header-logout" onClick={onLogout}>
          Logout
        </button>
        <HistoryModal
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
        />
      </div>
    );
  } catch (e) {
    return (
      <button className="header-logout" onClick={onLogout}>
        Logout
      </button>
    );
  }
};
