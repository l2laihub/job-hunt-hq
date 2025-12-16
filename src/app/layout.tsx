import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { cn } from '@/src/lib/utils';
import {
  Layout,
  Briefcase,
  Search,
  Globe,
  Book,
  Mic,
  User,
  Download,
  Upload,
  Settings,
} from 'lucide-react';
import { useApplicationStore } from '@/src/stores';
import { ToastContainer, Button } from '@/src/components/ui';
import { ApplicationModal } from '@/src/components/applications';
import { useDataExport } from '@/src/hooks';

const navItems = [
  { to: '/', label: 'Dashboard', icon: Briefcase },
  { to: '/analyzer', label: 'JD Analyzer', icon: Search },
  { to: '/research', label: 'Research', icon: Globe },
  { to: '/stories', label: 'My Stories', icon: Book },
  { to: '/interview', label: 'Mock Interview', icon: Mic },
  { to: '/profile', label: 'Profile', icon: User },
];

export const AppLayout: React.FC = () => {
  // Select applications directly to avoid infinite loop from getStats() returning new object
  const applications = useApplicationStore((s) => s.applications);
  const { exportData } = useDataExport();

  // Compute stats locally
  const total = applications.length;
  const interviewing = applications.filter((a) => a.status === 'interviewing').length;
  const responded = applications.filter((a) =>
    ['interviewing', 'offer', 'rejected'].includes(a.status)
  ).length;
  const responseRate = total > 0 ? Math.round((responded / total) * 100) : 0;

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-100 font-sans selection:bg-blue-500/30">
      {/* Header */}
      <header className="h-16 border-b border-gray-800 bg-gray-900/50 backdrop-blur-md px-6 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-6">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-2 text-blue-500">
            <Layout className="w-6 h-6" />
            <h1 className="font-bold text-xl tracking-tight text-white">
              Job Hunt HQ
            </h1>
          </NavLink>

          {/* Navigation */}
          <nav className="hidden md:flex items-center p-1 bg-gray-800 rounded-lg border border-gray-700">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2',
                    isActive
                      ? 'bg-gray-700 text-white shadow-sm'
                      : 'text-gray-400 hover:text-gray-200'
                  )
                }
              >
                <item.icon className="w-4 h-4" />
                <span className="hidden lg:inline">{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Right side - Stats & Actions */}
        <div className="flex items-center gap-4">
          {/* Stats */}
          <div className="hidden lg:flex items-center gap-4 text-sm text-gray-400">
            <div className="flex flex-col items-end">
              <span className="text-xs font-semibold text-gray-500 uppercase">
                Total
              </span>
              <span className="text-white font-mono">{total}</span>
            </div>
            <div className="w-px h-8 bg-gray-800" />
            <div className="flex flex-col items-end">
              <span className="text-xs font-semibold text-gray-500 uppercase">
                Interviews
              </span>
              <span className="text-purple-400 font-mono">
                {interviewing}
              </span>
            </div>
            <div className="w-px h-8 bg-gray-800" />
            <div className="flex flex-col items-end">
              <span className="text-xs font-semibold text-gray-500 uppercase">
                Resp. Rate
              </span>
              <span className="text-green-400 font-mono">
                {responseRate}%
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={exportData}
              leftIcon={<Download className="w-4 h-4" />}
              className="hidden sm:flex"
            >
              Export
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>

      {/* Toast Notifications */}
      <ToastContainer />

      {/* Application Modal */}
      <ApplicationModal />
    </div>
  );
};
