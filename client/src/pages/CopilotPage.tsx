import React, { useState } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  Shield,
  HelpCircle,
  CheckCircle2,
  Cpu,
  User as UserIcon,
} from 'lucide-react';
import { useTrip } from '../context/TripContext.js';
import { api } from '../services/api.js';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  source?: 'GEMINI_AI' | 'DETERMINISTIC_FALLBACK';
  timestamp: string;
}

export const CopilotPage: React.FC = () => {
  const { activeTrip } = useTrip();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hello! I am **TripGuard Copilot**, your travel budget recovery advisor. 

I have full access to your authoritative financial forecast and deterministic recovery alternatives. Ask me why your trip is over budget, compare your recovery strategies, or explore specific accommodation and transit replacements!`,
      source: 'DETERMINISTIC_FALLBACK',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const suggestedQuestions = [
    'Why is my trip over budget?',
    'Compare my recovery strategies',
    'Explain the recommended hotel replacement',
    'How does transport optimization save money?',
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputMessage;
    if (!query.trim() || !activeTrip || isSending) return;

    const userMsg: Message = {
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsSending(true);

    try {
      const res = await api.askCopilot(activeTrip._id, query);
      const assistantMsg: Message = {
        role: 'assistant',
        content: res.response.answer,
        source: res.response.source,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Unable to complete query: ${err.message}`,
          source: 'DETERMINISTIC_FALLBACK',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  if (!activeTrip) {
    return <div className="p-8 text-center text-slate-500">Please select a trip first.</div>;
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col bg-white rounded-2xl border border-[#E5EAF0] shadow-xs overflow-hidden">
      {/* Top Header */}
      <div className="px-6 py-4 border-b border-[#E5EAF0] bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[#172033]">TripGuard Copilot</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                Ground Truth Anchored
              </span>
            </div>
            <p className="text-[11px] text-[#64748B]">
              Active Trip Context: <strong className="text-slate-800">{activeTrip.name}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Cpu className="w-3.5 h-3.5 text-emerald-600" />
          <span>Deterministic Fallback Always Available</span>
        </div>
      </div>

      {/* Suggested Questions */}
      <div className="px-6 py-2.5 bg-slate-50/50 border-b border-[#E5EAF0] flex items-center gap-2 overflow-x-auto">
        <span className="text-[10px] font-bold uppercase text-slate-400 shrink-0">Suggestions:</span>
        {suggestedQuestions.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(q)}
            className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition-colors whitespace-nowrap shadow-2xs"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-2xl rounded-2xl p-4 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-50 text-[#172033] border border-[#E5EAF0] shadow-2xs'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>

              <div
                className={`mt-2 text-[10px] flex items-center justify-between ${
                  msg.role === 'user' ? 'text-emerald-100' : 'text-slate-400'
                }`}
              >
                <span>{msg.timestamp}</span>
                {msg.source && (
                  <span className="font-mono">
                    {msg.source === 'GEMINI_AI' ? '⚡ Gemini 2.5' : '🛡️ Deterministic Engine'}
                  </span>
                )}
              </div>
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs font-bold text-xs">
                <UserIcon className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Chat Input Bar */}
      <div className="p-4 border-t border-[#E5EAF0] bg-slate-50/50">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ask Copilot about your budget, recovery plans, or trade-offs..."
            className="flex-1 text-xs px-4 py-3 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-xs"
          />
          <button
            type="submit"
            disabled={isSending || !inputMessage.trim()}
            className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" /> Send
          </button>
        </form>
      </div>
    </div>
  );
};
