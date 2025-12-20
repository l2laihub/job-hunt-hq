import React, { useState, useEffect, useRef } from 'react';
import type {
  TechnicalAnswer,
  TechnicalQuestionType,
  AnswerSection,
  FollowUpQA,
  UserProfile,
  Experience,
  JobApplication
} from '../src/types';
import { useTechnicalAnswersStore } from '../src/stores';
import { generateTechnicalAnswer, generateFollowUps } from '../src/services/gemini';
import { COMMON_TECHNICAL_QUESTIONS, DIFFICULTY_LEVELS, TECHNICAL_QUESTION_TYPES } from '../src/lib/constants';
import { formatTime, stripMarkdown } from '../src/lib/utils';
import {
  Zap, Loader2, Plus, Edit2, Trash2, Copy, Save, ChevronDown, ChevronUp,
  Mic, StopCircle, Play, Pause, RotateCcw, Search, Filter, Clock, Target,
  MessageSquare, BookOpen, CheckCircle, AlertCircle, Sparkles, List, FileText
} from 'lucide-react';
import { MarkdownRenderer } from '../src/components/ui/markdown-renderer';

interface TechnicalAnswerGeneratorProps {
  profile: UserProfile;
  stories: Experience[];
  applications: JobApplication[];
}

type ViewType = 'list' | 'generate' | 'result' | 'practice';

const QUESTION_TYPE_COLORS: Record<TechnicalQuestionType, { bg: string; text: string; border: string }> = {
  'behavioral-technical': { bg: 'bg-purple-900/30', text: 'text-purple-400', border: 'border-purple-700/50' },
  'conceptual': { bg: 'bg-blue-900/30', text: 'text-blue-400', border: 'border-blue-700/50' },
  'system-design': { bg: 'bg-green-900/30', text: 'text-green-400', border: 'border-green-700/50' },
  'problem-solving': { bg: 'bg-yellow-900/30', text: 'text-yellow-400', border: 'border-yellow-700/50' },
  'experience': { bg: 'bg-pink-900/30', text: 'text-pink-400', border: 'border-pink-700/50' },
};

const LIKELIHOOD_COLORS: Record<string, string> = {
  high: 'bg-red-900/40 text-red-400 border-red-700/50',
  medium: 'bg-yellow-900/40 text-yellow-400 border-yellow-700/50',
  low: 'bg-gray-800 text-gray-400 border-gray-700',
};

