import { useRef, useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { CodeEditor } from "@/components/CodeEditor";
import { ChatWindow } from "@/components/ChatWindow";
import { OutputConsole } from "@/components/OutputConsole";
import { ConceptsModal } from "@/components/ConceptsModal";
import { useLocalStorage } from "@/hooks/useLocalStorage";

export function MainLayout() {
  const [isResizing, setIsResizing] = useState(false);
  const [editorWidth, setEditorWidth] = useLocalStorage('editorWidth', '60%');
  const containerRef = useRef<HTMLDivElement>(null);
  const resizerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const newEditorWidth = ((e.clientX - containerRect.left) / containerWidth) * 100;
      
      // Ensure minimum widths (20% for editor, 20% for chat)
      if (newEditorWidth < 20 || newEditorWidth > 80) return;
      
      setEditorWidth(`${newEditorWidth}%`);
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };
    
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, setEditorWidth]);
  
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };
  
  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <Header />
      
      <div className="flex-1 flex overflow-hidden" ref={containerRef}>
        <div
          className="flex-1 overflow-hidden"
          style={{ width: editorWidth }}
        >
          <CodeEditor />
        </div>
        
        <div 
          ref={resizerRef}
          className={`resizer ${isResizing ? 'active' : ''}`}
          onMouseDown={handleMouseDown}
        />
        
        <div
          className="flex flex-col overflow-hidden border-l border-gray-200 dark:border-gray-700"
          style={{ width: `calc(100% - ${editorWidth})` }}
        >
          <ChatWindow />
        </div>
      </div>
      
      <OutputConsole />
      <ConceptsModal />
    </div>
  );
}

export default MainLayout;
