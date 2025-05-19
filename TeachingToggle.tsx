import { useTeaching } from "@/context/TeachingContext";
import { Switch } from "@/components/ui/switch";

export function TeachingToggle() {
  const { teachingMode, toggleTeachingMode } = useTeaching();
  
  return (
    <Switch
      checked={teachingMode}
      onCheckedChange={toggleTeachingMode}
      className={`${
        teachingMode ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-700'
      }`}
    />
  );
}
