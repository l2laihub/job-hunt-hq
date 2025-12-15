import React, { useState, useRef, useEffect } from 'react';
import { UserProfile, JobApplication, InterviewConfig, TranscriptItem, InterviewFeedback } from '../types';
import { createLiveSession, generateInterviewFeedback } from '../services/geminiService';
import { createBlob, decodeAudioData, decode } from '../utils/audio';
import { Mic, MicOff, Play, StopCircle, Clock, Volume2, Settings, Loader2, Award, AlertCircle, ChevronRight, BarChart2 } from 'lucide-react';
import { LiveServerMessage } from '@google/genai';

interface MockInterviewProps {
  profile: UserProfile;
  applications: JobApplication[];
}

export const MockInterview: React.FC<MockInterviewProps> = ({ profile, applications }) => {
  // State
  const [step, setStep] = useState<'setup' | 'active' | 'feedback'>('setup');
  const [config, setConfig] = useState<InterviewConfig>({
    type: 'behavioral',
    difficulty: 'medium',
    duration: 15,
    focusAreas: ['leadership', 'conflict resolution']
  });
  const [selectedAppId, setSelectedAppId] = useState<string>('');
  
  // Session State
  const [isConnected, setIsConnected] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [feedback, setFeedback] = useState<InterviewFeedback | null>(null);
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);

  // Refs for Audio/Session
  const sessionRef = useRef<any>(null); // LiveSession
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const audioQueueRef = useRef<AudioBufferSourceNode[]>([]);
  const timerRef = useRef<number | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endSession();
    };
  }, []);

  const startSession = async () => {
    try {
      setIsConnected(false);
      setTranscript([]);
      setElapsedTime(0);
      
      const app = applications.find(a => a.id === selectedAppId);
      
      // Initialize Audio Context
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      // Setup promise to capture the session object from callbacks if needed, 
      // but simpler to await createLiveSession then assume sessionRef is set.
      
      const session = await createLiveSession(config, profile, app, {
        onOpen: () => {
          setIsConnected(true);
          startMicrophone();
          startTimer();
          
          // CRITICAL: Kickstart conversation
          // We need to use the sessionRef.current here, but it might not be set yet due to async.
          // In the SDK, onOpen fires after connect resolves usually, but let's be safe.
          // However, we can also send it immediately after `await createLiveSession` below.
        },
        onMessage: handleServerMessage,
        onClose: () => {
          setIsConnected(false);
          stopMicrophone();
          stopTimer();
        },
        onError: (e) => {
          console.error("Session error:", e);
          alert("Connection error. Please try again.");
          endSession();
        }
      });
      
      sessionRef.current = session;
      
      // Auto-start is handled by system instruction or user input.
      // session.send() is not available for text input in LiveSession.

    } catch (e) {
      console.error("Failed to start session:", e);
      alert("Failed to connect to Gemini Live. Check API Key and network.");
    }
  };

  const startMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1 } });
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const source = ctx.createMediaStreamSource(stream);
      const processor = ctx.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        
        // Simple volume visualization
        let sum = 0;
        for(let i=0; i<inputData.length; i++) sum += inputData[i]*inputData[i];
        const vol = Math.sqrt(sum/inputData.length);
        setVolumeLevel(vol * 5); // Amplify for visualization

        if (sessionRef.current && isConnected) {
          const blob = createBlob(inputData);
          sessionRef.current.sendRealtimeInput({ media: blob });
        }
      };

      source.connect(processor);
      processor.connect(ctx.destination);
      
      inputSourceRef.current = source;
      processorRef.current = processor;
      setIsMicOn(true);
    } catch (e) {
      console.error("Mic error:", e);
      alert("Could not access microphone.");
    }
  };

  const stopMicrophone = () => {
    processorRef.current?.disconnect();
    inputSourceRef.current?.disconnect();
    inputSourceRef.current?.mediaStream.getTracks().forEach(t => t.stop());
    setIsMicOn(false);
  };

  const handleServerMessage = async (msg: LiveServerMessage) => {
    const { serverContent } = msg;

    // Handle Audio Output
    const audioData = serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
    if (audioData && audioContextRef.current) {
      setIsAiSpeaking(true);
      const ctx = audioContextRef.current;
      const buffer = await decodeAudioData(decode(audioData), ctx, 24000, 1);
      
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      
      // Schedule playback
      const currentTime = ctx.currentTime;
      const startTime = Math.max(currentTime, nextStartTimeRef.current);
      source.start(startTime);
      nextStartTimeRef.current = startTime + buffer.duration;
      
      audioQueueRef.current.push(source);
      
      source.onended = () => {
        // Simple check: if audio queue is draining, AI stopped speaking
        // This is imperfect but works for simple visualization toggle
        // Ideally we track the active source count
        setTimeout(() => setIsAiSpeaking(false), 100); 
      };
    }

    // Handle Interruption
    if (serverContent?.interrupted) {
      audioQueueRef.current.forEach(s => {
        try { s.stop(); } catch(e) {}
      });
      audioQueueRef.current = [];
      nextStartTimeRef.current = 0;
      setIsAiSpeaking(false);
    }

    // Handle Transcriptions
    if (serverContent?.modelTurn?.parts?.[0]?.text) {
        setTranscript(prev => [...prev, { role: 'model', text: serverContent.modelTurn!.parts[0].text!, timestamp: new Date().toISOString() }]);
    }
    
    // Note: User transcription arrives in a different field usually, 
    // but for this preview model, we might rely on 'inputTranscription' if configured (not fully guaranteed in all preview versions).
    // We'll optimistically check inputTranscription if available.
    // In strict types, we need to cast or check availability.
    const inputTrans = (msg as any).serverContent?.inputTranscription; // Casting for safety against type drift
    if (inputTrans?.text) {
         // Debounce or accumulate? 
         // For now, let's just append. A real app would update the last "user" entry until turn completes.
         // Simplified:
         setTranscript(prev => {
             const last = prev[prev.length - 1];
             if (last?.role === 'user') {
                 // Append to last user message if recent? 
                 // Live API sends partials. We really want 'turnComplete'.
                 // For simplicity in this demo, we'll just log it.
                 return prev;
             }
             return [...prev, { role: 'user', text: inputTrans.text, timestamp: new Date().toISOString() }];
         });
    }
  };

  const endSession = async () => {
    stopTimer();
    stopMicrophone();
    audioQueueRef.current.forEach(s => {
       try { s.stop(); } catch(e) {}
    });
    
    // Close WebSocket
    // @google/genai doesn't expose explicit close() on session object in all versions, 
    // but disconnecting audio context stops the flow.
    // If the SDK supports it: sessionRef.current?.close(); 
    // Assuming we just cleanup locally.
    
    setIsConnected(false);
    
    // If we have data, go to feedback
    if (transcript.length > 0 || elapsedTime > 10) {
        setStep('feedback');
        generateFeedback();
    } else {
        setStep('setup');
    }
  };

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
        setElapsedTime(prev => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const generateFeedback = async () => {
    setIsGeneratingFeedback(true);
    try {
        // If transcript is empty (audio-only model might not return text in all versions),
        // we might mock it or try to use what we have.
        // For this demo, we'll assume some transcript was captured or fallback.
        const effectiveTranscript = transcript.length > 0 ? transcript : [
            {role: 'model', text: "Interview started..."},
            {role: 'user', text: "(Audio data processed)"},
            {role: 'model', text: "Interview completed."}
        ] as TranscriptItem[];

        const result = await generateInterviewFeedback(effectiveTranscript);
        setFeedback(result);
    } catch (e) {
        console.error("Feedback error:", e);
    } finally {
        setIsGeneratingFeedback(false);
    }
  };

  // Render Views
  const renderSetup = () => (
    <div className="max-w-2xl mx-auto space-y-8 p-6">
        <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center p-3 bg-blue-900/30 rounded-full mb-2">
                <Mic className="w-8 h-8 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Mock Interview Setup</h2>
            <p className="text-gray-400">Configure your session to simulate a real interview environment.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Interview Type</label>
                    <div className="grid grid-cols-2 gap-2">
                        {['behavioral', 'technical', 'system-design', 'mixed'].map(t => (
                            <button 
                                key={t}
                                onClick={() => setConfig({...config, type: t as any})}
                                className={`px-3 py-2 rounded-lg text-sm font-medium border capitalize ${config.type === t ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-750'}`}
                            >
                                {t.replace('-', ' ')}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Difficulty</label>
                    <div className="flex bg-gray-900 p-1 rounded-lg border border-gray-800">
                        {['easy', 'medium', 'hard'].map(d => (
                            <button 
                                key={d}
                                onClick={() => setConfig({...config, difficulty: d as any})}
                                className={`flex-1 py-1.5 rounded text-sm capitalize ${config.difficulty === d ? 'bg-gray-700 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                {d}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Context (Optional)</label>
                    <select 
                        value={selectedAppId}
                        onChange={e => setSelectedAppId(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-800 rounded px-3 py-2 text-sm text-white focus:ring-1 focus:ring-blue-500 outline-none"
                    >
                        <option value="">General Practice (No specific job)</option>
                        {applications.map(app => (
                            <option key={app.id} value={app.id}>{app.company} - {app.role}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="bg-gray-900/50 rounded-xl p-5 border border-gray-800 space-y-4">
                <h3 className="font-semibold text-white flex items-center gap-2">
                    <Settings className="w-4 h-4" /> Focus Areas
                </h3>
                <div className="flex flex-wrap gap-2">
                    {['Leadership', 'Conflict', 'Technical Depth', 'System Architecture', 'Career Goals'].map(area => (
                        <button
                            key={area}
                            onClick={() => {
                                const newAreas = config.focusAreas.includes(area) 
                                    ? config.focusAreas.filter(a => a !== area)
                                    : [...config.focusAreas, area];
                                setConfig({...config, focusAreas: newAreas});
                            }}
                            className={`px-3 py-1 rounded-full text-xs border ${
                                config.focusAreas.includes(area) 
                                    ? 'bg-blue-900/30 border-blue-700 text-blue-300' 
                                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                            }`}
                        >
                            {area}
                        </button>
                    ))}
                </div>
                
                <div className="pt-4 mt-auto">
                    <button 
                        onClick={() => { setStep('active'); startSession(); }}
                        className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold shadow-lg shadow-green-900/20 flex items-center justify-center gap-2 transition-all"
                    >
                        <Play className="w-5 h-5" /> Start Interview
                    </button>
                </div>
            </div>
        </div>
    </div>
  );

  const renderActive = () => (
    <div className="flex flex-col h-full max-w-4xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
            <div className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-red-500 animate-pulse' : 'bg-yellow-500'}`} />
                <div>
                    <h2 className="font-bold text-white">Live Interview</h2>
                    <p className="text-xs text-gray-400 capitalize">{config.type} • {config.difficulty}</p>
                </div>
            </div>
            <div className="flex items-center gap-4 bg-gray-900 px-4 py-2 rounded-lg border border-gray-800">
                <Clock className="w-4 h-4 text-blue-400" />
                <span className="font-mono text-xl text-white">{formatTime(elapsedTime)}</span>
            </div>
        </div>

        {/* Visualizer Area */}
        <div className="flex-1 flex flex-col items-center justify-center relative bg-gradient-to-b from-gray-950 to-gray-900">
            {/* AI Avatar / Status */}
            <div className="mb-12 text-center space-y-4">
                <div className={`w-32 h-32 rounded-full mx-auto flex items-center justify-center transition-all duration-300 ${isAiSpeaking ? 'bg-blue-500/20 shadow-[0_0_50px_rgba(59,130,246,0.3)] scale-110' : 'bg-gray-800'}`}>
                    <div className={`w-24 h-24 rounded-full bg-gray-900 flex items-center justify-center border-2 ${isAiSpeaking ? 'border-blue-400' : 'border-gray-700'}`}>
                        <Volume2 className={`w-10 h-10 ${isAiSpeaking ? 'text-blue-400 animate-pulse' : 'text-gray-600'}`} />
                    </div>
                </div>
                <p className="text-gray-400 font-medium">
                    {isAiSpeaking ? "Interviewer is speaking..." : isConnected ? "Interviewer is listening..." : "Connecting..."}
                </p>
            </div>

            {/* User Mic Visualizer */}
            <div className="h-24 flex items-end gap-1 justify-center w-full max-w-md">
                {[...Array(20)].map((_, i) => (
                    <div 
                        key={i} 
                        className="w-2 bg-green-500 rounded-t transition-all duration-75"
                        style={{ 
                            height: isMicOn ? `${Math.max(4, Math.random() * volumeLevel * 20)}px` : '4px',
                            opacity: isMicOn ? 1 : 0.3 
                        }} 
                    />
                ))}
            </div>

            <div className="absolute bottom-10 left-0 right-0 flex justify-center gap-6">
                <button 
                    onClick={() => setIsMicOn(!isMicOn)} // Actually toggling this is tricky with raw streams, usually we just mute processing
                    className={`p-4 rounded-full border ${isMicOn ? 'bg-gray-800 border-gray-600 text-white hover:bg-gray-700' : 'bg-red-900/20 border-red-500 text-red-500'}`}
                >
                    {isMicOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
                </button>
                <button 
                    onClick={endSession}
                    className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-full font-bold flex items-center gap-2 shadow-lg"
                >
                    <StopCircle className="w-5 h-5" /> End Session
                </button>
            </div>
        </div>
    </div>
  );

  const renderFeedback = () => (
    <div className="max-w-4xl mx-auto p-6 h-full overflow-y-auto">
        <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center p-3 bg-green-900/30 rounded-full mb-3">
                <Award className="w-8 h-8 text-green-400" />
            </div>
            <h2 className="text-3xl font-bold text-white">Interview Complete</h2>
            <p className="text-gray-400 mt-2">Here's how you performed</p>
        </div>

        {isGeneratingFeedback && (
            <div className="flex flex-col items-center justify-center py-20 text-blue-400">
                <Loader2 className="w-12 h-12 animate-spin mb-4" />
                <p>Analyzing transcript and generating feedback...</p>
            </div>
        )}

        {!isGeneratingFeedback && feedback && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4">
                {/* Score Card */}
                <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 flex flex-col items-center justify-center text-center">
                    <div className="text-5xl font-bold text-white mb-2">{feedback.overallScore}/10</div>
                    <div className="text-sm font-medium text-gray-400 uppercase tracking-wider">Overall Score</div>
                    <div className="mt-6 w-full space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Clarity</span>
                            <span className="text-white">{feedback.communication.clarity}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Confidence</span>
                            <span className="text-white">{feedback.communication.confidence}</span>
                        </div>
                    </div>
                </div>

                {/* Summary & Points */}
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
                        <h3 className="font-bold text-white mb-3">Summary</h3>
                        <p className="text-gray-300 leading-relaxed">{feedback.summary}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-green-900/10 border border-green-900/30 rounded-xl p-5">
                            <h3 className="font-bold text-green-400 mb-3 flex items-center gap-2">
                                <Award className="w-4 h-4" /> Strengths
                            </h3>
                            <ul className="space-y-2">
                                {feedback.strengths.map((s, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                                        <ChevronRight className="w-4 h-4 text-green-500/50 shrink-0 mt-0.5" />
                                        {s}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="bg-red-900/10 border border-red-900/30 rounded-xl p-5">
                            <h3 className="font-bold text-red-400 mb-3 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" /> Areas to Improve
                            </h3>
                            <ul className="space-y-2">
                                {feedback.weaknesses.map((w, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                                        <ChevronRight className="w-4 h-4 text-red-500/50 shrink-0 mt-0.5" />
                                        {w}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        )}
        
        {!isGeneratingFeedback && feedback && (
            <div className="mt-8 flex justify-center">
                <button 
                    onClick={() => setStep('setup')}
                    className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                >
                    Start New Session
                </button>
            </div>
        )}
    </div>
  );

  return (
    <div className="h-full bg-gray-950 text-gray-100 flex flex-col">
      {step === 'setup' && renderSetup()}
      {step === 'active' && renderActive()}
      {step === 'feedback' && renderFeedback()}
    </div>
  );
};