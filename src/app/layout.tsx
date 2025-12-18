import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { cn } from '@/src/lib/utils';
import {
  Layout,
  Briefcase,
  Search,
  Globe,
  Book,
  Mic,
  Zap,
  User,
  Download,
  Upload,
  Menu,
  X,
  Sparkles,
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
  { to: '/answers', label: 'Answer Prep', icon: Zap },
  { to: '/enhance', label: 'Enhance', icon: Sparkles },
  { to: '/profile', label: 'Profile', icon: User },
];

export const AppLayout: React.FC = () => {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const applications = useApplicationStore((s) => s.applications);
  const { exportData, triggerImport, handleFileSelect, fileInputRef } = useDataExport();

  // Compute stats locally
  const total = applications.length;
  const interviewing = applications.filter((a) => a.status === 'interviewing').length;
  const responded = applications.filter((a) =>
    ['interviewing', 'offer', 'rejected'].includes(a.status)
  ).length;
  const responseRate = total > 0 ? Math.round((responded / total) * 100) : 0;

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 font-sans selection:bg-blue-500/30">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden md:flex flex-col border-r border-gray-800 bg-gray-900/50 backdrop-blur-md transition-all duration-300 ease-in-out shrink-0',
          sidebarExpanded ? 'w-56' : 'w-16'
        )}
        onMouseEnter={() => setSidebarExpanded(true)}
        onMouseLeave={() => setSidebarExpanded(false)}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-gray-800 shrink-0">
          <NavLink to="/" className="flex items-center gap-3 text-blue-500 overflow-hidden">
            <Layout className="w-6 h-6 shrink-0" />
            <span
              className={cn(
                'font-bold text-lg tracking-tight text-white whitespace-nowrap transition-opacity duration-200',
                sidebarExpanded ? 'opacity-100' : 'opacity-0'
              )}
            >
              Job Hunt HQ
            </span>
          </NavLink>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative',
                  isActive
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50 border border-transparent'
                )
              }
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <span
                className={cn(
                  'text-sm font-medium whitespace-nowrap transition-opacity duration-200',
                  sidebarExpanded ? 'opacity-100' : 'opacity-0 w-0'
                )}
              >
                {item.label}
              </span>
              {/* Tooltip for collapsed state */}
              {!sidebarExpanded && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 pointer-events-none z-50 whitespace-nowrap border border-gray-700 shadow-lg">
                  {item.label}
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Sidebar Footer - Stats */}
        <div
          className={cn(
            'border-t border-gray-800 p-3 space-y-2 transition-opacity duration-200',
            sidebarExpanded ? 'opacity-100' : 'opacity-0'
          )}
        >
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Total Apps</span>
            <span className="text-white font-mono">{total}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Interviews</span>
            <span className="text-purple-400 font-mono">{interviewing}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Resp. Rate</span>
            <span className="text-green-400 font-mono">{responseRate}%</span>
          </div>
          <div className="flex gap-2 mt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={exportData}
              leftIcon={<Download className="w-4 h-4" />}
              className="flex-1 justify-start"
            >
              Export
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={triggerImport}
              leftIcon={<Upload className="w-4 h-4" />}
              className="flex-1 justify-start"
            >
              Import
            </Button>
          </div>
        </div>

      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-gray-900/95 backdrop-blur-md border-b border-gray-800 z-30 flex items-center justify-between px-4">
        <NavLink to="/" className="flex items-center gap-2 text-blue-500">
          <Layout className="w-5 h-5" />
          <span className="font-bold text-lg text-white">Job Hunt HQ</span>
        </NavLink>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Slide-out Menu */}
      <div
        className={cn(
          'md:hidden fixed top-14 left-0 bottom-0 w-64 bg-gray-900 border-r border-gray-800 z-50 transform transition-transform duration-300 ease-in-out',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <nav className="flex-1 py-4 px-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-3 rounded-lg transition-all',
                  isActive
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50 border border-transparent'
                )
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="text-sm font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Mobile Stats */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-gray-800 p-4 bg-gray-900">
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="text-center">
              <div className="text-lg font-mono text-white">{total}</div>
              <div className="text-xs text-gray-500">Total</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-mono text-purple-400">{interviewing}</div>
              <div className="text-xs text-gray-500">Interviews</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-mono text-green-400">{responseRate}%</div>
              <div className="text-xs text-gray-500">Response</div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                exportData();
                setMobileMenuOpen(false);
              }}
              leftIcon={<Download className="w-4 h-4" />}
              className="flex-1 justify-center"
            >
              Export
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                triggerImport();
                setMobileMenuOpen(false);
              }}
              leftIcon={<Upload className="w-4 h-4" />}
              className="flex-1 justify-center"
            >
              Import
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile spacer for fixed header */}
        <div className="md:hidden h-14 shrink-0" />

        {/* Main Content */}
        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>

      {/* Toast Notifications */}
      <ToastContainer />

      {/* Application Modal */}
      <ApplicationModal />

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};
