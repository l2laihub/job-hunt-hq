import React, { useState, useEffect } from 'react';
import { JobApplication, JDAnalysis, ApplicationStatus, UserProfile, DEFAULT_PROFILE } from './types';
import { JobCard } from './components/JobCard';
import { Analyzer } from './components/Analyzer';
import { ApplicationModal } from './components/ApplicationModal';
import { ProfileBuilder } from './components/ProfileBuilder';
import { Layout, Plus, PieChart, Briefcase, Archive, CheckCircle, XCircle, User } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

// Local Storage Keys
const STORAGE_KEY_APPS = "jobhunt-hq-applications";
const STORAGE_KEY_PROFILE = "jobhunt-hq-profile";

const COLUMNS: { id: ApplicationStatus; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'wishlist', label: 'Wishlist', icon: <Archive className="w-4 h-4"/>, color: 'text-gray-400' },
  { id: 'applied', label: 'Applied', icon: <Briefcase className="w-4 h-4"/>, color: 'text-blue-400' },
  { id: 'interviewing', label: 'Interviewing', icon: <PieChart className="w-4 h-4"/>, color: 'text-purple-400' },
  { id: 'offer', label: 'Offer', icon: <CheckCircle className="w-4 h-4"/>, color: 'text-green-400' },
  { id: 'rejected', label: 'Rejected', icon: <XCircle className="w-4 h-4"/>, color: 'text-red-400' },
];

