import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ConceptTag } from "./ConceptTag";
import { useTeaching } from "@/context/TeachingContext";

export function ConceptsModal() {
  const [isOpen, setIsOpen] = useState(false);
  const { conceptsLearned } = useTeaching();
  
  // Add a keyboard shortcut (Alt+C) to open the concepts modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'c') {
        setIsOpen(true);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
  
  const conceptCategories = {
    'JavaScript Fundamentals': [
      'variables', 'functions', 'arithmetic', 'console.log', 'type coercion'
    ],
    'Control Flow': [
      'conditionals', 'loops', 'switch statements'
    ],
    'Data Structures': [
      'arrays', 'objects', 'maps'
    ]
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Concepts Learned</DialogTitle>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          {Object.entries(conceptCategories).map(([category, concepts]) => (
            <div key={category}>
              <h3 className="font-medium text-lg mb-2">{category}</h3>
              <div className="flex flex-wrap gap-2">
                {concepts.map((concept) => (
                  <ConceptTag 
                    key={concept} 
                    concept={concept}
                    learned={conceptsLearned.includes(concept)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
        
        <DialogFooter>
          <Button onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}



export default ConceptsModal;
