import { ActivityItem } from "@/types/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityLog } from "@/components/ActivityLog";
import { AddActivityDialog } from "@/components/AddActivityDialog";
import { Activity } from "lucide-react";

interface ClientActivityProps {
  activities: ActivityItem[];
  clientId: string;
  onActivityAdded: () => void;
}

export const ClientActivity = ({
  activities,
  clientId,
  onActivityAdded,
}: ClientActivityProps) => {
  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Activity Log
          </CardTitle>
          <AddActivityDialog clientId={clientId} onActivityAdded={onActivityAdded} />
        </div>
      </CardHeader>
      <CardContent>
        <ActivityLog activities={activities} />
      </CardContent>
    </Card>
  );
};
