import React, { useEffect, useRef, useState } from 'react';
import { Mic, Send, User, Bot, Loader2 } from 'lucide-react';
import { createChatSession } from '../services/gemini';
import { blobToBase64 } from '../utils/audio';
import { Chat } from '@google/genai';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  isAudio?: boolean;
}

const LiveChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'model', text: "Hi! I'm MakanMate. I can help you find the best food in Malaysia. What are you craving today?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  const chatSessionRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    chatSessionRef.current = createChatSession();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (text?: string, audioBase64?: string) => {
    if (!chatSessionRef.current) return;
    if (!text && !audioBase64) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: text || "Audio Message",
      isAudio: !!audioBase64
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      let response;
      if (audioBase64) {
        response = await chatSessionRef.current.sendMessage({
            message: {
                role: 'user',
                parts: [
                    { inlineData: { mimeType: 'audio/webm', data: audioBase64 } }
                ]
            }
        });
      } else {
        response = await chatSessionRef.current.sendMessage({ message: text! });
      }

      const modelMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response.text || "I didn't catch that, could you try again?"
      };

      setMessages(prev => [...prev, modelMessage]);
    } catch (error) {
      console.error("Chat Error:", error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "Sorry, I'm having trouble connecting right now."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const base64 = await blobToBase64(audioBlob);
        handleSendMessage(undefined, base64);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Mic Error:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex max-w-[85%] gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.role === 'user' ? 'bg-orange-500 text-white' : 'bg-stone-200 text-stone-600'
              }`}>
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              
              <div className={`p-3 rounded-2xl shadow-sm text-sm ${
                msg.role === 'user' 
                  ? 'bg-orange-500 text-white rounded-tr-none' 
                  : 'bg-white text-stone-800 border border-stone-100 rounded-tl-none'
              }`}>
                {msg.isAudio ? (
                  <div className="flex items-center gap-2 italic opacity-90">
                    <Mic size={14} />
                    <span>Audio Message</span>
                  </div>
                ) : (
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
             <div className="flex gap-2">
                <div className="w-8 h-8 rounded-full bg-stone-200 text-stone-600 flex items-center justify-center">
                    <Bot size={16} />
                </div>
                <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-stone-100 flex items-center">
                   <Loader2 size={16} className="animate-spin text-orange-500" />
                </div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-stone-100">
        <div className="flex items-center gap-2 max-w-screen-xl mx-auto">
          <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            className={`p-3 rounded-full transition-all duration-200 flex-shrink-0 ${
              isRecording 
                ? 'bg-red-500 text-white shadow-lg scale-110' 
                : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
            }`}
          >
            <Mic size={20} className={isRecording ? 'animate-pulse' : ''} />
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(input)}
            placeholder="Ask about Malaysian food..."
            className="flex-1 bg-stone-100 border-0 rounded-full py-3 px-4 text-stone-800 placeholder-stone-400 focus:ring-2 focus:ring-orange-200 focus:bg-white transition-all outline-none"
            disabled={isRecording || isLoading}
          />

          <button
            onClick={() => handleSendMessage(input)}
            disabled={!input.trim() || isLoading || isRecording}
            className={`p-3 rounded-full transition-all duration-200 flex-shrink-0 ${
              input.trim() && !isLoading
                ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-md'
                : 'bg-stone-100 text-stone-300 cursor-not-allowed'
            }`}
          >
            <Send size={20} />
          </button>
        </div>
        <p className="text-center text-[10px] text-stone-400 mt-2">
          {isRecording ? "Release to send" : "Hold mic to speak"}
        </p>
      </div>
    </div>
  );
};

export default LiveChat;