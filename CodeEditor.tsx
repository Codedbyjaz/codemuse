import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/context/ThemeContext";
import { useProject } from "@/context/ProjectContext";
import { useCodeEditor } from "@/hooks/useCodeEditor";
import monaco from "@/lib/monaco-config";

export function CodeEditor() {
  const editorRef = useRef<HTMLDivElement>(null);
  const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const { theme } = useTheme();
  const { currentProject } = useProject();
  const { activeLanguage, setActiveLanguage, runCode } = useCodeEditor();
  
  useEffect(() => {
    if (editorRef.current && !editor) {
      const monacoEditor = monaco.editor.create(editorRef.current, {
        value: currentProject?.startingCode?.js || "// Start coding here",
        language: "javascript",
        theme: theme === "dark" ? "vs-dark" : "vs",
        automaticLayout: true,
        fontSize: 14,
        minimap: {
          enabled: false
        },
        scrollBeyondLastLine: false,
        lineNumbers: "on",
        scrollbar: {
          verticalScrollbarSize: 10,
          horizontalScrollbarSize: 10
        },
        fontFamily: "'Fira Code', monospace",
      });
      
      setEditor(monacoEditor);
      
      return () => {
        monacoEditor.dispose();
      };
    }
    
    return undefined;
  }, []);
  
  useEffect(() => {
    if (editor) {
      monaco.editor.setTheme(theme === "dark" ? "vs-dark" : "vs");
    }
  }, [theme, editor]);
  
  useEffect(() => {
    if (editor && currentProject) {
      const code = currentProject.startingCode[activeLanguage as keyof typeof currentProject.startingCode] || "";
      editor.setValue(code);
      monaco.editor.setModelLanguage(editor.getModel()!, activeLanguage);
    }
  }, [currentProject, activeLanguage, editor]);
  
  const handleLanguageChange = (language: string) => {
    setActiveLanguage(language);
  };
  
  const handleRunCode = () => {
    if (editor) {
      const code = editor.getValue();
      runCode(code, activeLanguage);
    }
  };
  
  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2 flex items-center justify-between">
        <div className="flex space-x-2">
          <Button
            variant={activeLanguage === "html" ? "secondary" : "outline"}
            size="sm"
            onClick={() => handleLanguageChange("html")}
          >
            HTML
          </Button>
          <Button
            variant={activeLanguage === "js" ? "secondary" : "outline"}
            size="sm"
            onClick={() => handleLanguageChange("js")}
          >
            JavaScript
          </Button>
          <Button
            variant={activeLanguage === "css" ? "secondary" : "outline"}
            size="sm"
            onClick={() => handleLanguageChange("css")}
          >
            CSS
          </Button>
        </div>
        <Button 
          variant="default" 
          size="sm"
          className="bg-green-500 hover:bg-green-600 text-white flex items-center gap-1"
          onClick={handleRunCode}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
          </svg>
          <span>Run</span>
        </Button>
      </div>
      <div 
        ref={editorRef} 
        className="flex-1 overflow-auto editor-container"
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
