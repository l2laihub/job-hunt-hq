type StateCallback = (state: {
  status?: 'idle' | 'recording' | 'paused' | 'stopped';
  duration?: number;
  volumeLevel?: number;
  recordedBlob?: Blob | null;
  recordedDuration?: number;
  error?: string | null;
}) => void;

class RecordingService {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private chunks: Blob[] = [];
  private startTime = 0;
  private pausedDuration = 0;
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private animationFrame: number | null = null;
  private onStateChange: StateCallback | null = null;
  private mimeType = '';

  setStateCallback(cb: StateCallback): void {
    this.onStateChange = cb;
  }

  async start(): Promise<void> {
    try {
      this.chunks = [];

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000,
        },
      });
      this.stream = stream;

      // Setup audio analysis for volume visualization
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.audioContext = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      this.analyser = analyser;

      // Create MediaRecorder with best available codec
      this.mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: this.mimeType,
        audioBitsPerSecond: 128000,
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.chunks.push(event.data);
        }
      };

      this.mediaRecorder = mediaRecorder;
      mediaRecorder.start(1000);

      this.startTime = Date.now();
      this.pausedDuration = 0;

      this.onStateChange?.({ status: 'recording', duration: 0, error: null });
      this.startTimer();
      this.startVolumeMonitor();
    } catch (err) {
      console.error('Failed to start recording:', err);
      this.onStateChange?.({
        status: 'idle',
        error: 'Could not access microphone. Please check permissions.',
      });
    }
  }

  pause(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
      const elapsed = (Date.now() - this.startTime) / 1000 + this.pausedDuration;
      this.pausedDuration = Math.floor(elapsed);
      this.stopTimer();
      this.stopVolumeMonitor();
      this.onStateChange?.({ status: 'paused', volumeLevel: 0 });
    }
  }

  resume(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
      this.startTime = Date.now();
      this.onStateChange?.({ status: 'recording' });
      this.startTimer();
      this.startVolumeMonitor();
    }
  }

  stop(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || (this.mediaRecorder.state !== 'recording' && this.mediaRecorder.state !== 'paused')) {
        reject(new Error('No active recording'));
        return;
      }

      const mimeType = this.mimeType;
      const duration = this.getCurrentDuration();

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: mimeType });
        this.stopTimer();
        this.stopVolumeMonitor();
        this.releaseStream();

        this.onStateChange?.({
          status: 'stopped',
          recordedBlob: blob,
          recordedDuration: duration,
          volumeLevel: 0,
        });

        resolve(blob);
      };

      this.mediaRecorder.stop();
    });
  }

  discard(): void {
    this.stopTimer();
    this.stopVolumeMonitor();

    if (this.mediaRecorder && (this.mediaRecorder.state === 'recording' || this.mediaRecorder.state === 'paused')) {
      // Suppress the onstop handler since we're discarding
      this.mediaRecorder.onstop = null;
      this.mediaRecorder.stop();
    }

    this.releaseStream();
    this.chunks = [];
    this.mediaRecorder = null;

    this.onStateChange?.({
      status: 'idle',
      duration: 0,
      volumeLevel: 0,
      recordedBlob: null,
      recordedDuration: 0,
      error: null,
    });
  }

  getVolumeLevel(): number {
    if (!this.analyser) return 0;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    return (sum / dataArray.length) / 255;
  }

  isActive(): boolean {
    return this.mediaRecorder !== null && (
      this.mediaRecorder.state === 'recording' || this.mediaRecorder.state === 'paused'
    );
  }

  private getCurrentDuration(): number {
    if (!this.startTime) return this.pausedDuration;
    const elapsed = (Date.now() - this.startTime) / 1000 + this.pausedDuration;
    return Math.floor(elapsed);
  }

  private startTimer(): void {
    if (this.timerInterval) return;

    this.timerInterval = setInterval(() => {
      const duration = this.getCurrentDuration();
      this.onStateChange?.({ duration });
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private startVolumeMonitor(): void {
    const update = () => {
      if (!this.analyser) return;
      const level = this.getVolumeLevel();
      this.onStateChange?.({ volumeLevel: level });
      this.animationFrame = requestAnimationFrame(update);
    };
    this.animationFrame = requestAnimationFrame(update);
  }

  private stopVolumeMonitor(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  private releaseStream(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.analyser = null;
  }
}

export const recordingService = new RecordingService();
