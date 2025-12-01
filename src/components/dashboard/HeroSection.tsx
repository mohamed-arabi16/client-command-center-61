import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Plus, Zap } from "lucide-react";
import { BulkImportDialog } from "@/components/BulkImportDialog";

interface HeroSectionProps {
  onAddClient: () => void;
  onClientsImported?: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onAddClient, onClientsImported }) => {
  const { profile } = useAuth();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const userName = profile?.full_name || "there";

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-hero p-8 md:p-12 shadow-xl">
      {/* Animated background gradient mesh */}
      <div className="absolute inset-0 bg-gradient-mesh opacity-30" />

      <div className="relative z-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold text-white animate-fade-up">
              {getGreeting()}, {userName}! 👋
            </h1>
            <p className="text-white/80 text-lg animate-fade-up" style={{ animationDelay: "0.1s" }}>
              Your creative agency command center
            </p>
          </div>

          <div className="flex flex-wrap gap-3 animate-fade-up" style={{ animationDelay: "0.2s" }}>
            <Button
              onClick={onAddClient}
              size="lg"
              className="bg-white bg-none text-primary hover:bg-white/90 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              <Plus className="h-5 w-5 mr-2" />
              New Client
            </Button>
            <BulkImportDialog onClientsImported={onClientsImported || (() => {})} />
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-white/60 mt-6 animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <Zap className="h-4 w-4 text-white/80" />
          <span>Supercharged with AI automation</span>
        </div>
      </div>
    </div>
  );
};
