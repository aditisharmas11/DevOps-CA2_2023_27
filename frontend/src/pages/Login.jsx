import React, { useState, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  // Get the redirect URL from location state, defaulting to dashboard ('/')
  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await login(username, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-[420px] border-border bg-card shadow-2xl p-4">
        <CardHeader className="text-center pb-6">
          <CardTitle className="font-outfit text-2xl font-bold tracking-wide text-foreground">
            LOGISTICS HUB
          </CardTitle>
          <CardDescription className="text-muted-foreground text-sm">
            Warehouse & Logistics Management System
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="alert-danger mb-6 p-4 rounded-lg bg-red-950/40 border border-red-900/50 text-red-400 text-sm">
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Username
              </Label>
              <Input
                type="text"
                id="username"
                className="bg-accent/40 border-border text-foreground placeholder:text-muted-foreground"
                placeholder="e.g. manager"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Password
              </Label>
              <Input
                type="password"
                id="password"
                className="bg-accent/40 border-border text-foreground placeholder:text-muted-foreground"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="current-password"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-semibold"
              disabled={loading}
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
