import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ClientCard } from "@/components/ClientCard";
import { AddClientDialog } from "@/components/AddClientDialog";
import { HeroSection } from "@/components/dashboard/HeroSection";
import { ModernStats } from "@/components/dashboard/ModernStats";
import { ProfileEditDialog } from "@/components/ProfileEditDialog";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { MobileNav } from "@/components/MobileNav";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, Sparkles, User, Settings } from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<any[]>([]);
  const [deliverables, setDeliverables] = useState<any[]>([]);
  const [todos, setTodos] = useState<any[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, signOut, refreshProfile } = useAuth();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [clientsRes, deliverablesRes, todosRes, proposalsRes] = await Promise.all([
        supabase.from('clients').select('*').order('created_at', { ascending: false }),
        supabase.from('deliverables').select('*'),
        supabase.from('todos').select('*'),
        supabase.from('proposals').select('*').order('created_at', { ascending: false }),
      ]);

      if (clientsRes.error) throw clientsRes.error;
      
      setClients(clientsRes.data || []);
      setDeliverables(deliverablesRes.data || []);
      setTodos(todosRes.data || []);
      setProposals(proposalsRes.data || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    totalClients: clients.length,
    activeClients: clients.filter(c => c.status === 'active').length,
    pausedClients: clients.filter(c => c.status === 'paused').length,
    completedClients: clients.filter(c => c.status === 'completed').length,
    completedDeliverables: deliverables.reduce((sum, d) => sum + d.completed, 0),
    totalDeliverables: deliverables.reduce((sum, d) => sum + d.total, 0),
    pendingTodos: todos.filter(t => !t.completed).length,
    totalTodos: todos.length,
    totalProposals: proposals.length,
    activeProposals: proposals.filter(p => p.status === 'active').length,
    draftProposals: proposals.filter(p => p.status === 'draft').length,
    sentProposals: proposals.filter(p => p.status === 'sent').length,
  };

  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);

  const getInitials = () => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return user?.email?.charAt(0).toUpperCase() || 'U';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Modern Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl shadow-soft">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Logo size="md" />
              <div className="hidden sm:block">
                <h1 className="text-lg sm:text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  Mission Control
                </h1>
                <p className="text-xs text-muted-foreground">Creative Agency Hub</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/ai-transformation')}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                AI Hub
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/content-calendar')}
              >
                Content
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/proposals')}
              >
                Proposals
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setIsProfileEditOpen(true)}>
                    <User className="mr-2 h-4 w-4" />
                    Edit Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={signOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>

            {/* Mobile Navigation */}
            <MobileNav />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        {/* Hero Section */}
        {!loading && (
          <div className="animate-fade-in">
            <HeroSection
              onAddClient={() => setIsAddClientOpen(true)}
              onClientsImported={fetchDashboardData}
            />
          </div>
        )}

        {/* Stats Section */}
        {!loading && (
          <div className="animate-fade-up" style={{ animationDelay: "0.1s" }}>
            <ModernStats
              totalClients={stats.totalClients}
              activeClients={stats.activeClients}
              pausedClients={stats.pausedClients}
              completedClients={stats.completedClients}
              completedDeliverables={stats.completedDeliverables}
              totalDeliverables={stats.totalDeliverables}
              pendingTodos={stats.pendingTodos}
              totalTodos={stats.totalTodos}
              totalProposals={stats.totalProposals}
              activeProposals={stats.activeProposals}
            />
          </div>
        )}

        {/* Clients Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Your Clients</h2>
              <p className="text-sm text-muted-foreground">
                {loading ? 'Loading...' : `Managing ${clients.length} ${clients.length === 1 ? 'client' : 'clients'}`}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
                <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 border border-primary/20"></div>
              </div>
            </div>
          ) : clients.length === 0 ? (
            <div className="text-center py-20">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-gradient-primary/10 flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No clients yet</h3>
              <p className="text-muted-foreground mb-6">Add your first client to get started!</p>
              <Button onClick={() => setIsAddClientOpen(true)} size="lg" className="bg-gradient-primary hover:opacity-90">
                Add Your First Client
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {clients.map((client, index) => (
                <div key={client.id} style={{ animationDelay: `${index * 0.05}s` }}>
                  <ClientCard client={client} />
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Add Client Dialog */}
      <AddClientDialog 
        open={isAddClientOpen}
        onOpenChange={setIsAddClientOpen}
        onClientAdded={() => {
          fetchDashboardData();
          setIsAddClientOpen(false);
        }}
      />

      {/* Profile Edit Dialog */}
      <ProfileEditDialog
        open={isProfileEditOpen}
        onOpenChange={setIsProfileEditOpen}
        onProfileUpdated={refreshProfile}
      />
    </div>
  );
};

export default Dashboard;
