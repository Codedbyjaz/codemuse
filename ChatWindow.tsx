import { useState, useRef, useEffect } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TeachingToggle } from "@/components/TeachingToggle";
import { useTeaching } from "@/context/TeachingContext";
import { ConceptTag } from "./ConceptTag";

type Message = {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  concepts?: string[];
  quiz?: string;
};

export function ChatWindow() {
  const { teachingMode, conceptsLearned } = useTeaching();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Welcome to CodeMuse! I'm your AI coding tutor. I see you're working on a Simple Calculator project. How can I help you today?",
      sender: 'ai'
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const handleSendMessage = () => {
    if (inputValue.trim() === "") return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: 'user'
    };
    
    setMessages([...messages, userMessage]);
    setInputValue("");
    
    // Simulate AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: teachingMode 
          ? "I notice you're asking about the calculator functions. Let me explain how they work in detail."
          : "The calculator functions use simple arithmetic operations. What would you like to know about them?",
        sender: 'ai'
      };
      
      if (teachingMode) {
        aiMessage.concepts = ['functions', 'variables', 'arithmetic'];
        aiMessage.quiz = "What would happen if you tried to call add('2', 3)? What JavaScript concept explains this behavior?";
      }
      
      setMessages(prev => [...prev, aiMessage]);
    }, 1000);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const clearChat = () => {
    setMessages([{
      id: Date.now().toString(),
      content: "Chat cleared. How can I help you with your coding today?",
      sender: 'ai'
    }]);
  };
  
  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2 flex items-center justify-between">
        <h2 className="font-medium">AI Tutor</h2>
        <div className="flex items-center">
          <div className="flex items-center mr-4">
            <span className="text-sm mr-2">Teaching Mode</span>
            <TeachingToggle />
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={clearChat}
            title="Clear chat"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4">
        {messages.map((message) => (
          <div 
            key={message.id} 
            className={`message p-3 rounded-lg ${
              message.sender === 'ai' 
                ? 'ai-message bg-gray-100 dark:bg-gray-800 border-l-4 border-blue-500' 
                : 'user-message bg-blue-50 dark:bg-gray-700 border-l-4 border-green-500'
            }`}
          >
            <div className="flex items-start">
              <div className={`mr-2 h-8 w-8 rounded-full flex items-center justify-center text-white ${
                message.sender === 'ai' ? 'bg-blue-500' : 'bg-green-500'
              }`}>
                {message.sender === 'ai' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M14.243 5.757a6 6 0 10-.986 9.284 1 1 0 111.087 1.678A8 8 0 1118 10a3 3 0 01-4.8 2.401A4 4 0 1114 10a1 1 0 102 0c0-1.537-.586-3.07-1.757-4.243zM12 10a2 2 0 10-4 0 2 2 0 004 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <span>J</span>
                )}
              </div>
              <div className="flex-1">
                <p className="mb-2 whitespace-pre-wrap">{message.content}</p>
                
                {message.concepts && message.concepts.length > 0 && (
                  <div className="my-3 p-2 bg-gray-100 dark:bg-gray-800 rounded">
                    <p className="text-sm font-medium mb-1">Key concepts used:</p>
                    <div className="flex flex-wrap gap-2">
                      {message.concepts.map((concept) => (
                        <ConceptTag key={concept} concept={concept} />
                      ))}
                    </div>
                  </div>
                )}
                
                {message.quiz && (
                  <div className="my-3 border-l-2 border-purple-400 pl-3">
                    <p className="text-sm font-medium text-purple-600 dark:text-purple-400 mb-1">Quick Quiz:</p>
                    <p className="text-sm">{message.quiz}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="relative">
          <Textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about your code..."
            className="min-h-[80px] pr-10"
          />
          <Button
            className="absolute right-2 bottom-2 text-blue-500 hover:text-blue-600 p-1"
            variant="ghost"
            size="icon"
            onClick={handleSendMessage}
            disabled={inputValue.trim() === ""}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ChatWindow;
