import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Dashboard } from '@/pages/Dashboard';
import { MissionForm } from '@/pages/MissionForm';
import { MissionEditor } from '@/pages/MissionEditor';
import { Login } from '@/pages/Login';
import { Toaster } from '@/components/ui/sonner';
import { motion, AnimatePresence } from 'motion/react';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';
import { UserRole } from '@/types';
import { isAdminRole } from '@/lib/coordinator';

const AUTH_INIT_TIMEOUT_MS = 8000;

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole>('editor');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const finishLoading = () => {
      if (mounted) setLoading(false);
    };

    const timeoutId = window.setTimeout(finishLoading, AUTH_INIT_TIMEOUT_MS);

    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) console.error('Session error:', error);
        if (mounted) {
          setUser(session?.user ?? null);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        window.clearTimeout(timeoutId);
        finishLoading();
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      // Never call Supabase APIs here — it can deadlock token refresh.
      setUser(session?.user ?? null);
      if (!session?.user) {
        setUserRole('editor');
      }
    });

    return () => {
      mounted = false;
      window.clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setUserRole('editor');
      return;
    }

    let cancelled = false;

    const fetchRole = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (!cancelled && !error && data) {
          setUserRole(data.role as UserRole);
        }
      } catch (err) {
        console.error('Error fetching role:', err);
      }
    };

    fetchRole();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Supabase logout error:', error);
        localStorage.clear();
      }
    } catch (error) {
      console.error('Logout exception:', error);
      localStorage.clear();
    } finally {
      setUser(null);
      setUserRole('editor');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-brand-blue" />
      </div>
    );
  }

  return (
    <Router>
      <Toaster position="top-center" />
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
          
          <Route 
            path="/dashboard" 
            element={
              user ? (
                <Layout onLogout={handleLogout} userRole={userRole}>
                  <Dashboard userRole={userRole} />
                </Layout>
              ) : <Navigate to="/login" />
            } 
          />

          <Route 
            path="/missions/new" 
            element={
              user && isAdminRole(userRole) ? (
                <Layout onLogout={handleLogout} userRole={userRole}>
                  <MissionForm />
                </Layout>
              ) : <Navigate to={user ? "/dashboard" : "/login"} />
            } 
          />

          <Route 
            path="/missions/:id" 
            element={
              user ? (
                <Layout onLogout={handleLogout} userRole={userRole}>
                  <MissionEditor userRole={userRole} />
                </Layout>
              ) : <Navigate to="/login" />
            } 
          />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AnimatePresence>
    </Router>
  );
}

export default App;
