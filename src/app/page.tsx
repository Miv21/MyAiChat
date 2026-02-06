"use client";

import { useEffect, useRef, useState, ReactNode } from "react"; 
import ReactMarkdown from "react-markdown";
import { Menu, Send, Plus, Loader2, X, StopCircle, Mic } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils"
import { useChat, Message } from "@ai-sdk/react";

// --- ТИПИЗАЦИЯ SPEECH API ---
interface SpeechRecognitionEvent extends Event {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start:() => void;
  stop:() => void;
  onstart:() => void;
  onend:() => void;
  onresult:(event: SpeechRecognitionEvent) => void;
  onerror:(event: Event) => void;
}

interface IWindow extends Window {
  webkitSpeechRecognition: {
    new (): SpeechRecognition;
  };
}

export default function Home() {
  const { messages,input,handleInputChange,handleSubmit,setMessages,status,setInput,stop } = useChat({
    api: '/api/chat',
    onResponse:() => setIsThinking(false),
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Реф для хранения экземпляра распознавания
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const STOP_MARKER = "___STOPPED_BY_USER___";

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  //функция: включает и выключает запись
  const toggleSpeechRecognition = () => {
    const win = window as unknown as IWindow;
    
    // Если уже записываем — останавливаем
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const Recognition = win.webkitSpeechRecognition;
    if (Recognition) {
      const recognition = new Recognition();
      recognition.lang = 'ru-RU';
      recognition.continuous = false; // Остановится сам, когда закончите говорить
      
      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;
      };
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
      };
      recognition.onerror = () => {
        setIsListening(false);
        recognitionRef.current = null;
      };

      recognitionRef.current = recognition;
      recognition.start();
    }
  };

  const handleStopEverything = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    stop();
    setIsThinking(false);
    setMessages(prev => {
      const newMessages = [...prev];
      if (newMessages.length > 0) {
        const lastMsg = newMessages[newMessages.length - 1];
        if (lastMsg.role === 'assistant') {
          lastMsg.content = lastMsg.content + STOP_MARKER;
        } else if (lastMsg.role === 'user') {
          newMessages.push({
            id: Date.now().toString(),
            role: 'assistant',
            content: STOP_MARKER
          });
        }
      }
      return newMessages;
    });
  };

  const handleDelayedSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isAIBusy) return;
    setIsThinking(true);
    setInput(""); 
    const tempUserId = Date.now().toString();
    setMessages(prev => [...prev, { id: tempUserId, role: 'user', content: input }]);
    timeoutRef.current = setTimeout(() => {
      setMessages(prev => prev.filter(m => m.id !== tempUserId));
      handleSubmit(e); 
      timeoutRef.current = null;
    }, 2000);
  };

  const isAIBusy = status === 'submitted' || isThinking;

  return (
    <div className="flex h-screen w-full bg-[#0E132C] text-slate-200 overflow-hidden relative">
      
      {/* --- САЙДБАР --- */}
      <aside className={cn(
        "fixed left-0 top-0 h-full w-[300px] bg-[#0A1025] border-r border-white/5 z-[60] transition-transform duration-300 ease-in-out shadow-2xl flex flex-col",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-[80px] flex items-center px-6 shrink-0">
          <button 
            onClick={() => setIsSidebarOpen(false)} 
            className="flex items-center justify-center w-10 h-10 text-slate-400 hover:text-white rounded-xl bg-transparent hover:bg-white/5 active:bg-white/10 transition-all outline-none"
          >
            <div className="w-4 h-4 flex items-center justify-center shrink-0">
              <X strokeWidth={1.5} />
            </div>
          </button>
        </div>
        
        <div className="px-2 py-2 flex-1">
          <button onClick={() => { setMessages([]); setIsSidebarOpen(false); }} className="flex items-center gap-3 w-full h-[40px] px-4 bg-transparent hover:bg-white/5 active:bg-white/10 transition-all rounded-xl group outline-none">
            <div className="w-4 h-4 flex items-center justify-center shrink-0">
              <Plus strokeWidth={1} className="text-slate-200 opacity-80" />
            </div>
            <span className="font-medium text-slate-200 text-sm whitespace-nowrap">Новый чат</span>
          </button>
        </div>
      </aside>

      {isSidebarOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[50]" onClick={() => setIsSidebarOpen(false)} />}

      <main className="flex flex-col flex-1 h-full w-full relative items-center">
        <header className="h-[80px] shrink-0 flex items-center justify-between w-full px-6 bg-[#0E132C]/80 backdrop-blur-xl z-10">
          <button 
            onClick={() => setIsSidebarOpen(true)} 
            className={cn(
              "flex items-center justify-center w-10 h-10 text-slate-400 hover:text-white transition-all rounded-xl bg-transparent hover:bg-white/5 active:bg-white/10 outline-none", 
              isSidebarOpen && "opacity-0 pointer-events-none"
            )}
          >
            <div className="w-4 h-4 flex items-center justify-center shrink-0">
              <Menu strokeWidth={1.5} />
            </div>
          </button>
          <h1 className="text-xl font-bold tracking-[0.4em] uppercase text-blue-100 italic absolute left-1/2 -translate-x-1/2">Llama 3.1</h1>
          <div className="w-10" /> 
        </header>

        <ScrollArea className="flex-1 w-full overflow-y-auto overflow-x-hidden">
          <div className="max-w-[850px] mx-auto px-6 flex flex-col gap-10 py-12">
            {messages.map((m: Message, index) => (
              <div key={m.id || index} className={cn("flex flex-col w-full animate-in fade-in slide-in-from-bottom-2 duration-700", m.role === "user" ? "items-end" : "items-start")}>
                {m.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-2 ml-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                    <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Elite Intelligence</span>
                  </div>
                )}
                <div className={cn("max-w-[85%] px-6 py-4", m.role === "user" ? "bg-[#1E293B] text-white rounded-[24px] rounded-tr-[4px] shadow-xl" : "bg-transparent text-slate-100")}>
                  <div className="prose prose-invert prose-lg max-w-none break-words text-slate-100 leading-relaxed">
                    <ReactMarkdown components={{ p: ({children}: {children: ReactNode}) => <p className="mb-0 last:mb-0 inline-block w-full">{children}</p> }}>
                      {m.content.replace(STOP_MARKER, "")}
                    </ReactMarkdown>
                  </div>
                  {m.content.includes(STOP_MARKER) && (
                    <div className="flex items-center gap-2 text-red-400/40 text-[10px] font-medium uppercase tracking-widest mt-4 pt-4 border-t border-white/5">
                      <div className="w-5 h-5 flex items-center justify-center shrink-0">
                        <StopCircle strokeWidth={1.5} />
                      </div> 
                      Вы остановили генерацию ответа
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isThinking && (
              <div className="ml-6 text-sm text-blue-300 animate-pulse flex items-center gap-2">
                <Loader2 className="animate-spin" size={14} /> 
                Анализирую...
              </div>
            )}
            <div ref={scrollRef} className="h-32" />
          </div>
        </ScrollArea>

        <footer className="w-full shrink-0 flex justify-center px-6 pb-10 pt-32 bg-gradient-to-t from-[#0a192f] via-[#0a192f] via-40% to-transparent z-20 -mt-32 pointer-events-none">
          <form onSubmit={handleDelayedSubmit} className="w-full max-w-[800px] relative group pointer-events-auto">
            <div className="relative flex items-center">
              <Input 
                value={input} 
                onChange={handleInputChange}
                disabled={isAIBusy}
                className="w-full h-[75px] bg-[#112240] border border-white/10 rounded-[28px] px-8 pr-20 text-lg text-white shadow-2xl focus-visible:ring-2 focus-visible:ring-blue-500/50 outline-none placeholder:text-slate-600 transition-all disabled:opacity-50"
                placeholder={isAIBusy ? "Llama думает..." : "Спросите о чем угодно..."}
              />
              <div className="absolute right-4 flex items-center justify-center w-12 h-12">
                {isAIBusy ? (
                  <button type="button" onClick={handleStopEverything} className="flex items-center justify-center w-10 h-10 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl active:scale-95 transition-all">
                    <div className="w-5 h-5 flex items-center justify-center shrink-0">
                      <StopCircle strokeWidth={1.5} />
                    </div>
                  </button>
                ) : input.trim().length > 0 ? (
                  <button type="submit" className="flex items-center justify-center w-10 h-10 text-blue-400 hover:bg-white/5 active:bg-white/10 rounded-xl active:scale-95 transition-all">
                    <div className="w-5 h-5 flex items-center justify-center shrink-0">
                      <Send strokeWidth={1.5} />
                    </div>
                  </button>
                ) : (
                  <button 
                    type="button" 
                    onClick={toggleSpeechRecognition} 
                    className="relative flex items-center justify-center w-10 h-10 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 active:bg-white/10 active:scale-95 transition-all"
                  >
                    {isListening && (
                      <div className="absolute inset-0 rounded-xl bg-red-500/20 animate-ping" />
                    )}
                    <div className={cn("w-5 h-5 flex items-center justify-center shrink-0 z-10", isListening && "text-red-400 animate-pulse")}>
                      <Mic strokeWidth={1.5} />
                    </div>
                  </button>
                )}
              </div>
            </div>
          </form>
        </footer>
      </main>
    </div>
  );
}