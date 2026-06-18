import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Shield, Truck, ClipboardList, LogOut, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { isAdminRole } from '@/lib/coordinator';
import { motion } from 'motion/react';

import { UserRole } from '@/types';

interface LayoutProps {
  children: React.ReactNode;
  userRole?: UserRole;
  onLogout?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, userRole, onLogout }) => {
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', roles: ['admin', 'coordinator'] },
    { name: 'Missioni', icon: ClipboardList, path: '/missions', roles: ['admin', 'coordinator'] },
    { name: 'Veicolo', icon: Truck, path: '/vehicle', roles: ['admin', 'coordinator'] },
  ];

  const filteredNav = navItems.filter(item => !userRole || item.roles.includes(userRole) || isAdminRole(userRole));

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col font-sans">
      <header className="bg-white border-b border-brand-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-brand-blue p-2 rounded flex items-center justify-center text-white font-bold w-10 h-10">
              CAN
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight text-slate-900">
                Corpo Ambientale Nazionale<br /><span className="text-brand-blue">Sez. di Martina Franca</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {onLogout && (
              <Button variant="ghost" size="sm" onClick={onLogout} className="text-slate-500 hover:text-slate-900">
                <LogOut className="w-4 h-4 mr-2" />
                Esci
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full">
        <main className="flex-1 p-4 md:p-8 overflow-y-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </main>
      </div>

      <footer className="bg-white border-t border-slate-200 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-500 text-sm">
          &copy; {new Date().getFullYear()} Corpo Ambientale Nazionale Sez. di Martina Franca. Tutti i diritti riservati.
        </div>
      </footer>
    </div>
  );
};
