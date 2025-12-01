import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Calculator,
    Calendar,
    CreditCard,
    LayoutDashboard,
    Plus,
    Search,
    Settings,
    User,
    Users,
    FileText,
    Sparkles,
    Upload,
    Clock,
} from "lucide-react";
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
} from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { Client } from "@/types/client";

export function CommandPalette() {
    const [open, setOpen] = useState(false);
    const [clients, setClients] = useState<Client[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    useEffect(() => {
        if (open) {
            const fetchClients = async () => {
                const { data } = await supabase
                    .from("clients")
                    .select("*")
                    .eq("status", "active")
                    .limit(5);

                if (data) {
                    setClients(data as unknown as Client[]);
                }
            };
            fetchClients();
        }
    }, [open]);

    const runCommand = (command: () => void) => {
        setOpen(false);
        command();
    };

    return (
        <CommandDialog open={open} onOpenChange={setOpen}>
            <CommandInput placeholder="Type a command or search..." />
            <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>

                <CommandGroup heading="Suggestions">
                    <CommandItem onSelect={() => runCommand(() => navigate("/"))}>
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        <span>Dashboard</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => navigate("/proposals/new"))}>
                        <Plus className="mr-2 h-4 w-4" />
                        <span>Create New Proposal</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => navigate("/content-calendar"))}>
                        <Calendar className="mr-2 h-4 w-4" />
                        <span>Content Calendar</span>
                    </CommandItem>
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading="Clients">
                    {clients.map((client) => (
                        <CommandItem
                            key={client.id}
                            onSelect={() => runCommand(() => navigate(`/client/${client.id}`))}
                        >
                            <User className="mr-2 h-4 w-4" />
                            <span>{client.name}</span>
                        </CommandItem>
                    ))}
                    <CommandItem onSelect={() => runCommand(() => navigate("/"))}>
                        <Users className="mr-2 h-4 w-4" />
                        <span>View All Clients</span>
                        <CommandShortcut>⌘C</CommandShortcut>
                    </CommandItem>
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading="Tools">
                    <CommandItem onSelect={() => runCommand(() => navigate("/proposals"))}>
                        <FileText className="mr-2 h-4 w-4" />
                        <span>Proposals</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => navigate("/ai-tools"))}>
                        <Sparkles className="mr-2 h-4 w-4" />
                        <span>AI Tools</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => navigate("/content-uploader"))}>
                        <Upload className="mr-2 h-4 w-4" />
                        <span>Content Uploader</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => navigate("/time-tracking"))}>
                        <Clock className="mr-2 h-4 w-4" />
                        <span>Time Tracking</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => navigate("/package-comparison"))}>
                        <Calculator className="mr-2 h-4 w-4" />
                        <span>Package Comparison</span>
                    </CommandItem>
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading="Settings">
                    <CommandItem onSelect={() => runCommand(() => navigate("/admin/services"))}>
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Admin Services</span>
                        <CommandShortcut>⌘S</CommandShortcut>
                    </CommandItem>
                </CommandGroup>
            </CommandList>
        </CommandDialog>
    );
}
