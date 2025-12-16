import type { Blob } from '@google/genai';

/**
 * Create a Blob for Gemini Live API from audio data
 */
export function createAudioBlob(data: Float32Array): Blob {
  const length = data.length;
  const int16 = new Int16Array(length);

  for (let i = 0; i < length; i++) {
    // Convert float32 (-1 to 1) to int16 (-32768 to 32767)
    int16[i] = Math.max(-32768, Math.min(32767, Math.floor(data[i] * 32768)));
  }

  return {
    data: encodeBase64(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

/**
 * Encode bytes to base64
 */
export function encodeBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;

  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  return btoa(binary);
}

/**
 * Decode base64 to bytes
 */
export function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);

  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes;
}

/**
 * Decode audio data to AudioBuffer
 */
export async function decodeAudioData(
  data: Uint8Array,
  context: AudioContext,
  sampleRate: number,
  numChannels: number
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = context.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);

    for (let i = 0; i < frameCount; i++) {
      // Convert int16 back to float32
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }

  return buffer;
}

/**
 * Calculate volume level from audio data
 */
export function calculateVolume(data: Float32Array): number {
  let sum = 0;

  for (let i = 0; i < data.length; i++) {
    sum += data[i] * data[i];
  }

  return Math.sqrt(sum / data.length);
}

/**
 * Create audio context with fallback
 */
export function createAudioContext(sampleRate?: number): AudioContext {
  const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  return new AudioContextClass(sampleRate ? { sampleRate } : undefined);
}
