import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { initiateGoogleLogin } from '../services/api';
import './Login.css';
import { useUser } from '../contexts/UserContext';

const Login: React.FC = () => {
  const handleGoogleLogin = () => {
    initiateGoogleLogin();
  };

  return (
    <div className="login-container">
      <div className="ambient-glow glow-1"></div>
      <div className="ambient-glow glow-2"></div>

      <div className="login-card">
        <div className="login-header">
          <div className="logo">
            <span className="logo-icon">🛡️</span>
            <h2>ProcureShield AI</h2>
          </div>
          <p className="tagline">Secure procurement with intelligent anomaly detection</p>
        </div>

        <div className="login-body">
          <p className="lead">Sign in with your Google account to continue</p>
          <button className="google-btn" onClick={handleGoogleLogin}>
            <img 
              src="https://developers.google.com/identity/images/g-logo.png" 
              alt="Google Logo" 
              className="google-logo" 
            />
            Sign in with Google
          </button>
        </div>

        <div className="login-footer">
          <small>By signing in you agree to our <a href="#">Terms</a> and <a href="#">Privacy</a>.</small>
        </div>
      </div>
    </div>
  );
};

export const LoginCallback: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const { setUser } = useUser();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (token) {
      localStorage.setItem('authToken', token);
      // update user context from token
      try {
        const payload = token.split('.')[1];
        const decoded = JSON.parse(atob(payload));
        setUser({ name: decoded.name || decoded.preferred_username || decoded.email, email: decoded.email });
      } catch (e) {
        console.error("Failed to parse token:", e);
      }
      // Use replace so we don't build up history, and use timeout to ensure JS executes
      setTimeout(() => navigate('/', { replace: true }), 100);
    } else {
      const errParam = params.get('error') || 'No token received.';
      setError(`Authentication failed. ${errParam}`);
      setTimeout(() => navigate('/login', { replace: true }), 3000);
    }
  }, [navigate]);

  return (
    <div className="login-container">
      <div className="login-card">
        {error ? (
          <div>
            <h3 style={{color: 'red'}}>Error</h3>
            <p>{error}</p>
            <p>Redirecting to login...</p>
          </div>
        ) : (
          <div>
            <h3>Authenticating...</h3>
            <p>Please wait while we log you in.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
