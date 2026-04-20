import React from 'react';
import { Message } from '../types';
import { User, Bot, AlertCircle } from 'lucide-react';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const isError = message.isError;

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[85%] md:max-w-[70%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start gap-3`}>
        
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? 'bg-indigo-600 text-white' : isError ? 'bg-red-100 text-red-600' : 'bg-emerald-600 text-white'
        }`}>
          {isUser ? <User size={16} /> : isError ? <AlertCircle size={16} /> : <Bot size={16} />}
        </div>

        {/* Bubble */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
            isUser 
              ? 'bg-indigo-600 text-white rounded-tr-none' 
              : isError
                ? 'bg-red-50 text-red-800 border border-red-100 rounded-tl-none'
                : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
          }`}>
            <p className="whitespace-pre-wrap">{message.text}</p>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 px-1">
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
};