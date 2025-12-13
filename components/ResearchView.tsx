
import React, { useState, useEffect } from 'react';
import { CompanyResearch, JobApplication } from '../types';
import { researchCompany } from '../services/geminiService';
import { 
  Search, Loader2, Globe, Building2, MapPin, Users, Calendar, 
  TrendingUp, AlertOctagon, ThumbsUp, Link, ExternalLink, UserCircle 
} from 'lucide-react';

interface ResearchViewProps {
  initialCompany?: string;
  applications: JobApplication[];
  onSaveResearch: (research: CompanyResearch, appId?: string) => void;
}

export const ResearchView: React.FC<ResearchViewProps> = ({ initialCompany, applications, onSaveResearch }) => {
  const [companyName, setCompanyName] = useState(initialCompany || '');
  const [roleTitle, setRoleTitle] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [research, setResearch] = useState<CompanyResearch | null>(null);
  const [selectedAppId, setSelectedAppId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialCompany) setCompanyName(initialCompany);
  }, [initialCompany]);

  const handleResearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!companyName.trim()) return;

    setIsSearching(true);
    setError(null);
    setResearch(null);

    try {
      const data = await researchCompany(companyName, roleTitle);
      setResearch(data);
      // Auto-select app if name matches fuzzy
      const match = applications.find(a => a.company.toLowerCase().includes(companyName.toLowerCase()) || companyName.toLowerCase().includes(a.company.toLowerCase()));
      if (match) setSelectedAppId(match.id);
    } catch (err) {
      setError("Research failed. Ensure you have access to Gemini models with Search grounding.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSave = () => {
    if (research) {
      onSaveResearch(research, selectedAppId || undefined);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full overflow-hidden">
      {/* Search Sidebar */}
      <div className="lg:col-span-3 bg-gray-900 rounded-xl border border-gray-800 flex flex-col h-full">
        <div className="p-4 border-b border-gray-800 bg-gray-850">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-400" />
            Research
          </h2>
        </div>
        
        <div className="p-4 space-y-4">
          <form onSubmit={handleResearch} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-400">Company Name</label>
              <input 
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="e.g. Acme Corp"
                className="w-full mt-1 bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-white focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-400">Target Role (Optional)</label>
              <input 
                value={roleTitle}
                onChange={e => setRoleTitle(e.target.value)}
                placeholder="e.g. Senior Engineer"
                className="w-full mt-1 bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-white focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching || !companyName.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors text-white"
            >
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Start Research
            </button>
          </form>

          {research && (
            <div className="mt-6 pt-6 border-t border-gray-800 space-y-3 animate-in fade-in slide-in-from-bottom-2">
              <label className="text-xs font-medium text-gray-400 block">Link to Application</label>
              <select 
                value={selectedAppId}
                onChange={e => setSelectedAppId(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-white outline-none"
              >
                <option value="">-- Don't link --</option>
                {applications.map(app => (
                  <option key={app.id} value={app.id}>{app.company} - {app.role}</option>
                ))}
              </select>
              <button
                onClick={handleSave}
                className="w-full px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Save Research
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Results Area */}
      <div className="lg:col-span-9 h-full overflow-hidden flex flex-col bg-gray-900 rounded-xl border border-gray-800">
        {!research && !isSearching && !error && (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 opacity-60">
            <Globe className="w-16 h-16 mb-4" />
            <p>Enter a company name to gather intelligence</p>
          </div>
        )}

        {isSearching && (
          <div className="flex-1 flex flex-col items-center justify-center text-blue-400">
            <Loader2 className="w-12 h-12 animate-spin mb-4" />
            <p className="animate-pulse">Scouring the web for intel...</p>
            <p className="text-xs text-gray-500 mt-2">Checking news, blogs, and public records</p>
          </div>
        )}

        {error && (
          <div className="p-8 text-center text-red-400">
            <AlertOctagon className="w-12 h-12 mx-auto mb-4" />
            <p>{error}</p>
          </div>
        )}

        {research && !isSearching && (
          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin space-y-6">
            
            {/* Header / Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-4">
                <div>
                  <h1 className="text-2xl font-bold text-white mb-2">{research.companyName}</h1>
                  <p className="text-gray-300 text-sm leading-relaxed">{research.overview.description}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Badge icon={<Building2 className="w-3 h-3"/>} label={research.overview.industry} />
                  <Badge icon={<Users className="w-3 h-3"/>} label={research.overview.size} />
                  <Badge icon={<MapPin className="w-3 h-3"/>} label={research.overview.headquarters} />
                  <Badge icon={<Calendar className="w-3 h-3"/>} label={`Founded ${research.overview.founded}`} />
                </div>
              </div>
              <div className={`p-4 rounded-xl border ${
                research.verdict.overall === 'green' ? 'bg-green-900/20 border-green-500/30' : 
                research.verdict.overall === 'yellow' ? 'bg-yellow-900/20 border-yellow-500/30' : 
                'bg-red-900/20 border-red-500/30'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-bold uppercase tracking-wider opacity-70">Verdict</span>
                  <div className={`w-3 h-3 rounded-full ${
                     research.verdict.overall === 'green' ? 'bg-green-400' : 
                     research.verdict.overall === 'yellow' ? 'bg-yellow-400' : 'bg-red-400'
                  }`}></div>
                </div>
                <p className="text-sm font-medium mb-3">{research.verdict.summary}</p>
                {research.verdict.topPositive && (
                  <div className="flex gap-2 text-xs text-green-300 mb-1">
                    <ThumbsUp className="w-3 h-3 mt-0.5" /> {research.verdict.topPositive}
                  </div>
                )}
                {research.verdict.topConcern && (
                  <div className="flex gap-2 text-xs text-red-300">
                    <AlertOctagon className="w-3 h-3 mt-0.5" /> {research.verdict.topConcern}
                  </div>
                )}
              </div>
            </div>

            {/* News */}
            <Section title="Recent News (30 Days)" icon={<Globe className="w-4 h-4"/>}>
              <div className="grid gap-3">
                {research.recentNews.length === 0 ? <span className="text-gray-500 text-sm italic">No major news found recently.</span> : 
                 research.recentNews.map((news, i) => (
                  <div key={i} className="p-3 bg-gray-800/30 border border-gray-700/50 rounded-lg">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-medium text-blue-300 text-sm">{news.headline}</h4>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        news.sentiment === 'positive' ? 'bg-green-900/30 text-green-400' :
                        news.sentiment === 'negative' ? 'bg-red-900/30 text-red-400' : 'bg-gray-700 text-gray-300'
                      }`}>{news.sentiment}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                      <span>{news.source}</span>
                      <span>•</span>
                      <span>{news.date}</span>
                    </div>
                    <p className="text-xs text-gray-300">{news.summary}</p>
                  </div>
                ))}
              </div>
            </Section>

            {/* Engineering Culture */}
            <Section title="Engineering Culture" icon={<Users className="w-4 h-4"/>}>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <div className="text-sm">
                      <span className="text-gray-500 text-xs block">Tech Stack</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {research.engineeringCulture.knownStack.map(t => (
                          <span key={t} className="px-2 py-0.5 bg-gray-800 rounded text-xs text-gray-300 border border-gray-700">{t}</span>
                        ))}
                      </div>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-500 text-xs block">Remote Policy</span>
                      <span className="text-gray-200 capitalize">{research.engineeringCulture.remotePolicy}</span>
                    </div>
                 </div>
                 <div className="space-y-2">
                    {research.engineeringCulture.techBlog && (
                      <a href={research.engineeringCulture.techBlog} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-blue-400 text-sm hover:underline">
                        <ExternalLink className="w-3 h-3" /> Tech Blog
                      </a>
                    )}
                    <p className="text-sm text-gray-400 italic">{research.engineeringCulture.notes}</p>
                 </div>
              </div>
            </Section>

            {/* Flags */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Section title="Red Flags" icon={<AlertOctagon className="w-4 h-4 text-red-400"/>}>
                 {research.redFlags.length === 0 ? <span className="text-gray-500 text-sm italic">No major red flags detected.</span> : 
                  research.redFlags.map((flag, i) => (
                   <div key={i} className="mb-2 last:mb-0 p-2 rounded bg-red-900/10 border border-red-900/30">
                     <div className="flex items-center justify-between">
                        <span className="font-medium text-red-300 text-sm">{flag.flag}</span>
                        {flag.severity && <span className="text-[10px] uppercase text-red-500 font-bold">{flag.severity}</span>}
                     </div>
                     <p className="text-xs text-red-200/70 mt-1">{flag.detail}</p>
                   </div>
                 ))}
              </Section>
              <Section title="Green Flags" icon={<TrendingUp className="w-4 h-4 text-green-400"/>}>
                 {research.greenFlags.length === 0 ? <span className="text-gray-500 text-sm italic">No specific green flags noted.</span> :
                  research.greenFlags.map((flag, i) => (
                   <div key={i} className="mb-2 last:mb-0 p-2 rounded bg-green-900/10 border border-green-900/30">
                     <span className="font-medium text-green-300 text-sm block">{flag.flag}</span>
                     <p className="text-xs text-green-200/70 mt-1">{flag.detail}</p>
                   </div>
                 ))}
              </Section>
            </div>

            {/* People */}
            <Section title="Key People" icon={<UserCircle className="w-4 h-4"/>}>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                 {research.keyPeople.map((person, i) => (
                   <div key={i} className="flex items-start gap-3 p-2 bg-gray-800/30 rounded border border-gray-700/50">
                     <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-gray-400 shrink-0">
                       <UserCircle className="w-5 h-5" />
                     </div>
                     <div>
                       <div className="font-medium text-sm text-white">{person.name}</div>
                       <div className="text-xs text-blue-400">{person.role}</div>
                       {person.notes && <div className="text-[10px] text-gray-500 mt-1">{person.notes}</div>}
                     </div>
                   </div>
                 ))}
               </div>
            </Section>

            {/* Sources */}
            {research.sourcesUsed && research.sourcesUsed.length > 0 && (
              <div className="pt-4 border-t border-gray-800">
                <span className="text-xs font-medium text-gray-500 block mb-2">Sources Used</span>
                <div className="flex flex-wrap gap-2">
                  {research.sourcesUsed.map((source, i) => (
                    <a key={i} href={source} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] bg-gray-800 px-2 py-1 rounded text-gray-400 hover:text-white truncate max-w-[200px]">
                      <Link className="w-2 h-2 shrink-0" />
                      <span className="truncate">{new URL(source).hostname}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
};

const Section: React.FC<{title: string, icon: React.ReactNode, children: React.ReactNode}> = ({ title, icon, children }) => (
  <div className="bg-gray-900/50 rounded-lg border border-gray-800 overflow-hidden">
    <div className="bg-gray-850 px-4 py-2 border-b border-gray-800 flex items-center gap-2">
      <span className="text-gray-400">{icon}</span>
      <h3 className="text-sm font-semibold text-gray-200">{title}</h3>
    </div>
    <div className="p-4">
      {children}
    </div>
  </div>
);

const Badge: React.FC<{icon: React.ReactNode, label: string}> = ({ icon, label }) => (
  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-800 border border-gray-700 text-xs text-gray-300">
    {icon} {label}
  </span>
);
