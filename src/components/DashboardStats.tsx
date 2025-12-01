import { Card, CardContent } from "@/components/ui/card";
import { Users, FileCheck, CheckCircle2, ListTodo, FileText } from "lucide-react";

interface DashboardStatsProps {
  totalClients: number;
  activeClients: number;
  pausedClients: number;
  completedClients: number;
  completedDeliverables: number;
  totalDeliverables: number;
  pendingTodos: number;
  totalTodos: number;
  totalProposals: number;
  activeProposals: number;
  draftProposals: number;
  sentProposals: number;
}

export const DashboardStats = ({
  totalClients,
  activeClients,
  pausedClients,
  completedClients,
  completedDeliverables,
  totalDeliverables,
  pendingTodos,
  totalTodos,
  totalProposals,
  activeProposals,
  draftProposals,
  sentProposals,
}: DashboardStatsProps) => {
  const stats = [
    {
      title: "Total Clients",
      value: totalClients,
      subtitle: `${activeClients} active, ${pausedClients} paused, ${completedClients} completed`,
      icon: Users,
      gradient: "from-primary to-accent",
    },
    {
      title: "Proposals",
      value: totalProposals,
      subtitle: `${activeProposals} active, ${draftProposals} drafts, ${sentProposals} sent`,
      icon: FileText,
      gradient: "from-accent to-secondary",
    },
    {
      title: "Completed Deliverables",
      value: completedDeliverables,
      subtitle: `${totalDeliverables} total`,
      icon: CheckCircle2,
      gradient: "from-secondary to-accent",
    },
    {
      title: "Pending Tasks",
      value: pendingTodos,
      subtitle: `${totalTodos} total tasks`,
      icon: ListTodo,
      gradient: "from-primary to-secondary",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, index) => (
        <Card
          key={index}
          className="relative overflow-hidden border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-medium hover:scale-105 group bg-gradient-card backdrop-blur-sm"
        >
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {stat.title}
                </p>
                <p className="text-4xl font-bold text-foreground">
                  {stat.value}
                </p>
                <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
              </div>
              <div
                className={`p-3 rounded-xl bg-gradient-to-br ${stat.gradient} opacity-15 group-hover:opacity-30 transition-all duration-300 group-hover:scale-110`}
              >
                <stat.icon className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
