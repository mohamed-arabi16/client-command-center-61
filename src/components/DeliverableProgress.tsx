import { Deliverable } from "@/types/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface DeliverableProgressProps {
  deliverables: Deliverable[];
}

export const DeliverableProgress = ({ deliverables }: DeliverableProgressProps) => {
  if (deliverables.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No deliverables yet. Add deliverables to track progress.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {deliverables.map((deliverable) => {
        const percentage = (deliverable.completed / deliverable.total) * 100;
        const isComplete = deliverable.completed === deliverable.total;
        
        return (
          <div key={deliverable.id} className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-card-foreground">
                {deliverable.type}
              </span>
              <span className="text-sm text-muted-foreground">
                {deliverable.completed}/{deliverable.total}
              </span>
            </div>
            <Progress 
              value={percentage} 
              className="h-2"
            />
            {isComplete && (
              <p className="text-xs text-success">✓ Completed</p>
            )}
          </div>
        );
      })}
    </div>
  );
};
