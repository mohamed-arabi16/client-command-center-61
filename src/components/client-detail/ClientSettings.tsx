import { Client } from "@/types/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Trash2, Share2, Edit } from "lucide-react";

interface ClientSettingsProps {
  client: Client;
  clientId: string;
  onEdit: () => void;
  onDelete: () => void;
  onShare: () => void;
}

export const ClientSettings = ({
  client,
  clientId,
  onEdit,
  onDelete,
  onShare,
}: ClientSettingsProps) => {
  return (
    <div className="space-y-6">
      {/* Client Management */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Client Management
          </CardTitle>
          <CardDescription>
            Update client information and settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={onEdit} variant="outline" className="w-full justify-start">
            <Edit className="h-4 w-4 mr-2" />
            Edit Client Details
          </Button>
          <Button onClick={onShare} variant="outline" className="w-full justify-start">
            <Share2 className="h-4 w-4 mr-2" />
            Generate Shareable Link
          </Button>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible actions - proceed with caution
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={onDelete}
            variant="destructive"
            className="w-full"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Client
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            This will permanently delete the client and all associated data including
            deliverables, activities, and tasks.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
