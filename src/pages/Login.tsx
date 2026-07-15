import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Shield, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success('Registrazione completata! Controlla la tua email.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success('Accesso effettuato!');
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Errore durante l\'autenticazione. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-mesh flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-hairline shadow-[var(--shadow-panel)]">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="mx-auto bg-primary p-3 rounded-lg w-fit">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-display-md font-light">
              Corpo Ambientale Nazionale
            </CardTitle>
            <CardDescription className="text-body-md mt-2">
              {isSignUp ? 'Registra un nuovo account' : 'Accedi all\'area gestionale missioni'}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-ink-secondary font-normal">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="mario.rossi@esempio.it"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-ink-secondary font-normal">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                isSignUp ? 'Registrati' : 'Accedi'
              )}
            </Button>
          </form>

          <div className="text-center mt-4">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-body-md text-primary hover:underline font-normal"
            >
              {isSignUp ? 'Hai già un account? Accedi' : 'Non hai un account? Registrati'}
            </button>
          </div>

          <p className="text-micro-cap text-center text-ink-mute mt-6">
            L'accesso è riservato al personale autorizzato dell'associazione.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
