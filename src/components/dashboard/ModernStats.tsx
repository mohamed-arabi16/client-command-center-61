import React from "react";
import { StatWidget } from "@/components/ui/stat-widget";
import { Users, Clock, CheckCircle2, FileText, Briefcase, PauseCircle } from "lucide-react";

interface ModernStatsProps {
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
}

export const ModernStats: React.FC<ModernStatsProps> = ({
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
}) => {
  const completionRate = totalDeliverables > 0 
    ? Math.round((completedDeliverables / totalDeliverables) * 100) 
    : 0;

  const todoCompletionRate = totalTodos > 0
    ? Math.round(((totalTodos - pendingTodos) / totalTodos) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
          Overview
        </h2>
        <p className="text-muted-foreground">Your agency performance at a glance</p>
      </div>

      {/* Bento grid layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Large card - Total Clients */}
        <div className="md:col-span-2 lg:col-span-2 animate-fade-up">
          <StatWidget
            title="Total Clients"
            value={totalClients}
            icon={Users}
            description="All clients in your portfolio"
            className="h-full bg-gradient-primary/5 border-primary/20"
          />
        </div>

        {/* Active Clients */}
        <div className="animate-fade-up" style={{ animationDelay: "0.1s" }}>
          <StatWidget
            title="Active Clients"
            value={activeClients}
            icon={Briefcase}
            trend={{
              value: 12,
              direction: "up",
            }}
            description="Currently active projects"
          />
        </div>

        {/* Paused Clients */}
        <div className="animate-fade-up" style={{ animationDelay: "0.2s" }}>
          <StatWidget
            title="Paused"
            value={pausedClients}
            icon={PauseCircle}
            description="Temporarily on hold"
          />
        </div>

        {/* Deliverables */}
        <div className="animate-fade-up" style={{ animationDelay: "0.3s" }}>
          <StatWidget
            title="Deliverables"
            value={`${completedDeliverables}/${totalDeliverables}`}
            icon={CheckCircle2}
            trend={{
              value: completionRate - 100,
              direction: completionRate >= 80 ? "up" : completionRate >= 50 ? "neutral" : "down",
            }}
            description={`${completionRate}% completion rate`}
          />
        </div>

        {/* Pending Tasks */}
        <div className="animate-fade-up" style={{ animationDelay: "0.4s" }}>
          <StatWidget
            title="Pending Tasks"
            value={pendingTodos}
            icon={Clock}
            trend={{
              value: todoCompletionRate - 100,
              direction: todoCompletionRate >= 70 ? "up" : "down",
            }}
            description={`${totalTodos} total tasks`}
          />
        </div>

        {/* Proposals */}
        <div className="md:col-span-2 animate-fade-up" style={{ animationDelay: "0.5s" }}>
          <StatWidget
            title="Active Proposals"
            value={activeProposals}
            icon={FileText}
            trend={{
              value: 8,
              direction: "up",
            }}
            description={`${totalProposals} total proposals`}
            className="h-full"
          />
        </div>

        {/* Completed */}
        <div className="animate-fade-up" style={{ animationDelay: "0.6s" }}>
          <StatWidget
            title="Completed"
            value={completedClients}
            icon={CheckCircle2}
            description="Successfully finished"
          />
        </div>
      </div>
    </div>
  );
};
