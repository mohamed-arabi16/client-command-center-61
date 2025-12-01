import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Sparkles, Video, Type, Calendar, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";

interface AITool {
  name: string;
  category: string;
  description: string;
  timeSaving: string;
  icon: any;
}

const aiTools: AITool[] = [
  {
    name: "Opus Clip",
    category: "Video Repurposing",
    description: "AI-powered video clipping and editing for short-form content",
    timeSaving: "Reduces 1.5 hours to 15 minutes per video",
    icon: Video
  },
  {
    name: "Pictory",
    category: "Video Repurposing",
    description: "Transform long-form videos into engaging short clips",
    timeSaving: "Saves 80% editing time",
    icon: Video
  },
  {
    name: "Descript",
    category: "Video Repurposing",
    description: "Edit videos by editing text transcripts",
    timeSaving: "5x faster than traditional editing",
    icon: Video
  },
  {
    name: "Rytr",
    category: "Caption Writing",
    description: "AI writing assistant for social media captions",
    timeSaving: "30 minutes to 5 minutes per caption",
    icon: Type
  },
  {
    name: "Copy.ai",
    category: "Caption Writing",
    description: "Generate high-converting social media copy",
    timeSaving: "85% time reduction",
    icon: Type
  },
  {
    name: "Buffer AI",
    category: "Scheduling",
    description: "AI-powered content scheduling and optimization",
    timeSaving: "Automates 60% of scheduling tasks",
    icon: Calendar
  },
  {
    name: "SocialBee",
    category: "Scheduling",
    description: "Smart social media scheduling with AI",
    timeSaving: "1 hour to 15 minutes weekly",
    icon: Calendar
  },
  {
    name: "Hootsuite AI",
    category: "Scheduling",
    description: "AI-enhanced social media management",
    timeSaving: "Reduces scheduling time by 70%",
    icon: Calendar
  },
  {
    name: "Jasper",
    category: "Content Ideation",
    description: "AI content creation and ideation platform",
    timeSaving: "2 hours to 30 minutes",
    icon: Lightbulb
  },
  {
    name: "Flick",
    category: "Content Ideation",
    description: "AI brainstorming for social media content",
    timeSaving: "Generates 30 days of content ideas in minutes",
    icon: Lightbulb
  }
];

const AIToolsTracking = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [clientToolUsage, setClientToolUsage] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchToolUsage();
    }
  }, [user]);

  const fetchToolUsage = async () => {
    const { data, error } = await supabase
      .from('ai_time_logs')
      .select(`
        *,
        clients (name)
      `)
      .order('month_date', { ascending: false });

    if (error) {
      toast.error("Failed to fetch tool usage");
      return;
    }
    setClientToolUsage(data || []);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Video Repurposing": return "bg-primary/10 text-primary";
      case "Caption Writing": return "bg-secondary/10 text-secondary-foreground";
      case "Scheduling": return "bg-accent/10 text-accent-foreground";
      case "Content Ideation": return "bg-muted text-muted-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const categories = Array.from(new Set(aiTools.map(t => t.category)));

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Logo />
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 flex items-center">
            <Sparkles className="mr-3 h-8 w-8 text-primary" />
            AI Tools Catalog
          </h1>
          <p className="text-muted-foreground">
            Track which AI tools are used across your agency to maximize efficiency
          </p>
        </div>

        {categories.map(category => (
          <div key={category} className="mb-8">
            <h2 className="text-xl font-semibold mb-4">{category}</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {aiTools.filter(t => t.category === category).map(tool => {
                const Icon = tool.icon;
                return (
                  <Card key={tool.name}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="h-5 w-5 text-primary" />
                          <CardTitle className="text-lg">{tool.name}</CardTitle>
                        </div>
                        <Badge variant="secondary" className={getCategoryColor(tool.category)}>
                          {tool.category}
                        </Badge>
                      </div>
                      <CardDescription>{tool.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="p-3 bg-primary/5 rounded-lg">
                        <p className="text-sm font-medium text-primary">{tool.timeSaving}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}

        {clientToolUsage.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Recent Tool Usage by Client</CardTitle>
              <CardDescription>Track which AI tools are being used for each client</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {clientToolUsage.slice(0, 10).map(usage => (
                  <div key={usage.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div>
                      <p className="font-medium">{usage.clients?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(usage.month_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 max-w-md">
                      {usage.ai_tools_used?.map((tool: string) => (
                        <Badge key={tool} variant="outline">{tool}</Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default AIToolsTracking;
