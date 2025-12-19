import React, { useState } from 'react';
import { UserProfile } from '../types';
import { processDocuments } from '../services/geminiService';
import { Upload, FileText, Loader2, Save, X, Plus, Trash2 } from 'lucide-react';

interface ProfileBuilderProps {
  profile: UserProfile;
  onSave: (profile: UserProfile) => void;
}

export const ProfileBuilder: React.FC<ProfileBuilderProps> = ({ profile, onSave }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [localProfile, setLocalProfile] = useState<UserProfile>(profile);
  const [activeSection, setActiveSection] = useState<string>('basic');

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files).filter(f => 
      ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/markdown'].includes(f.type) || f.name.endsWith('.md')
    );
    setFiles(prev => [...prev, ...droppedFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleBuildProfile = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    try {
      const generated = await processDocuments(files);
      setLocalProfile(prev => ({
        ...prev,
        ...generated,
        // Preserve some manual prefs if needed, but for now overwrite with generated for "Building"
      }));
    } catch (e) {
      alert("Failed to process documents. Please check API Key or file format.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = () => {
    onSave(localProfile);
  };

  // Helper for array inputs
  const ArrayInput = ({ 
    values, 
    onChange, 
    placeholder 
  }: { 
    values: string[], 
    onChange: (v: string[]) => void, 
    placeholder: string 
  }) => (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {(values || []).map((val, idx) => (
          <span key={idx} className="bg-gray-800 border border-gray-700 rounded-full px-3 py-1 text-sm flex items-center gap-1 group">
            {val}
            <button 
              onClick={() => onChange(values.filter((_, i) => i !== idx))}
              className="hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              const val = e.currentTarget.value.trim();
              if (val) {
                onChange([...(values || []), val]);
                e.currentTarget.value = '';
              }
            }
          }}
          className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none"
        />
        <button className="p-2 bg-gray-800 rounded border border-gray-700 hover:bg-gray-700">
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full overflow-hidden">
      {/* Sidebar / Upload Zone */}
      <div className="lg:col-span-4 bg-gray-900 rounded-xl border border-gray-800 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-800 bg-gray-850">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-400" />
            Source Documents
          </h2>
        </div>
        
        <div className="p-4 space-y-4 flex-1 overflow-y-auto">
          <div 
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            className="border-2 border-dashed border-gray-700 hover:border-blue-500/50 rounded-xl p-8 text-center transition-colors bg-gray-900/50"
          >
            <div className="flex justify-center mb-3">
              <div className="p-3 bg-gray-800 rounded-full">
                <FileText className="w-6 h-6 text-gray-400" />
              </div>
            </div>
            <p className="text-sm text-gray-300 font-medium">Drag & drop your files</p>
            <p className="text-xs text-gray-500 mt-1">Resume, About Me, Portfolio (PDF, TXT, MD)</p>
            <input 
               type="file" 
               multiple 
               onChange={(e) => e.target.files && setFiles(prev => [...prev, ...Array.from(e.target.files!)])}
               className="hidden" 
               id="file-upload"
            />
            <label htmlFor="file-upload" className="mt-3 inline-block px-4 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-xs cursor-pointer border border-gray-700 transition-colors">
              Browse Files
            </label>
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
              {files.map((f, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                    <span className="text-xs truncate text-gray-300">{f.name}</span>
                  </div>
                  <button onClick={() => removeFile(i)} className="text-gray-500 hover:text-red-400">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-800 bg-gray-850">
          <button
            onClick={handleBuildProfile}
            disabled={files.length === 0 || isProcessing}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors text-white"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {isProcessing ? 'Analyzing Docs...' : 'Build Profile from Docs'}
          </button>
        </div>
      </div>

      {/* Editor Area */}
      <div className="lg:col-span-8 bg-gray-900 rounded-xl border border-gray-800 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-800 bg-gray-850 flex justify-between items-center">
          <h2 className="font-semibold text-white">Your Profile</h2>
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-1.5 bg-green-600 hover:bg-green-500 rounded-lg text-xs font-medium text-white transition-colors"
          >
            <Save className="w-3 h-3" />
            Save Changes
          </button>
        </div>

        <div className="flex border-b border-gray-800 overflow-x-auto">
          {['basic', 'experience', 'projects', 'preferences'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveSection(tab)}
              className={`px-4 py-3 text-xs font-medium capitalize whitespace-nowrap border-b-2 transition-colors ${
                activeSection === tab 
                  ? 'border-blue-500 text-white bg-gray-800/50' 
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeSection === 'basic' && (
            <div className="space-y-6">
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                   <label className="text-xs font-medium text-gray-400">Full Name</label>
                   <input
                     value={localProfile.name}
                     onChange={e => setLocalProfile({...localProfile, name: e.target.value})}
                     className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-white"
                   />
                 </div>
                 <div className="space-y-1">
                   <label className="text-xs font-medium text-gray-400">Professional Headline</label>
                   <input
                     value={localProfile.headline}
                     onChange={e => setLocalProfile({...localProfile, headline: e.target.value})}
                     className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-white"
                   />
                 </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                   <label className="text-xs font-medium text-gray-400">Email</label>
                   <input
                     type="email"
                     value={localProfile.email || ''}
                     onChange={e => setLocalProfile({...localProfile, email: e.target.value})}
                     placeholder="your@email.com"
                     className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-white placeholder:text-gray-600"
                   />
                 </div>
                 <div className="space-y-1">
                   <label className="text-xs font-medium text-gray-400">Phone</label>
                   <input
                     type="tel"
                     value={localProfile.phone || ''}
                     onChange={e => setLocalProfile({...localProfile, phone: e.target.value})}
                     placeholder="+1 (555) 123-4567"
                     className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-white placeholder:text-gray-600"
                   />
                 </div>
               </div>
               
               <div className="space-y-1">
                 <label className="text-xs font-medium text-gray-400">Current Situation / About</label>
                 <textarea 
                   rows={3}
                   value={localProfile.currentSituation}
                   onChange={e => setLocalProfile({...localProfile, currentSituation: e.target.value})}
                   className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-white resize-none"
                 />
               </div>

               <div>
                 <label className="text-xs font-medium text-gray-400 mb-2 block">Technical Skills</label>
                 <ArrayInput 
                   values={localProfile.technicalSkills || []} 
                   onChange={v => setLocalProfile({...localProfile, technicalSkills: v})}
                   placeholder="Add skill (e.g. React, Python)"
                 />
               </div>
            </div>
          )}

          {activeSection === 'experience' && (
             <div className="space-y-6">
               {localProfile.recentRoles.map((role, i) => (
                 <div key={i} className="p-4 bg-gray-950 rounded-lg border border-gray-800 relative group">
                   <button 
                      onClick={() => {
                        const newRoles = [...localProfile.recentRoles];
                        newRoles.splice(i, 1);
                        setLocalProfile({...localProfile, recentRoles: newRoles});
                      }}
                      className="absolute top-2 right-2 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100"
                   >
                     <Trash2 className="w-4 h-4" />
                   </button>
                   <div className="flex justify-between mb-2">
                     <h3 className="font-semibold text-white">{role.title}</h3>
                     <span className="text-xs text-gray-400">{role.duration}</span>
                   </div>
                   <div className="text-sm text-blue-400 mb-2">{role.company}</div>
                   <ul className="list-disc list-inside text-xs text-gray-400 space-y-1">
                     {role.highlights.map((h, idx) => <li key={idx}>{h}</li>)}
                   </ul>
                 </div>
               ))}
               {localProfile.recentRoles.length === 0 && (
                 <div className="text-center p-4 border-2 border-dashed border-gray-800 rounded-lg text-gray-500 text-sm">
                   Build from resume to populate
                 </div>
               )}
             </div>
          )}

          {activeSection === 'projects' && (
             <div className="space-y-4">
                {localProfile.activeProjects.map((proj, i) => (
                  <div key={i} className="p-4 bg-gray-950 rounded-lg border border-gray-800">
                     <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-bold text-white">{proj.name}</h4>
                          <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded border ${
                            proj.status === 'active' ? 'border-green-800 text-green-400 bg-green-900/20' : 'border-gray-700 text-gray-400'
                          }`}>
                            {proj.status}
                          </span>
                        </div>
                        {proj.traction && <span className="text-xs font-mono text-purple-400">{proj.traction}</span>}
                     </div>
                     <p className="text-sm text-gray-400 mb-2">{proj.description}</p>
                     <div className="flex flex-wrap gap-1">
                       {proj.techStack.map(t => <span key={t} className="text-[10px] px-1.5 bg-gray-800 rounded text-gray-400">{t}</span>)}
                     </div>
                  </div>
                ))}
             </div>
          )}

          {activeSection === 'preferences' && (
            <div className="space-y-6">
               <div className="p-4 bg-gray-950 rounded-lg border border-gray-800">
                 <h3 className="text-sm font-bold text-white mb-4">Job Preferences</h3>
                 <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="space-y-1">
                      <label className="text-xs text-gray-500">Min Salary</label>
                      <input 
                        type="number"
                        value={localProfile.preferences.salaryRange.min}
                        onChange={e => setLocalProfile({
                          ...localProfile, 
                          preferences: {...localProfile.preferences, salaryRange: {...localProfile.preferences.salaryRange, min: parseInt(e.target.value)}}
                        })}
                        className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-gray-500">Work Style</label>
                       <select 
                         value={localProfile.preferences.workStyle}
                         onChange={e => setLocalProfile({
                           ...localProfile,
                           preferences: {...localProfile.preferences, workStyle: e.target.value as any}
                         })}
                         className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white"
                       >
                         <option value="remote">Remote</option>
                         <option value="hybrid">Hybrid</option>
                         <option value="onsite">On-site</option>
                       </select>
                    </div>
                 </div>
                 <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-400">Target Roles</label>
                    <ArrayInput 
                      values={localProfile.preferences.targetRoles || []}
                      onChange={v => setLocalProfile({...localProfile, preferences: {...localProfile.preferences, targetRoles: v}})}
                      placeholder="e.g. Senior Backend Engineer"
                    />
                 </div>
               </div>

               <div className="p-4 bg-gray-950 rounded-lg border border-gray-800">
                 <h3 className="text-sm font-bold text-white mb-4">Freelance Profile</h3>
                 <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="space-y-1">
                      <label className="text-xs text-gray-500">Hourly Rate ($)</label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="number"
                          value={localProfile.freelanceProfile.hourlyRate.min}
                          onChange={e => setLocalProfile({
                            ...localProfile,
                            freelanceProfile: {...localProfile.freelanceProfile, hourlyRate: {...localProfile.freelanceProfile.hourlyRate, min: parseInt(e.target.value)}}
                          })}
                          className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white"
                        />
                        <span className="text-gray-500">-</span>
                        <input 
                          type="number"
                          value={localProfile.freelanceProfile.hourlyRate.max}
                          onChange={e => setLocalProfile({
                            ...localProfile,
                            freelanceProfile: {...localProfile.freelanceProfile, hourlyRate: {...localProfile.freelanceProfile.hourlyRate, max: parseInt(e.target.value)}}
                          })}
                          className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-gray-500">Availability</label>
                      <input 
                         type="text"
                         value={localProfile.freelanceProfile.availableHours}
                         onChange={e => setLocalProfile({
                           ...localProfile,
                           freelanceProfile: {...localProfile.freelanceProfile, availableHours: e.target.value}
                         })}
                         className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white"
                       />
                    </div>
                 </div>
                 <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-400">Unique Selling Points</label>
                    <ArrayInput 
                      values={localProfile.freelanceProfile.uniqueSellingPoints || []}
                      onChange={v => setLocalProfile({...localProfile, freelanceProfile: {...localProfile.freelanceProfile, uniqueSellingPoints: v}})}
                      placeholder="e.g. 5y Enterprise SaaS experience"
                    />
                 </div>
               </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};