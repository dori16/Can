import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Truck, LogOut, LayoutDashboard } from 'lucide-react';
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
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', roles: ['admin', 'coordinator', 'editor'] },
    { name: 'Veicoli', icon: Truck, path: '/vehicle', roles: ['admin', 'coordinator'] },
  ];

  const filteredNav = navItems.filter(item => !userRole || item.roles.includes(userRole) || isAdminRole(userRole));

  return (
    <div className="min-h-screen flex flex-col font-sans app-shell-main">
      <header className="app-shell-header sticky top-0 z-50 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary p-2 rounded-md flex items-center justify-center text-white font-normal text-sm w-10 h-10">
              CAN
            </div>
            <div>
              <h1 className="font-light text-base leading-tight text-white tracking-[-0.02em]">
                Corpo Ambientale Nazionale
              </h1>
              <p className="text-primary-subdued text-sm font-light">Sez. di Martina Franca</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <nav className="hidden md:flex items-center gap-1">
              {filteredNav.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-full text-sm font-normal transition-colors',
                      isActive
                        ? 'bg-white/15 text-white'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
            {onLogout && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onLogout}
                className="text-white/70 hover:text-white hover:bg-white/10 rounded-full"
              >
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

      <footer className="bg-canvas border-t border-hairline py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-caption">
          &copy; {new Date().getFullYear()} Corpo Ambientale Nazionale Sez. di Martina Franca. Tutti i diritti riservati.
        </div>
      </footer>
    </div>
  );
};
