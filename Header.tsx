import { Sun, Moon, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme } from "@/context/ThemeContext";
import { useProject } from "@/context/ProjectContext";
import { starterProjects } from "@/data/projects";

export function Header() {
  const { theme, toggleTheme } = useTheme();
  const { 
    currentProject, 
    setCurrentProject, 
    createNewProject, 
    selectedChallenge, 
    setSelectedChallenge 
  } = useProject();

  const handleNewProject = () => {
    createNewProject();
  };

  const challenges = [
    "Basic - Variables",
    "Loops and Arrays",
    "DOM Manipulation",
    "API Integration"
  ];

  return (
    <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400">CodeMuse</h1>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600 dark:text-gray-300">Project:</span>
          <Select 
            value={currentProject?.id} 
            onValueChange={(value) => {
              const project = starterProjects.find(p => p.id === value);
              if (project) {
                setCurrentProject(project);
              }
            }}
          >
            <SelectTrigger className="w-[180px] h-8 text-sm">
              <SelectValue placeholder="Select a project" />
            </SelectTrigger>
            <SelectContent>
              {starterProjects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button 
          size="sm" 
          className="text-sm flex items-center space-x-1"
          onClick={handleNewProject}
        >
          <PlusCircle className="h-4 w-4" />
          <span>New Project</span>
        </Button>
      </div>
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600 dark:text-gray-300">Challenge:</span>
          <Select 
            value={selectedChallenge}
            onValueChange={setSelectedChallenge}
          >
            <SelectTrigger className="w-[180px] h-8 text-sm">
              <SelectValue placeholder="Select a challenge" />
            </SelectTrigger>
            <SelectContent>
              {challenges.map((challenge) => (
                <SelectItem key={challenge} value={challenge}>
                  {challenge}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={toggleTheme}
          title="Toggle dark mode"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
        <div className="relative flex items-center">
          <span className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
            J
          </span>
        </div>
      </div>
    </header>
  );
}
