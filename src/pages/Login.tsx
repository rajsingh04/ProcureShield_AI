import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { initiateGoogleLogin } from '../services/api';
import './Login.css';

const Login: React.FC = () => {
  const handleGoogleLogin = () => {
    initiateGoogleLogin();
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>ProcureShield AI</h2>
        <p>Sign in to your account</p>
        <button className="google-btn" onClick={handleGoogleLogin}>
          <img 
            src="https://developers.google.com/identity/images/g-logo.png" 
            alt="Google Logo" 
            className="google-logo" 
          />
          Sign in with Google
        </button>
      </div>
    </div>
  );
};

export const LoginCallback: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (token) {
      localStorage.setItem('authToken', token);
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
