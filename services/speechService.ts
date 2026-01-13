/**
 * Speech Recognition Service for Interview Copilot
 * Uses Web Speech API for continuous speech-to-text transcription
 */

// Type definitions for Web Speech API (not fully typed in TS by default)
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

// Extend Window to include speech recognition
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  onspeechend: (() => void) | null;
  onaudiostart: (() => void) | null;
  onaudioend: (() => void) | null;
}

// Transcript chunk with metadata
export interface TranscriptChunk {
  id: string;
  text: string;
  isFinal: boolean;
  confidence: number;
  timestamp: string;
}

// Speech service callbacks
export interface SpeechServiceCallbacks {
  onTranscript: (chunk: TranscriptChunk) => void;
  onError: (error: string) => void;
  onStatusChange: (status: SpeechServiceStatus) => void;
  onSilence?: (durationMs: number) => void;
}

// Service status
export type SpeechServiceStatus =
  | 'idle'
  | 'starting'
  | 'listening'
  | 'paused'
  | 'error'
  | 'not-supported';

// Speech service configuration
export interface SpeechServiceConfig {
  language: string;
  continuous: boolean;
  interimResults: boolean;
  silenceThresholdMs: number;  // How long of silence before triggering onSilence
}

const DEFAULT_CONFIG: SpeechServiceConfig = {
  language: 'en-US',
  continuous: true,
  interimResults: true,
  silenceThresholdMs: 2000,
};

/**
 * Speech Recognition Service
 * Manages Web Speech API for continuous transcription
 */
export class SpeechService {
  private recognition: SpeechRecognition | null = null;
  private config: SpeechServiceConfig;
  private callbacks: SpeechServiceCallbacks | null = null;
  private status: SpeechServiceStatus = 'idle';
  private lastSpeechTime: number = 0;
  private silenceTimer: number | null = null;
  private isManualStop: boolean = false;
  private restartAttempts: number = 0;
  private maxRestartAttempts: number = 5;

  constructor(config: Partial<SpeechServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initRecognition();
  }

  /**
   * Check if speech recognition is supported
   */
  static isSupported(): boolean {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  /**
   * Initialize the speech recognition engine
   */
  private initRecognition(): void {
    if (!SpeechService.isSupported()) {
      this.status = 'not-supported';
      return;
    }

    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognitionClass();

    // Configure recognition
    this.recognition.continuous = this.config.continuous;
    this.recognition.interimResults = this.config.interimResults;
    this.recognition.lang = this.config.language;
    this.recognition.maxAlternatives = 1;

    // Setup event handlers
    this.recognition.onstart = () => {
      console.log('[SpeechService] Recognition started');
      this.setStatus('listening');
      this.restartAttempts = 0;
      this.lastSpeechTime = Date.now();
      this.startSilenceDetection();
    };

    this.recognition.onaudiostart = () => {
      console.log('[SpeechService] Audio capture started');
    };

    this.recognition.onspeechstart = () => {
      console.log('[SpeechService] Speech detected');
    };

    this.recognition.onspeechend = () => {
      console.log('[SpeechService] Speech ended');
    };

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      console.log('[SpeechService] Got result:', {
        resultIndex: event.resultIndex,
        resultsLength: event.results.length,
      });
      this.lastSpeechTime = Date.now();

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const alternative = result[0];

        console.log('[SpeechService] Transcript chunk:', {
          text: alternative.transcript,
          isFinal: result.isFinal,
          confidence: alternative.confidence,
        });

        const chunk: TranscriptChunk = {
          id: `chunk-${Date.now()}-${i}`,
          text: alternative.transcript,
          isFinal: result.isFinal,
          confidence: alternative.confidence,
          timestamp: new Date().toISOString(),
        };

        this.callbacks?.onTranscript(chunk);
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // Handle specific errors
      switch (event.error) {
        case 'no-speech':
          // Not a real error, just no speech detected - silently ignore
          // This happens when the mic is active but no speech is detected
          return;
        case 'aborted':
          // Intentional abort, ignore
          if (this.isManualStop) return;
          console.warn('Speech recognition aborted');
          break;
        case 'network':
          console.error('Speech recognition network error');
          this.callbacks?.onError('Network error. Please check your connection.');
          break;
        case 'not-allowed':
          console.error('Speech recognition: microphone access denied');
          this.callbacks?.onError('Microphone access denied. Please allow microphone access.');
          this.setStatus('error');
          return;
        case 'audio-capture':
          console.error('Speech recognition: no microphone found');
          this.callbacks?.onError('No microphone found. Please connect a microphone.');
          this.setStatus('error');
          return;
        default:
          console.error('Speech recognition error:', event.error);
          this.callbacks?.onError(`Speech recognition error: ${event.error}`);
      }
    };

    this.recognition.onend = () => {
      console.log('[SpeechService] Recognition ended', {
        isManualStop: this.isManualStop,
        status: this.status,
        restartAttempts: this.restartAttempts,
      });
      this.stopSilenceDetection();

      // Auto-restart if not manually stopped and still listening
      if (!this.isManualStop && this.status === 'listening') {
        if (this.restartAttempts < this.maxRestartAttempts) {
          this.restartAttempts++;
          console.log('[SpeechService] Auto-restarting, attempt:', this.restartAttempts);
          setTimeout(() => {
            if (!this.isManualStop && this.recognition) {
              try {
                this.recognition.start();
              } catch (e) {
                console.warn('Failed to restart recognition:', e);
              }
            }
          }, 100);
        } else {
          this.setStatus('error');
          this.callbacks?.onError('Speech recognition stopped unexpectedly. Please restart.');
        }
      } else {
        this.setStatus('idle');
      }
    };
  }

