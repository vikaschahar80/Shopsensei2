import React, { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Loader2 } from 'lucide-react';

export const AuthCallbackPage: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    const handleCallback = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const tokenParam = urlParams.get('token');
      const userParam = urlParams.get('user');
      const errorParam = urlParams.get('error');

      if (errorParam) {
        setError(decodeURIComponent(errorParam));
        setStatus('error');
        return;
      }

      if (tokenParam && userParam) {
        try {
          const userData = JSON.parse(decodeURIComponent(userParam));
          // Store token and user in localStorage so auth context picks it up
          localStorage.setItem('token', tokenParam);
          localStorage.setItem('user', JSON.stringify(userData));
          setStatus('success');
          // Redirect immediately to home
          window.location.replace('/');
        } catch (error) {
          setError('Failed to process authentication');
          setStatus('error');
        }
      } else {
        setError('Invalid callback parameters');
        setStatus('error');
      }
    };

    handleCallback();
  }, []);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <CardTitle>Completing Authentication</CardTitle>
            <CardDescription>Please wait while we complete your sign-in...</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">
              Redirecting you back to the application...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Authentication Failed</CardTitle>
            <CardDescription>There was an error during the authentication process</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <button
              onClick={() => window.location.href = '/auth'}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'success' && user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-green-600">Welcome, {user.firstName || user.username}!</CardTitle>
            <CardDescription>Authentication successful</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Redirecting you to the home page...
            </p>
            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
};
