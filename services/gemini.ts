import { GoogleGenAI, LiveServerMessage, Modality, Chat } from "@google/genai";
import { Coordinates, SearchResult } from "../types";
import { createPcmBlob, decodeAudioData, base64ToUint8Array } from "../utils/audio";

const API_KEY = process.env.API_KEY || '';

if (!API_KEY) {
  console.error("API_KEY is missing from environment variables.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

// --- CHAT BOT MODE (Gemini 3 Pro) ---

export const createChatSession = (): Chat => {
  return ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: {
      systemInstruction: "You are MakanMate, a helpful, enthusiastic, and knowledgeable Malaysian food guide. You help people decide what to eat. You know about local Malaysian dishes like Nasi Lemak, Laksa, Roti Canai, Satay, etc. Keep responses concise and conversational.",
    }
  });
};

// --- FINDER MODE (GenerateContent with Maps) ---

export const searchRestaurants = async (
  prompt: string,
  audioBase64: string | null,
  location: Coordinates | null
): Promise<SearchResult> => {
  try {
    const model = 'gemini-2.5-flash';
    
    const parts: any[] = [];
    
    // Add Audio Part if available
    if (audioBase64) {
      parts.push({
        inlineData: {
          mimeType: 'audio/wav', // Assumed recorded format, usually audio/webm or wav depending on recorder
          data: audioBase64
        }
      });
      parts.push({
        text: "The user has provided audio input. Listen to it to understand their request for food or restaurants. " + prompt
      });
    } else {
      parts.push({ text: prompt });
    }

    const toolConfig: any = {};
    if (location) {
      toolConfig.retrievalConfig = {
        latLng: {
          latitude: location.latitude,
          longitude: location.longitude
        }
      };
    }

    const response = await ai.models.generateContent({
      model,
      contents: { parts },
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: location ? toolConfig : undefined,
      }
    });

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const text = response.text || "I couldn't find any specific places matching your request.";

    return { text, groundingChunks };

  } catch (error) {
    console.error("Gemini Search Error:", error);
    throw error;
  }
};

// --- LIVE MODE (Native Audio) ---

export class LiveSessionManager {
  private sessionPromise: Promise<any> | null = null;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private nextStartTime = 0;
  private sources = new Set<AudioBufferSourceNode>();
  
  constructor(
    private onMessage: (text: string) => void,
    private onStatusChange: (status: 'connected' | 'disconnected' | 'error') => void
  ) {}

  async connect() {
    try {
      this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      this.sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            this.onStatusChange('connected');
            this.startAudioStream(stream);
          },
          onmessage: (msg: LiveServerMessage) => this.handleMessage(msg),
          onclose: () => this.onStatusChange('disconnected'),
          onerror: (err) => {
            console.error(err);
            this.onStatusChange('error');
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
          },
          systemInstruction: "You are MakanMate, a helpful, enthusiastic, and knowledgeable Malaysian food guide. You help people decide what to eat. You know about local Malaysian dishes like Nasi Lemak, Laksa, Roti Canai, Satay, etc. Keep responses concise and conversational.",
        }
      });

    } catch (error) {
      console.error("Live Connection Error:", error);
      this.onStatusChange('error');
    }
  }

  private startAudioStream(stream: MediaStream) {
    if (!this.inputAudioContext) return;
    
    const source = this.inputAudioContext.createMediaStreamSource(stream);
    const scriptProcessor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);
    
    scriptProcessor.onaudioprocess = (e) => {
      if (!this.sessionPromise) return;
      const inputData = e.inputBuffer.getChannelData(0);
      const pcmBlob = createPcmBlob(inputData);
      
      this.sessionPromise.then(session => {
        session.sendRealtimeInput({ media: pcmBlob });
      });
    };

    source.connect(scriptProcessor);
    scriptProcessor.connect(this.inputAudioContext.destination);
  }

  private async handleMessage(message: LiveServerMessage) {
    // Handle Audio
    const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
    if (base64Audio && this.outputAudioContext) {
      try {
        this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
        const audioBuffer = await decodeAudioData(
          base64ToUint8Array(base64Audio),
          this.outputAudioContext,
          24000
        );
        
        const source = this.outputAudioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.outputAudioContext.destination);
        
        source.addEventListener('ended', () => {
          this.sources.delete(source);
        });

        source.start(this.nextStartTime);
        this.nextStartTime += audioBuffer.duration;
        this.sources.add(source);
      } catch (err) {
        console.error("Audio Decode Error", err);
      }
    }

    // Handle Interruption
    if (message.serverContent?.interrupted) {
      this.sources.forEach(source => source.stop());
      this.sources.clear();
      this.nextStartTime = 0;
    }
  }

  disconnect() {
    // Note: No explicit disconnect method on session promise result yet in provided docs, 
    // but typically we close contexts.
    this.sources.forEach(s => s.stop());
    this.inputAudioContext?.close();
    this.outputAudioContext?.close();
    this.sessionPromise = null;
    this.onStatusChange('disconnected');
  }
}