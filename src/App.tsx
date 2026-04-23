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

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole>('editor');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single();
        if (!error && data) {
          setUserRole(data.role as UserRole);
        }
      } catch (err) {
        console.error('Error fetching role:', err);
      }
    };

    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchRole(session.user.id);
      }
      setLoading(false);
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchRole(session.user.id);
      } else {
        setUserRole('editor');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
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
              user && userRole === 'admin' ? (
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
