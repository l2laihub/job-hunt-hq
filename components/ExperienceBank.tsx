import React, { useState, useEffect } from 'react';
import { Experience, UserProfile, STAR, QuestionMatch, JobApplication } from '../types';
import { formatExperience, matchStoriesToQuestion } from '../services/geminiService';
import { 
  Book, Mic, Plus, Loader2, Edit2, Tag, Target, ChevronDown, ChevronUp, 
  Trash2, Wand2, PlayCircle, StopCircle, Search, Layout, HelpCircle
} from 'lucide-react';

interface ExperienceBankProps {
  stories: Experience[];
  onUpdateStories: (stories: Experience[]) => void;
  profile: UserProfile;
  applications: JobApplication[];
}

const COMMON_QUESTIONS = [
  "Tell me about a time you led a project or team.",
  "Describe a challenging technical problem you solved.",
  "Tell me about a time you failed or made a mistake.",
  "Describe a situation where you influenced without authority.",
  "What is your proudest professional achievement?",
  "Tell me about a conflict with a coworker.",
  "Describe a time you had to deliver under tight deadlines.",
  "Tell me about a time you dealt with ambiguity."
];

export const ExperienceBank: React.FC<ExperienceBankProps> = ({ stories, onUpdateStories, profile, applications }) => {
  const [view, setView] = useState<'list' | 'add' | 'matcher'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Add/Edit State
  const [rawInput, setRawInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [generatedDraft, setGeneratedDraft] = useState<Partial<Experience> | null>(null);

  // Matcher State
  const [selectedQuestion, setSelectedQuestion] = useState('');
  const [customQuestion, setCustomQuestion] = useState('');
  const [isMatching, setIsMatching] = useState(false);
  const [matches, setMatches] = useState<QuestionMatch[]>([]);
  const [matchGap, setMatchGap] = useState<string | null>(null);
  const [selectedAppForPrep, setSelectedAppForPrep] = useState('');

  // Voice Input Logic
  const recognitionRef = React.useRef<any>(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      
      recognitionRef.current.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        setRawInput(prev => prev + ' ' + transcript);
      };
    }
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
    }
    setIsRecording(!isRecording);
  };

  const handleFormat = async () => {
    if (!rawInput.trim()) return;
    setIsProcessing(true);
    try {
      const formatted = await formatExperience(rawInput);
      setGeneratedDraft({
        ...formatted,
        rawInput: rawInput,
        inputMethod: 'manual'
      });
    } catch (e) {
      alert("Failed to format story. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = () => {
    if (!generatedDraft) return;
    
    if (editingId) {
      onUpdateStories(stories.map(s => s.id === editingId ? { ...s, ...generatedDraft, updatedAt: new Date().toISOString() } as Experience : s));
    } else {
      const newStory: Experience = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        timesUsed: 0,
        ...generatedDraft as any
      };
      onUpdateStories([newStory, ...stories]);
    }
    resetForm();
    setView('list');
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this story?")) {
      onUpdateStories(stories.filter(s => s.id !== id));
    }
  };

  const resetForm = () => {
    setRawInput('');
    setGeneratedDraft(null);
    setEditingId(null);
    setIsRecording(false);
  };

  const handleMatch = async () => {
    const q = customQuestion || selectedQuestion;
    if (!q) return;
    
    setIsMatching(true);
    setMatches([]);
    setMatchGap(null);
    
    try {
      const result = await matchStoriesToQuestion(q, stories, profile);
      setMatches(result.matches);
      if (result.noGoodMatch) {
        setMatchGap(result.gapSuggestion || "Consider adding a story covering this topic.");
      }
    } catch (e) {
      alert("Matching failed.");
    } finally {
      setIsMatching(false);
    }
  };

  const handleImport = (ach: any) => {
    setRawInput(`${ach.description} ${ach.metrics ? `Metrics: ${ach.metrics}` : ''}`);
    setView('add');
  };

  // Render Helpers
  const renderStar = (star: STAR) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-3">
      <div className="bg-gray-800/50 p-3 rounded border border-gray-700">
        <span className="text-blue-400 font-bold text-xs uppercase block mb-1">Situation</span>
        <p className="text-gray-300">{star.situation}</p>
      </div>
      <div className="bg-gray-800/50 p-3 rounded border border-gray-700">
        <span className="text-purple-400 font-bold text-xs uppercase block mb-1">Task</span>
        <p className="text-gray-300">{star.task}</p>
      </div>
      <div className="bg-gray-800/50 p-3 rounded border border-gray-700 md:col-span-2">
        <span className="text-yellow-400 font-bold text-xs uppercase block mb-1">Action</span>
        <p className="text-gray-300">{star.action}</p>
      </div>
      <div className="bg-gray-800/50 p-3 rounded border border-gray-700 md:col-span-2">
        <span className="text-green-400 font-bold text-xs uppercase block mb-1">Result</span>
        <p className="text-gray-300">{star.result}</p>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full overflow-hidden">
      
      {/* Sidebar Nav */}
      <div className="lg:col-span-3 bg-gray-900 rounded-xl border border-gray-800 flex flex-col h-full">
        <div className="p-4 border-b border-gray-800 bg-gray-850">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <Book className="w-5 h-5 text-blue-400" />
            Experience Bank
          </h2>
        </div>
        <div className="p-2 space-y-1">
          <button 
            onClick={() => setView('list')}
            className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'list' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-gray-200'}`}
          >
            My Stories ({stories.length})
          </button>
          <button 
            onClick={() => setView('matcher')}
            className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${view === 'matcher' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-gray-200'}`}
          >
            <Target className="w-4 h-4" /> Interview Matcher
          </button>
        </div>

        <div className="p-4 mt-auto border-t border-gray-800">
           <button
             onClick={() => { resetForm(); setView('add'); }}
             className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
           >
             <Plus className="w-4 h-4" /> New Story
           </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:col-span-9 h-full overflow-hidden bg-gray-900 rounded-xl border border-gray-800 flex flex-col">
        
        {view === 'list' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
             {stories.length === 0 && (
               <div className="text-center py-10 opacity-60">
                 <Book className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                 <p className="text-gray-400">No stories yet. Add or import one to get started.</p>
                 <div className="mt-6">
                   <h3 className="text-sm font-medium text-gray-500 mb-2">Suggestions from Profile:</h3>
                   <div className="flex flex-col gap-2 max-w-md mx-auto">
                     {profile.keyAchievements.slice(0,3).map((ach, i) => (
                       <button key={i} onClick={() => handleImport(ach)} className="text-left text-xs p-2 bg-gray-800 rounded hover:bg-gray-750 truncate border border-gray-700">
                         {ach.description.substring(0, 60)}...
                       </button>
                     ))}
                   </div>
                 </div>
               </div>
             )}
             
             {stories.map(story => (
               <div key={story.id} className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-4 hover:border-blue-500/30 transition-colors">
                 <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-lg text-white">{story.title}</h3>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {story.tags.map(t => (
                          <span key={t} className="px-2 py-0.5 bg-blue-900/20 text-blue-300 rounded text-[10px] border border-blue-800/50 uppercase tracking-wide">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                       <button onClick={() => { setGeneratedDraft(story); setEditingId(story.id); setView('add'); }} className="p-1.5 hover:bg-gray-700 rounded text-gray-400"><Edit2 className="w-4 h-4" /></button>
                       <button onClick={() => handleDelete(story.id)} className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                    </div>
                 </div>
                 
                 {renderStar(story.star)}

                 {story.metrics.primary && (
                   <div className="mt-3 flex items-center gap-2 text-green-400 text-sm font-medium">
                     <Target className="w-4 h-4" /> {story.metrics.primary}
                   </div>
                 )}
               </div>
             ))}
          </div>
        )}

        {view === 'add' && (
          <div className="flex-1 flex flex-col h-full">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-850">
              <h3 className="font-semibold text-white">{editingId ? 'Edit Story' : 'New Story'}</h3>
              <button onClick={() => setView('list')} className="text-sm text-gray-400 hover:text-white">Cancel</button>
            </div>
            
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 overflow-hidden">
               {/* Input Side */}
               <div className="p-6 border-r border-gray-800 overflow-y-auto">
                  <label className="block text-sm font-medium text-gray-400 mb-2">Raw Experience</label>
                  <p className="text-xs text-gray-500 mb-3">Dump your thoughts, copy a bullet point, or dictate a story. The AI will format it.</p>
                  
                  <div className="relative">
                    <textarea 
                      value={rawInput}
                      onChange={e => setRawInput(e.target.value)}
                      className="w-full h-64 bg-gray-950 border border-gray-800 rounded-lg p-4 text-sm focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                      placeholder="e.g. Led the migration of our legacy auth system to OAuth2. It was chaotic because..."
                    />
                    <button 
                      onClick={toggleRecording}
                      className={`absolute bottom-4 right-4 p-2 rounded-full transition-colors ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                    >
                      {isRecording ? <StopCircle className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </button>
                  </div>

                  <button 
                    onClick={handleFormat}
                    disabled={isProcessing || !rawInput.trim()}
                    className="mt-4 w-full flex items-center justify-center gap-2 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                    Format into STAR
                  </button>
               </div>

               {/* Output/Preview Side */}
               <div className="p-6 overflow-y-auto bg-gray-900/50">
                  {generatedDraft ? (
                    <div className="space-y-4 animate-in slide-in-from-right-4">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-500">Title</label>
                        <input 
                          value={generatedDraft.title} 
                          onChange={e => setGeneratedDraft({...generatedDraft, title: e.target.value})}
                          className="w-full bg-transparent border-b border-gray-700 py-1 font-bold text-lg focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      
                      {generatedDraft.star && renderStar(generatedDraft.star as STAR)}

                      <div className="space-y-2">
                         <label className="text-xs font-medium text-gray-500 block">Tags</label>
                         <div className="flex flex-wrap gap-2">
                           {generatedDraft.tags?.map(t => (
                             <span key={t} className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-300 border border-gray-700">{t}</span>
                           ))}
                         </div>
                      </div>

                      <div className="p-3 bg-blue-900/20 border border-blue-800/30 rounded-lg space-y-2">
                        <h4 className="text-xs font-bold text-blue-400 uppercase">Coaching Notes</h4>
                        <p className="text-sm text-gray-300">{generatedDraft.coachingNotes}</p>
                        {generatedDraft.metrics?.missing && generatedDraft.metrics.missing.length > 0 && (
                          <div className="text-xs text-yellow-400 mt-2">
                            <strong>Missing Metrics:</strong> {generatedDraft.metrics.missing.join(', ')}
                          </div>
                        )}
                      </div>

                      <button onClick={handleSave} className="w-full py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium">
                        Save Story
                      </button>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-60">
                      <Layout className="w-12 h-12 mb-3" />
                      <p>Formatted preview will appear here</p>
                    </div>
                  )}
               </div>
            </div>
          </div>
        )}

        {view === 'matcher' && (
          <div className="flex-1 flex flex-col">
             <div className="p-6 border-b border-gray-800 space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-400 mb-1">Common Questions</label>
                    <select 
                      value={selectedQuestion} 
                      onChange={e => { setSelectedQuestion(e.target.value); setCustomQuestion(''); }}
                      className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-white"
                    >
                      <option value="">Select a question...</option>
                      {COMMON_QUESTIONS.map(q => <option key={q} value={q}>{q}</option>)}
                    </select>
                  </div>
                  <div className="flex-1">
                     <label className="block text-xs font-medium text-gray-400 mb-1">Or Custom Question</label>
                     <input 
                       value={customQuestion}
                       onChange={e => { setCustomQuestion(e.target.value); setSelectedQuestion(''); }}
                       placeholder="e.g. Tell me about a time you missed a deadline"
                       className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-white"
                     />
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <select 
                    value={selectedAppForPrep}
                    onChange={e => setSelectedAppForPrep(e.target.value)}
                    className="bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-gray-400"
                  >
                     <option value="">Specific Application Context (Optional)</option>
                     {applications.map(a => <option key={a.id} value={a.id}>{a.company} - {a.role}</option>)}
                  </select>

                  <button 
                    onClick={handleMatch}
                    disabled={isMatching || (!selectedQuestion && !customQuestion)}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isMatching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    Find Best Stories
                  </button>
                </div>
             </div>

             <div className="flex-1 overflow-y-auto p-6 bg-gray-900/50">
                {matches.length > 0 && (
                  <div className="space-y-6">
                    {matches.map((match, i) => (
                      <div key={i} className="bg-gray-800 border border-gray-700 rounded-xl p-5 shadow-lg">
                        <div className="flex justify-between items-start mb-3">
                           <div>
                             <span className="text-xs font-bold text-gray-500 uppercase">Best Match #{i+1}</span>
                             <h3 className="text-lg font-bold text-white">{match.storyTitle}</h3>
                           </div>
                           <div className={`px-3 py-1 rounded font-bold text-sm ${match.fitScore >= 8 ? 'bg-green-900/40 text-green-400' : 'bg-yellow-900/40 text-yellow-400'}`}>
                             {match.fitScore}/10 Match
                           </div>
                        </div>
                        
                        <div className="space-y-3">
                           <div className="p-3 bg-gray-900/50 rounded border border-gray-700/50">
                             <p className="text-sm text-gray-300 italic">"{match.reasoning}"</p>
                           </div>
                           
                           <div>
                             <span className="text-xs font-bold text-blue-400 uppercase">Suggested Angle</span>
                             <p className="text-sm text-gray-200 mt-1">{match.suggestedAngle}</p>
                           </div>

                           <div>
                             <span className="text-xs font-bold text-purple-400 uppercase">Opening Line</span>
                             <p className="text-sm text-gray-200 mt-1 font-medium">"{match.openingLine}"</p>
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {matchGap && (
                  <div className="p-6 bg-yellow-900/10 border border-yellow-800/50 rounded-xl text-center">
                    <HelpCircle className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
                    <h4 className="text-yellow-400 font-bold mb-1">Gap Detected</h4>
                    <p className="text-yellow-200/70 text-sm mb-4">{matchGap}</p>
                    <button onClick={() => { setView('add'); setRawInput(matchGap); }} className="px-4 py-2 bg-yellow-700/50 hover:bg-yellow-700 text-yellow-100 rounded text-sm">
                      Draft this story
                    </button>
                  </div>
                )}
                
                {!isMatching && matches.length === 0 && !matchGap && (
                   <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-60">
                      <Target className="w-16 h-16 mb-4" />
                      <p>Select a question to find your best stories</p>
                   </div>
                )}
             </div>
          </div>
        )}

      </div>
    </div>
  );
};