  /**
   * Start listening
   */
  start(callbacks: SpeechServiceCallbacks): boolean {
    if (!this.recognition) {
      callbacks.onError('Speech recognition is not supported in this browser.');
      return false;
    }

    this.callbacks = callbacks;
    this.isManualStop = false;
    this.restartAttempts = 0;

    try {
      this.setStatus('starting');
      this.recognition.start();
      return true;
    } catch (e) {
      console.error('Failed to start recognition:', e);
      callbacks.onError('Failed to start speech recognition.');
      this.setStatus('error');
      return false;
    }
  }

  /**
   * Stop listening
   */
  stop(): void {
    this.isManualStop = true;
    this.stopSilenceDetection();

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        // Ignore errors when stopping
      }
    }

    this.setStatus('idle');
  }

  /**
   * Pause listening (stop without resetting)
   */
  pause(): void {
    this.isManualStop = true;
    this.stopSilenceDetection();

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        // Ignore errors when stopping
      }
    }

    this.setStatus('paused');
  }

  /**
   * Resume listening after pause
   */
  resume(): boolean {
    if (!this.recognition || !this.callbacks) {
      return false;
    }

    this.isManualStop = false;
    this.restartAttempts = 0;

    try {
      this.setStatus('starting');
      this.recognition.start();
      return true;
    } catch (e) {
      console.error('Failed to resume recognition:', e);
      this.setStatus('error');
      return false;
    }
  }

  /**
   * Get current status
   */
  getStatus(): SpeechServiceStatus {
    return this.status;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SpeechServiceConfig>): void {
    this.config = { ...this.config, ...config };

    if (this.recognition) {
      this.recognition.lang = this.config.language;
      this.recognition.continuous = this.config.continuous;
      this.recognition.interimResults = this.config.interimResults;
    }
  }

  /**
   * Set status and notify callbacks
   */
  private setStatus(status: SpeechServiceStatus): void {
    this.status = status;
    this.callbacks?.onStatusChange(status);
  }

  /**
   * Start silence detection timer
   */
  private startSilenceDetection(): void {
    this.stopSilenceDetection();

    this.silenceTimer = window.setInterval(() => {
      const silenceDuration = Date.now() - this.lastSpeechTime;
      if (silenceDuration >= this.config.silenceThresholdMs) {
        this.callbacks?.onSilence?.(silenceDuration);
      }
    }, 500);
  }

  /**
   * Stop silence detection timer
   */
  private stopSilenceDetection(): void {
    if (this.silenceTimer !== null) {
      clearInterval(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stop();
    this.recognition = null;
    this.callbacks = null;
  }
}

/**
 * Question detection utilities
 */
export const questionPatterns = {
  // Direct question patterns
  directQuestion: /\?$/,

  // Question word patterns at start
  questionWords: /^(who|what|when|where|why|how|which|whose|whom|can|could|would|should|will|do|does|did|is|are|was|were|have|has|had|may|might)\b/i,

  // Tell me about patterns (common in interviews)
  tellMeAbout: /^(tell me|describe|explain|walk me through|give me an example|share|talk about)/i,

  // Behavioral question patterns
  behavioral: /^(have you ever|can you (tell|describe|give)|what would you|how would you|when was a time|describe a (time|situation)|give me an example)/i,

  // Technical question patterns
  technical: /^(how (do|does|would) you|what is|what are|explain|describe how|what's the difference|compare)/i,
};

/**
 * Analyze text to determine if it's likely a question
 */
export function analyzeForQuestion(text: string): { isQuestion: boolean; confidence: number; type: string } {
  const trimmed = text.trim().toLowerCase();

  // Direct question mark
  if (questionPatterns.directQuestion.test(text.trim())) {
    return { isQuestion: true, confidence: 95, type: 'direct' };
  }

  // Behavioral patterns
  if (questionPatterns.behavioral.test(trimmed)) {
    return { isQuestion: true, confidence: 90, type: 'behavioral' };
  }

  // Tell me about patterns
  if (questionPatterns.tellMeAbout.test(trimmed)) {
    return { isQuestion: true, confidence: 85, type: 'request' };
  }

  // Technical patterns
  if (questionPatterns.technical.test(trimmed)) {
    return { isQuestion: true, confidence: 80, type: 'technical' };
  }

  // Question words at start
  if (questionPatterns.questionWords.test(trimmed)) {
    return { isQuestion: true, confidence: 70, type: 'general' };
  }

  return { isQuestion: false, confidence: 0, type: 'statement' };
}

/**
 * Accumulate transcript chunks into sentences
 */
export class TranscriptAccumulator {
  private buffer: string = '';
  private chunks: TranscriptChunk[] = [];

  /**
   * Add a chunk to the accumulator
   * Returns complete sentences when available
   */
  addChunk(chunk: TranscriptChunk): string[] {
    if (chunk.isFinal) {
      // Final result - add to buffer and check for sentences
      this.buffer += chunk.text;
      this.chunks.push(chunk);

      // Look for sentence boundaries
      const sentences = this.extractSentences();
      return sentences;
    } else {
      // Interim result - just update the preview
      return [];
    }
  }

  /**
   * Get current buffer content (including interim)
   */
  getBuffer(): string {
    return this.buffer;
  }

  /**
   * Force flush the buffer
   */
  flush(): string {
    const content = this.buffer.trim();
    this.buffer = '';
    this.chunks = [];
    return content;
  }

  /**
   * Extract complete sentences from buffer
   */
  private extractSentences(): string[] {
    const sentences: string[] = [];

    // Look for sentence-ending punctuation followed by whitespace (mid-buffer sentences)
    const sentenceEnds = /([.!?])\s+/g;
    let match;
    let lastIndex = 0;

    while ((match = sentenceEnds.exec(this.buffer)) !== null) {
      const sentence = this.buffer.slice(lastIndex, match.index + 1).trim();
      if (sentence.length > 5) { // Ignore very short fragments
        sentences.push(sentence);
      }
      lastIndex = match.index + match[0].length;
    }

    // Keep remainder in buffer
    if (lastIndex > 0) {
      this.buffer = this.buffer.slice(lastIndex);
    }

    // Also check if buffer ends with sentence-ending punctuation (no trailing whitespace)
    // This handles cases like "Tell me about yourself." where speech ends at the sentence
    const trimmedBuffer = this.buffer.trim();
    if (trimmedBuffer.length > 5 && /[.!?]$/.test(trimmedBuffer)) {
      sentences.push(trimmedBuffer);
      this.buffer = '';
    }

    return sentences;
  }
}
