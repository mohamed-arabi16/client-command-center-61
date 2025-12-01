import { ActivityItem } from "@/types/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

interface ActivityLogProps {
  activities: ActivityItem[];
}

export const ActivityLog = ({ activities }: ActivityLogProps) => {
  if (activities.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No activity yet. Log your first activity to start tracking progress.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className="flex gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
        >
          <div className="mt-0.5">
            <CheckCircle2 className="h-5 w-5 text-success" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-card-foreground">
              {activity.description}
            </p>
            <div className="flex items-center gap-2 mt-1">
              {activity.deliverable_type && (
                <span className="text-xs text-primary font-medium">
                  {activity.deliverable_type}
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                {new Date(activity.date).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