export default function App() {
  // State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'analyzer' | 'profile'>('dashboard');
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Track currently editing app
  const [editingApp, setEditingApp] = useState<JobApplication | undefined>(undefined);
  
  // For saving from Analyzer to Dashboard
  const [pendingAnalysis, setPendingAnalysis] = useState<{data: JDAnalysis, jd: string} | null>(null);

  // Load Data
  useEffect(() => {
    const savedApps = localStorage.getItem(STORAGE_KEY_APPS);
    const savedProfile = localStorage.getItem(STORAGE_KEY_PROFILE);
    
    if (savedApps) {
      try { setApplications(JSON.parse(savedApps)); } catch (e) { console.error("Apps parse error", e); }
    }
    if (savedProfile) {
      try { setProfile(JSON.parse(savedProfile)); } catch (e) { console.error("Profile parse error", e); }
    }
  }, []);

  // Save Apps
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_APPS, JSON.stringify(applications));
  }, [applications]);

  // Save Profile Logic (Triggered by ProfileBuilder)
  const handleSaveProfile = (newProfile: UserProfile) => {
    setProfile(newProfile);
    localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(newProfile));
  };

  // Drag and Drop
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('applicationId', id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, status: ApplicationStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('applicationId');
    setApplications(prev => prev.map(app => 
      app.id === id ? { ...app, status, updatedAt: new Date().toISOString() } : app
    ));
  };

  // CRUD
  const handleSaveApplication = (partialApp: Partial<JobApplication>) => {
    if (partialApp.id) {
      // Update
      setApplications(prev => prev.map(app => 
        app.id === partialApp.id ? { ...app, ...partialApp, updatedAt: new Date().toISOString() } as JobApplication : app
      ));
    } else {
      // Create
      const newApp: JobApplication = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        company: partialApp.company || 'Unknown',
        role: partialApp.role || 'Unknown',
        status: partialApp.status || 'wishlist',
        source: partialApp.source || 'other',
        type: partialApp.type || 'fulltime',
        notes: partialApp.notes || '',
        salaryRange: partialApp.salaryRange,
        jobDescriptionRaw: partialApp.jobDescriptionRaw,
        analysis: partialApp.analysis
      };
      setApplications(prev => [newApp, ...prev]);
    }
    setPendingAnalysis(null);
    setEditingApp(undefined);
  };

  const handleSaveFromAnalyzer = (analysis: JDAnalysis, jdText: string) => {
    setPendingAnalysis({ data: analysis, jd: jdText });
    setEditingApp(undefined); // Ensure we are creating new
    setIsModalOpen(true);
  };

  const handleEditApplication = (app: JobApplication) => {
    setEditingApp(app);
    setPendingAnalysis(null);
    setIsModalOpen(true);
  };

  const handleNewApplication = () => {
    setEditingApp(undefined);
    setPendingAnalysis(null);
    setIsModalOpen(true);
  };

  // Stats
  const totalApps = applications.length;
  const interviewing = applications.filter(a => a.status === 'interviewing').length;
  const responseRate = totalApps > 0 
    ? Math.round((applications.filter(a => ['interviewing', 'offer', 'rejected'].includes(a.status)).length / totalApps) * 100) 
    : 0;

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-100 font-sans selection:bg-blue-500/30">
      
      {/* Header */}
      <header className="h-16 border-b border-gray-800 bg-gray-900/50 backdrop-blur-md px-6 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-blue-500">
            <Layout className="w-6 h-6" />
            <h1 className="font-bold text-xl tracking-tight text-white">Job Hunt HQ</h1>
          </div>
          
          <nav className="flex items-center p-1 bg-gray-800 rounded-lg border border-gray-700">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={cn(
                "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                activeTab === 'dashboard' ? "bg-gray-700 text-white shadow-sm" : "text-gray-400 hover:text-gray-200"
              )}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('analyzer')}
              className={cn(
                "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                activeTab === 'analyzer' ? "bg-gray-700 text-white shadow-sm" : "text-gray-400 hover:text-gray-200"
              )}
            >
              JD Analyzer
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={cn(
                "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                activeTab === 'profile' ? "bg-gray-700 text-white shadow-sm" : "text-gray-400 hover:text-gray-200"
              )}
            >
              Profile
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-6 text-sm">
          {activeTab === 'dashboard' && (
            <div className="flex items-center gap-4 text-gray-400 hidden lg:flex">
              <div className="flex flex-col items-end">
                <span className="text-xs font-semibold text-gray-500 uppercase">Total</span>
                <span className="text-white font-mono">{totalApps}</span>
              </div>
              <div className="w-px h-8 bg-gray-800"></div>
              <div className="flex flex-col items-end">
                <span className="text-xs font-semibold text-gray-500 uppercase">Interviews</span>
                <span className="text-purple-400 font-mono">{interviewing}</span>
              </div>
              <div className="w-px h-8 bg-gray-800"></div>
              <div className="flex flex-col items-end">
                <span className="text-xs font-semibold text-gray-500 uppercase">Resp. Rate</span>
                <span className="text-green-400 font-mono">{responseRate}%</span>
              </div>
            </div>
          )}
          
          {activeTab === 'profile' ? (
             <div className="flex items-center gap-2 text-gray-400">
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Build your persona for AI</span>
             </div>
          ) : (
            <button 
              onClick={handleNewApplication}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors shadow-lg shadow-blue-900/20"
            >
              <Plus className="w-4 h-4" />
              Add Application
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden p-6 relative">
        
        {activeTab === 'dashboard' && (
          <div className="flex gap-4 h-full overflow-x-auto pb-4 snap-x">
            {COLUMNS.map(col => (
              <div 
                key={col.id} 
                className="flex-shrink-0 w-80 flex flex-col bg-gray-900/50 rounded-xl border border-gray-800/50"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id)}
              >
                <div className="p-3 border-b border-gray-800 flex items-center justify-between sticky top-0 bg-gray-900/90 backdrop-blur-sm rounded-t-xl z-10">
                   <div className={cn("flex items-center gap-2 font-semibold text-sm", col.color)}>
                     {col.icon}
                     {col.label}
                   </div>
                   <span className="bg-gray-800 text-gray-400 px-2 py-0.5 rounded text-xs font-mono">
                     {applications.filter(a => a.status === col.id).length}
                   </span>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
                  {applications
                    .filter(app => app.status === col.id)
                    .map(app => (
                      <JobCard 
                        key={app.id} 
                        application={app} 
                        onClick={handleEditApplication} 
                        onDragStart={handleDragStart}
                      />
                  ))}
                  {applications.filter(app => app.status === col.id).length === 0 && (
                    <div className="text-center py-10 text-gray-600 text-sm border-2 border-dashed border-gray-800 rounded-lg">
                      Drop here
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'analyzer' && (
          <Analyzer onSave={handleSaveFromAnalyzer} profile={profile} />
        )}

        {activeTab === 'profile' && (
          <ProfileBuilder profile={profile} onSave={handleSaveProfile} />
        )}

      </main>

      {/* Modals */}
      <ApplicationModal 
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setPendingAnalysis(null);
          setEditingApp(undefined);
        }}
        onSave={handleSaveApplication}
        initialData={editingApp}
        analysisData={pendingAnalysis?.data}
        jdText={pendingAnalysis?.jd}
      />

    </div>
  );
}