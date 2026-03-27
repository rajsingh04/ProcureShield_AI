import { useState } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import './App.css'
import { UserProvider, useUser } from './contexts/UserContext';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home';
import Login, { LoginCallback } from './pages/Login';

// Optional: Decode JWT to get user info 
// const parseJwt = (token: string) => {
//   try {
//     return JSON.parse(atob(token.split('.')[1]));
//   } catch (e) {
//     return null;
//   }
// };

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('authToken');
  return token ? <>{children}</> : <Navigate to="/login" replace />;
};

function App() {
  const [analysisData, setAnalysisData] = useState<any>(null);
  const navigate = useNavigate();

  const handleAnalyzeSuccess = (data: any) => {
    setAnalysisData(data);
    navigate('/dashboard');
  };

  const handleBack = () => {
    setAnalysisData(null);
    navigate('/');
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    navigate('/login');
  };

  return (
    <div className="App">
      <UserProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/login/callback" element={<LoginCallback />} />
        <Route path="/" element={
          <PrivateRoute>
            <div style={{position: 'absolute', top: 10, right: 20, zIndex: 1000}}>
              <HeaderUser onLogout={handleLogout} />
            </div>
            <Home onAnalyzeSuccess={handleAnalyzeSuccess} />
          </PrivateRoute>
        } />
        <Route path="/dashboard/*" element={
          <PrivateRoute>
            <Dashboard data={analysisData} onBack={handleBack} />
          </PrivateRoute>
        } />
      </Routes>
      </UserProvider>
    </div>
  );
}

export default App

const HeaderUser: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
    try {
    const { user } = useUser();
    return (
      <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
        {user && user.name ? <span className="header-username">{user.name}</span> : null}
        <button className="header-logout" onClick={onLogout}>
          Logout
        </button>
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
