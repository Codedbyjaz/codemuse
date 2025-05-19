import { useState, useEffect } from "react";
import { Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCodeEditor } from "@/hooks/useCodeEditor";

type ConsoleEntry = {
  id: string;
  type: 'log' | 'error' | 'warning' | 'result';
  content: string;
};

export function OutputConsole() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { consoleOutput, clearConsole } = useCodeEditor();
  
  const toggleConsole = () => {
    setIsCollapsed(!isCollapsed);
    localStorage.setItem('consoleCollapsed', String(!isCollapsed));
  };
  
  useEffect(() => {
    const savedState = localStorage.getItem('consoleCollapsed');
    if (savedState === 'true') {
      setIsCollapsed(true);
    }
  }, []);

  return (
    <div className={`border-t border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden transition-all duration-200 ${
      isCollapsed ? 'h-[32px]' : 'h-[200px]'
    }`}>
      <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-1 flex items-center justify-between">
        <h2 className="font-medium">Console Output</h2>
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={clearConsole}
            title="Clear console"
            className="h-8 w-8"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleConsole}
            title={isCollapsed ? "Expand console" : "Collapse console"}
            className="h-8 w-8"
          >
            {isCollapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      
      {!isCollapsed && (
        <div className="flex-1 bg-gray-50 dark:bg-gray-900 font-mono text-sm overflow-y-auto p-4 space-y-1">
          {consoleOutput.length === 0 ? (
            <div className="text-gray-400 dark:text-gray-500 italic">Console is empty. Run your code to see output.</div>
          ) : (
            consoleOutput.map((entry) => (
              <div 
                key={entry.id} 
                className={`console-line ${
                  entry.type === 'error' 
                    ? 'console-error text-red-500' 
                    : entry.type === 'warning'
                      ? 'console-warning text-amber-500'
                      : entry.type === 'result'
                        ? 'font-semibold'
                        : 'console-log text-gray-600 dark:text-gray-400'
                }`}
              >
                {entry.type === 'log' && '> '}
                {entry.content}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default OutputConsole;
