import { Badge } from "@/components/ui/badge";
import { EditStatus } from "@shared/types";

interface StatusBadgeProps {
  status: EditStatus;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const getVariant = () => {
    switch (status) {
      case 'pending':
        return 'pending';
      case 'approved':
        return 'approved';
      case 'rejected':
        return 'rejected';
      case 'locked':
        return 'locked';
      default:
        return 'default';
    }
  };

  return (
    <Badge className={className} variant={getVariant()}>
      {status}
    </Badge>
  );
}
