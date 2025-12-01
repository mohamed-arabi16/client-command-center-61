import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Menu, FileText, Layout, Package, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export const MobileNav = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[280px] sm:w-[320px]">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
          <div className="text-sm text-muted-foreground pt-2 pb-4 border-b">
            {user?.email}
          </div>
        </SheetHeader>
        <div className="flex flex-col gap-2 pt-6">
          <Button 
            variant="ghost" 
            className="justify-start" 
            onClick={() => navigate('/ai-transformation')}
          >
            🚀 AI Hub
          </Button>
          <Button 
            variant="ghost" 
            className="justify-start" 
            onClick={() => navigate('/content-calendar')}
          >
            📅 Content Calendar
          </Button>
          <Button 
            variant="ghost" 
            className="justify-start" 
            onClick={() => navigate('/admin/services')}
          >
            <Package className="mr-2 h-4 w-4" />
            Services
          </Button>
          <Button 
            variant="ghost" 
            className="justify-start" 
            onClick={() => navigate('/proposals/templates')}
          >
            <Layout className="mr-2 h-4 w-4" />
            Templates
          </Button>
          <Button 
            variant="ghost" 
            className="justify-start" 
            onClick={() => navigate('/proposals')}
          >
            <FileText className="mr-2 h-4 w-4" />
            Proposals
          </Button>
          <div className="border-t my-4" />
          <Button 
            variant="ghost" 
            className="justify-start text-destructive hover:text-destructive" 
            onClick={signOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
