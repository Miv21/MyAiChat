"use client";

import React, { useState, useEffect, useRef } from "react";
import { Menu, Send, Plus, X, Mic, MicOff, Loader2 } from "lucide-react";
import "./chat.css";

// --- ТИПИЗАЦИЯ SPEECH RECOGNITION ---
interface SpeechRecognitionResults {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResults;
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onstart: (event: Event) => void;
  onend: (event: Event) => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: Event) => void;
}

// Расширяем интерфейс Window без использования any
declare global {
  interface Window {
    SpeechRecognition?: {
      new (): SpeechRecognition;
    };
    webkitSpeechRecognition?: {
      new (): SpeechRecognition;
    };
  }
}

export default function Home() {
  const [messages, setMessages] = useState<{ id: number; role: "user" | "bot"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const currentInput = input;
    const userMsg = { id: Date.now(), role: "user" as const, content: currentInput };
    
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: currentInput }),
      });

      const data = await response.json();

      if (data.text) {
        setMessages((prev) => [
          ...prev,
          { id: Date.now() + 1, role: "bot" as const, content: data.text },
        ]);
      } else {
        throw new Error("Пустой ответ от API");
      }
    } catch (error) {
      console.error("Ошибка чата:", error);
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: "bot" as const, content: "Произошла ошибка при попытке связаться с ИИ." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleListening = () => {
    const RecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!RecognitionConstructor) {
      alert("Ваш браузер не поддерживает голосовой ввод.");
      return;
    }

    const recognition = new RecognitionConstructor();
    recognition.lang = "ru-RU";
    
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setInput((prev) => prev + transcript);
    };

    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  };

  return (
    <div className="flex h-screen bg-[#0a192f] overflow-hidden relative">
      <aside className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
        <div className="flex flex-col h-full p-4">
          <button className="close-sidebar-btn mb-4" onClick={() => setIsSidebarOpen(false)}>
            <X size={28} />
          </button>
          <button className="new-chat-btn" onClick={() => {setMessages([]); setIsSidebarOpen(false);}}>
            <Plus size={24} />
            <span>Новый чат</span>
          </button>
        </div>
      </aside>

      {isSidebarOpen && <div className="overlay" onClick={() => setIsSidebarOpen(false)} />}

      <div className="flex flex-col flex-1 min-w-0">
        <header className="chat-header">
          {!isSidebarOpen && (
            <button className="menu-button" onClick={() => setIsSidebarOpen(true)}>
              <Menu size={32} />
            </button>
          )}
          <h1 className="chat-title-text">Llama 3 AI Chat</h1>
        </header>

        <main className="chat-main-area">
          <div className="messages-container">
            {messages.map((msg) => (
              <div key={msg.id} className={msg.role === "user" ? "user-message-row" : "bot-message-row"}>
                <div className={msg.role === "user" ? "user-message-bubble" : "bot-text"}>
                  {msg.content}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="bot-message-row">
                <div className="bot-text flex items-center gap-2 opacity-50">
                  <Loader2 className="animate-spin" size={20} />
                  <span>ИИ печатает...</span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </main>

        <footer className="chat-input-container">
          <div className="input-relative-wrapper">
            <input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder={isLoading ? "Ожидание ответа..." : "Введите сообщение..."}
              className="chat-input-field"
              disabled={isLoading}
            />
            {input.trim() === "" && !isLoading ? (
              <button 
                onClick={toggleListening} 
                className={`mic-button-right ${isListening ? "listening" : ""}`}
              >
                {isListening ? <MicOff size={26} /> : <Mic size={26} />}
              </button>
            ) : (
              <button 
                onClick={handleSend} 
                className="send-button"
                disabled={isLoading || !input.trim()}
              >
                {isLoading ? <Loader2 className="animate-spin" size={26} /> : <Send size={26} />}
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}