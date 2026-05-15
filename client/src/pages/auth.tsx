import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '../lib/auth-context';
import { LoginForm } from '../components/auth/login-form';
import { RegisterForm } from '../components/auth/register-form';

export const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      setLocation('/');
    }
  }, [isAuthenticated, setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        {isLogin ? (
          <LoginForm onSwitchToRegister={() => setIsLogin(false)} />
        ) : (
          <RegisterForm onSwitchToLogin={() => setIsLogin(true)} />
        )}
      </div>
    </div>
  );
};
