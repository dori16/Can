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

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
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
                <Layout onLogout={handleLogout} userRole="admin">
                  <Dashboard />
                </Layout>
              ) : <Navigate to="/login" />
            } 
          />

          <Route 
            path="/missions/new" 
            element={
              user ? (
                <Layout onLogout={handleLogout} userRole="admin">
                  <MissionForm />
                </Layout>
              ) : <Navigate to="/login" />
            } 
          />

          <Route 
            path="/missions/:id" 
            element={
              <Layout onLogout={user ? handleLogout : undefined} userRole={user ? "admin" : "editor"}>
                <MissionEditor />
              </Layout>
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