export const TechnicalAnswerGenerator: React.FC<TechnicalAnswerGeneratorProps> = ({
  profile,
  stories,
  applications,
}) => {
  const [view, setView] = useState<ViewType>('list');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Store
  const { answers, addAnswer, updateAnswer, deleteAnswer, searchAnswers, recordPractice } = useTechnicalAnswersStore();

  // Generator State
  const [questionInput, setQuestionInput] = useState('');
  const [selectedQuestion, setSelectedQuestion] = useState('');
  const [difficulty, setDifficulty] = useState<'junior' | 'mid' | 'senior' | 'staff'>('mid');
  const [selectedAppId, setSelectedAppId] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingFollowUps, setIsGeneratingFollowUps] = useState(false);

  // Result State
  const [generatedResult, setGeneratedResult] = useState<{
    questionType: TechnicalQuestionType;
    format: { type: string; sections: AnswerSection[] };
    answer: { structured: AnswerSection[]; narrative: string; bulletPoints: string[] };
    sources: { storyIds: string[]; profileSections: string[]; synthesized: boolean };
    suggestedTags: string[];
    followUps: FollowUpQA[];
  } | null>(null);
  const [answerView, setAnswerView] = useState<'structured' | 'narrative' | 'bullets'>('structured');
  const [expandedFollowUps, setExpandedFollowUps] = useState<Set<number>>(new Set());

  // List State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<TechnicalQuestionType | ''>('');

  // Practice State
  const [practiceAnswerId, setPracticeAnswerId] = useState<string | null>(null);
  const [isPracticing, setIsPracticing] = useState(false);
  const [practiceTime, setPracticeTime] = useState(0);
  const [showAnswerDuringPractice, setShowAnswerDuringPractice] = useState(false);
  const practiceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Voice Recording
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Initialize speech recognition
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
        setQuestionInput((prev) => prev + ' ' + transcript);
      };
    }
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (practiceTimerRef.current) clearInterval(practiceTimerRef.current);
    };
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
    }
    setIsRecording(!isRecording);
  };

  const handleGenerate = async () => {
    const question = questionInput.trim() || selectedQuestion;
    if (!question) return;

    setIsGenerating(true);
    setGeneratedResult(null);

    try {
      const appContext = selectedAppId ? applications.find((a) => a.id === selectedAppId) : undefined;

      const result = await generateTechnicalAnswer({
        question,
        profile,
        stories,
        applicationContext: appContext,
        difficulty,
      });

      // Generate follow-ups
      setIsGeneratingFollowUps(true);
      let followUps: FollowUpQA[] = [];
      try {
        followUps = await generateFollowUps(question, result.answer.narrative, profile, result.questionType);
      } catch (e) {
        console.error('Failed to generate follow-ups:', e);
      }
      setIsGeneratingFollowUps(false);

      setGeneratedResult({
        ...result,
        followUps,
      });
      setView('result');
    } catch (e) {
      alert('Failed to generate answer. Please try again.');
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    if (!generatedResult) return;

    const question = questionInput.trim() || selectedQuestion;
    const appContext = selectedAppId ? applications.find((a) => a.id === selectedAppId) : undefined;

    if (editingId) {
      updateAnswer(editingId, {
        question,
        questionType: generatedResult.questionType,
        format: {
          type: generatedResult.format.type as any,
          sections: generatedResult.format.sections,
        },
        sources: generatedResult.sources,
        answer: generatedResult.answer,
        followUps: generatedResult.followUps,
        metadata: {
          difficulty,
          tags: generatedResult.suggestedTags,
          targetRole: appContext?.role,
          targetCompany: appContext?.company,
          applicationId: selectedAppId || undefined,
        },
      });
    } else {
      addAnswer({
        question,
        questionType: generatedResult.questionType,
        format: {
          type: generatedResult.format.type as any,
          sections: generatedResult.format.sections,
        },
        sources: generatedResult.sources,
        answer: generatedResult.answer,
        followUps: generatedResult.followUps,
        metadata: {
          difficulty,
          tags: generatedResult.suggestedTags,
          targetRole: appContext?.role,
          targetCompany: appContext?.company,
          applicationId: selectedAppId || undefined,
        },
      });
    }

    resetForm();
    setView('list');
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this answer?')) {
      deleteAnswer(id);
    }
  };

  const resetForm = () => {
    setQuestionInput('');
    setSelectedQuestion('');
    setDifficulty('mid');
    setSelectedAppId('');
    setGeneratedResult(null);
    setEditingId(null);
    setIsRecording(false);
    setExpandedFollowUps(new Set());
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const startPractice = (answerId: string) => {
    setPracticeAnswerId(answerId);
    setPracticeTime(0);
    setIsPracticing(false);
    setShowAnswerDuringPractice(false);
    setView('practice');
  };

  const togglePractice = () => {
    if (isPracticing) {
      // Stop
      if (practiceTimerRef.current) clearInterval(practiceTimerRef.current);
      setIsPracticing(false);
    } else {
      // Start
      setIsPracticing(true);
      practiceTimerRef.current = setInterval(() => {
        setPracticeTime((t) => t + 1);
      }, 1000);
    }
  };

  const finishPractice = () => {
    if (practiceTimerRef.current) clearInterval(practiceTimerRef.current);
    setIsPracticing(false);

    if (practiceAnswerId) {
      recordPractice(practiceAnswerId, { durationSeconds: practiceTime });
    }

    setView('list');
    setPracticeAnswerId(null);
    setPracticeTime(0);
  };

  const toggleFollowUp = (index: number) => {
    setExpandedFollowUps((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // Filter answers
  const filteredAnswers = React.useMemo(() => {
    let result = answers;
    if (searchQuery) {
      result = searchAnswers(searchQuery);
    }
    if (filterType) {
      result = result.filter((a) => a.questionType === filterType);
    }
    return result;
  }, [answers, searchQuery, filterType, searchAnswers]);

  const practiceAnswer = practiceAnswerId ? answers.find((a) => a.id === practiceAnswerId) : null;

  // Render helpers
  const renderSectionContent = (sections: AnswerSection[]) => (
    <div className="space-y-4">
      {sections.map((section, i) => (
        <div key={i} className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
          <span className="text-xs font-bold text-blue-400 uppercase block mb-2">{section.label}</span>
          <MarkdownRenderer content={section.content} variant="compact" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full overflow-hidden">
      {/* Sidebar */}
      <div className="lg:col-span-3 bg-gray-900 rounded-xl border border-gray-800 flex flex-col h-full">
        <div className="p-4 border-b border-gray-800 bg-gray-850">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            Answer Generator
          </h2>
        </div>
        <div className="p-2 space-y-1">
          <button
            onClick={() => setView('list')}
            className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === 'list' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            My Answers ({answers.length})
          </button>
          <button
            onClick={() => {
              resetForm();
              setView('generate');
            }}
            className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              view === 'generate' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Sparkles className="w-4 h-4" /> Generator
          </button>
        </div>

        <div className="p-4 mt-auto border-t border-gray-800">
          <button
            onClick={() => {
              resetForm();
              setView('generate');
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> New Answer
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:col-span-9 h-full overflow-hidden bg-gray-900 rounded-xl border border-gray-800 flex flex-col">
        {/* LIST VIEW */}
        {view === 'list' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-800 flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search answers..."
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white"
                />
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as TechnicalQuestionType | '')}
                className="bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-400"
              >
                <option value="">All Types</option>
                {TECHNICAL_QUESTION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {filteredAnswers.length === 0 && (
                <div className="text-center py-10 opacity-60">
                  <Zap className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                  <p className="text-gray-400">No answers yet. Generate one to get started!</p>
                </div>
              )}

              {filteredAnswers.map((answer) => {
                const colors = QUESTION_TYPE_COLORS[answer.questionType];
                return (
                  <div
                    key={answer.id}
                    className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-4 hover:border-yellow-500/30 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${colors.bg} ${colors.text} border ${colors.border}`}
                          >
                            {answer.questionType.replace('-', ' ')}
                          </span>
                          <span className="text-xs text-gray-500">{answer.format.type}</span>
                        </div>
                        <h3 className="font-semibold text-white text-sm">{answer.question}</h3>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => startPractice(answer.id)}
                          className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-green-400"
                          title="Practice"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => copyToClipboard(answer.answer.narrative)}
                          className="p-1.5 hover:bg-gray-700 rounded text-gray-400"
                          title="Copy"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(answer.id)}
                          className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-red-400"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <p className="text-gray-400 text-xs line-clamp-2 mb-3">{stripMarkdown(answer.answer.narrative).slice(0, 150)}...</p>

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        {answer.followUps.length} follow-ups
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Practiced {answer.practiceCount}x
                      </span>
                      {answer.metadata.targetCompany && (
                        <span className="text-blue-400">{answer.metadata.targetCompany}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* GENERATE VIEW */}
        {view === 'generate' && (
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-850">
              <h3 className="font-semibold text-white">Generate Technical Answer</h3>
              <button onClick={() => setView('list')} className="text-sm text-gray-400 hover:text-white">
                Cancel
              </button>
            </div>

            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              {/* Question Input */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Interview Question</label>
                <div className="relative">
                  <textarea
                    value={questionInput}
                    onChange={(e) => {
                      setQuestionInput(e.target.value);
                      setSelectedQuestion('');
                    }}
                    className="w-full h-24 bg-gray-950 border border-gray-800 rounded-lg p-4 text-sm focus:ring-1 focus:ring-yellow-500 outline-none resize-none"
                    placeholder="Type your technical question or use voice input..."
                  />
                  <button
                    onClick={toggleRecording}
                    className={`absolute bottom-3 right-3 p-2 rounded-full transition-colors ${
                      isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {isRecording ? <StopCircle className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Common Questions */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Or Select Common Question</label>
                <select
                  value={selectedQuestion}
                  onChange={(e) => {
                    setSelectedQuestion(e.target.value);
                    setQuestionInput('');
                  }}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-sm text-white"
                >
                  <option value="">Select a question...</option>
                  {COMMON_TECHNICAL_QUESTIONS.map((q) => (
                    <option key={q} value={q}>
                      {q}
                    </option>
                  ))}
                </select>
              </div>

              {/* Options Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Difficulty Level</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as any)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-sm text-white"
                  >
                    {DIFFICULTY_LEVELS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Target Application (Optional)</label>
                  <select
                    value={selectedAppId}
                    onChange={(e) => setSelectedAppId(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-sm text-gray-400"
                  >
                    <option value="">General preparation</option>
                    {applications.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.company} - {a.role}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating || (!questionInput.trim() && !selectedQuestion)}
                className="w-full flex items-center justify-center gap-2 py-4 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating Answer...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Generate Answer
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* RESULT VIEW */}
        {view === 'result' && generatedResult && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-850">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-white">Generated Answer</h3>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    QUESTION_TYPE_COLORS[generatedResult.questionType].bg
                  } ${QUESTION_TYPE_COLORS[generatedResult.questionType].text}`}
                >
                  {generatedResult.questionType.replace('-', ' ')}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setView('generate')}
                  className="px-3 py-1 text-sm text-gray-400 hover:text-white border border-gray-700 rounded"
                >
                  <RotateCcw className="w-4 h-4 inline mr-1" />
                  Regenerate
                </button>
                <button
                  onClick={handleSave}
                  className="px-3 py-1 text-sm bg-green-600 hover:bg-green-500 text-white rounded flex items-center gap-1"
                >
                  <Save className="w-4 h-4" />
                  Save
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Question */}
              <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                <span className="text-xs font-bold text-gray-500 uppercase block mb-1">Question</span>
                <p className="text-white font-medium">{questionInput || selectedQuestion}</p>
              </div>

              {/* Answer View Toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() => setAnswerView('structured')}
                  className={`px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1 ${
                    answerView === 'structured' ? 'bg-yellow-600 text-white' : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  <List className="w-4 h-4" />
                  Structured
                </button>
                <button
                  onClick={() => setAnswerView('narrative')}
                  className={`px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1 ${
                    answerView === 'narrative' ? 'bg-yellow-600 text-white' : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  Narrative
                </button>
                <button
                  onClick={() => setAnswerView('bullets')}
                  className={`px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1 ${
                    answerView === 'bullets' ? 'bg-yellow-600 text-white' : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  <CheckCircle className="w-4 h-4" />
                  Key Points
                </button>
                <button
                  onClick={() => copyToClipboard(generatedResult.answer.narrative)}
                  className="ml-auto px-3 py-1.5 bg-gray-800 text-gray-400 hover:text-white rounded text-sm flex items-center gap-1"
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </button>
              </div>

              {/* Answer Content */}
              <div className="bg-gray-900/50 rounded-lg border border-gray-700 p-4">
                {answerView === 'structured' && renderSectionContent(generatedResult.answer.structured)}
                {answerView === 'narrative' && (
                  <MarkdownRenderer content={generatedResult.answer.narrative} />
                )}
                {answerView === 'bullets' && (
                  <ul className="space-y-3">
                    {generatedResult.answer.bulletPoints.map((point, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400 mt-1 flex-shrink-0" />
                        <MarkdownRenderer content={point} variant="compact" className="flex-1" />
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Sources */}
              {(generatedResult.sources.storyIds.length > 0 || generatedResult.sources.profileSections.length > 0) && (
                <div className="bg-blue-900/20 border border-blue-800/30 rounded-lg p-4">
                  <h4 className="text-xs font-bold text-blue-400 uppercase mb-2">Sources Used</h4>
                  <div className="flex flex-wrap gap-2">
                    {generatedResult.sources.profileSections.map((s) => (
                      <span key={s} className="px-2 py-1 bg-blue-900/30 text-blue-300 rounded text-xs">
                        Profile: {s}
                      </span>
                    ))}
                    {generatedResult.sources.storyIds.map((id) => {
                      const story = stories.find((s) => s.id === id);
                      return story ? (
                        <span key={id} className="px-2 py-1 bg-purple-900/30 text-purple-300 rounded text-xs">
                          Story: {story.title}
                        </span>
                      ) : null;
                    })}
                    {generatedResult.sources.synthesized && (
                      <span className="px-2 py-1 bg-yellow-900/30 text-yellow-300 rounded text-xs">AI Synthesized</span>
                    )}
                  </div>
                </div>
              )}

              {/* Tags */}
              {generatedResult.suggestedTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {generatedResult.suggestedTags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-gray-800 text-gray-300 rounded text-xs border border-gray-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Follow-ups */}
              <div>
                <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-400" />
                  Likely Follow-up Questions
                  {isGeneratingFollowUps && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
                </h4>
                <div className="space-y-3">
                  {generatedResult.followUps.map((fu, i) => (
                    <div key={i} className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
                      <button
                        onClick={() => toggleFollowUp(i)}
                        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-800/80"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${LIKELIHOOD_COLORS[fu.likelihood]}`}
                          >
                            {fu.likelihood}
                          </span>
                          <span className="text-sm text-white">{fu.question}</span>
                        </div>
                        {expandedFollowUps.has(i) ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                      {expandedFollowUps.has(i) && (
                        <div className="px-4 pb-4 border-t border-gray-700 pt-3 space-y-3">
                          <div>
                            <span className="text-xs font-bold text-gray-500 uppercase block mb-1">Suggested Answer</span>
                            <p className="text-sm text-gray-300">{fu.suggestedAnswer}</p>
                          </div>
                          <div>
                            <span className="text-xs font-bold text-gray-500 uppercase block mb-1">Key Points</span>
                            <ul className="space-y-1">
                              {fu.keyPoints.map((kp, j) => (
                                <li key={j} className="text-xs text-gray-400 flex items-center gap-2">
                                  <CheckCircle className="w-3 h-3 text-green-400" />
                                  {kp}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PRACTICE VIEW */}
        {view === 'practice' && practiceAnswer && (
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-850">
              <h3 className="font-semibold text-white">Practice Mode</h3>
              <button onClick={() => setView('list')} className="text-sm text-gray-400 hover:text-white">
                Cancel
              </button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8">
              {/* Timer */}
              <div className="text-center">
                <div className="text-6xl font-mono text-white mb-2">{formatTime(practiceTime)}</div>
                <p className="text-gray-400 text-sm">Practice speaking your answer</p>
              </div>

              {/* Question */}
              <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 max-w-2xl w-full text-center">
                <span className="text-xs font-bold text-gray-500 uppercase block mb-2">Question</span>
                <p className="text-white text-lg font-medium">{practiceAnswer.question}</p>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-4">
                <button
                  onClick={togglePractice}
                  className={`p-6 rounded-full transition-colors ${
                    isPracticing ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'
                  } text-white`}
                >
                  {isPracticing ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />}
                </button>
              </div>

              {/* Toggle Answer */}
              <button
                onClick={() => setShowAnswerDuringPractice(!showAnswerDuringPractice)}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white"
              >
                <BookOpen className="w-4 h-4" />
                {showAnswerDuringPractice ? 'Hide Answer' : 'Show Answer'}
              </button>

              {showAnswerDuringPractice && (
                <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 max-w-2xl w-full max-h-64 overflow-y-auto">
                  <MarkdownRenderer content={practiceAnswer.answer.narrative} />
                </div>
              )}

              {/* Finish */}
              <button
                onClick={finishPractice}
                className="px-6 py-3 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg font-medium"
              >
                Finish Practice
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
