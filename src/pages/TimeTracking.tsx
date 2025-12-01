import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Plus, Clock, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";

interface Client {
  id: string;
  name: string;
  total_contract_value: number;
}

interface TimeLog {
  id: string;
  client_id: string;
  month_date: string;
  manual_hours: number;
  ai_assisted_hours: number;
  time_saved_hours: number;
  tasks_completed: number;
  ai_tools_used: string[];
  notes: string;
  clients: { name: string };
}

const TimeTracking = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    client_id: "",
    month_date: new Date().toISOString().slice(0, 7),
    manual_hours: 0,
    ai_assisted_hours: 0,
    tasks_completed: 0,
    ai_tools_used: [] as string[],
    notes: ""
  });

  useEffect(() => {
    if (user) {
      fetchClients();
      fetchTimeLogs();
    }
  }, [user]);

  const fetchClients = async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('id, name, total_contract_value')
      .eq('user_id', user?.id)
      .eq('status', 'active')
      .order('name');

    if (error) {
      toast.error("Failed to fetch clients");
      return;
    }
    setClients(data || []);
  };

  const fetchTimeLogs = async () => {
    const { data, error } = await supabase
      .from('ai_time_logs')
      .select(`
        *,
        clients (name)
      `)
      .order('month_date', { ascending: false });

    if (error) {
      toast.error("Failed to fetch time logs");
      return;
    }
    setTimeLogs(data || []);
  };

  const calculateTimeSaved = () => {
    return Number(formData.manual_hours) - Number(formData.ai_assisted_hours);
  };

  const saveTimeLog = async () => {
    if (!formData.client_id || !formData.month_date) {
      toast.error("Please select client and month");
      return;
    }

    const { error } = await supabase
      .from('ai_time_logs')
      .insert([{
        client_id: formData.client_id,
        month_date: formData.month_date + '-01',
        manual_hours: Number(formData.manual_hours),
        ai_assisted_hours: Number(formData.ai_assisted_hours),
        time_saved_hours: calculateTimeSaved(),
        tasks_completed: Number(formData.tasks_completed),
        ai_tools_used: formData.ai_tools_used,
        notes: formData.notes
      }]);

    if (error) {
      toast.error("Failed to save time log");
      return;
    }

    toast.success("Time log saved!");
    setShowForm(false);
    setFormData({
      client_id: "",
      month_date: new Date().toISOString().slice(0, 7),
      manual_hours: 0,
      ai_assisted_hours: 0,
      tasks_completed: 0,
      ai_tools_used: [],
      notes: ""
    });
    fetchTimeLogs();
  };

  const calculateHourlyRate = (clientId: string, aiAssistedHours: number) => {
    const client = clients.find(c => c.id === clientId);
    if (!client || aiAssistedHours === 0) return 0;
    return (client.total_contract_value / aiAssistedHours).toFixed(2);
  };

  const totalStats = timeLogs.reduce((acc, log) => ({
    totalManual: acc.totalManual + Number(log.manual_hours),
    totalAI: acc.totalAI + Number(log.ai_assisted_hours),
    totalSaved: acc.totalSaved + Number(log.time_saved_hours),
    totalTasks: acc.totalTasks + Number(log.tasks_completed)
  }), { totalManual: 0, totalAI: 0, totalSaved: 0, totalTasks: 0 });

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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Time Tracking & AI Efficiency</h1>
            <p className="text-muted-foreground">Track hours spent and measure AI time savings</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Time Log
          </Button>
        </div>

        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Manual Hours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalStats.totalManual.toFixed(1)}h</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">AI-Assisted Hours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalStats.totalAI.toFixed(1)}h</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center">
                <TrendingDown className="h-4 w-4 mr-2 text-primary" />
                Time Saved
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{totalStats.totalSaved.toFixed(1)}h</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Tasks Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalStats.totalTasks}</div>
            </CardContent>
          </Card>
        </div>

        {showForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Add Time Log</CardTitle>
              <CardDescription>Track time spent on client work and AI efficiency</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Client</Label>
                  <Select value={formData.client_id} onValueChange={(val) => setFormData({...formData, client_id: val})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map(client => (
                        <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Month</Label>
                  <Input 
                    type="month" 
                    value={formData.month_date}
                    onChange={(e) => setFormData({...formData, month_date: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label>Manual Hours (Traditional)</Label>
                  <Input 
                    type="number" 
                    step="0.5"
                    value={formData.manual_hours}
                    onChange={(e) => setFormData({...formData, manual_hours: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <Label>AI-Assisted Hours (Actual)</Label>
                  <Input 
                    type="number" 
                    step="0.5"
                    value={formData.ai_assisted_hours}
                    onChange={(e) => setFormData({...formData, ai_assisted_hours: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <Label>Tasks Completed</Label>
                  <Input 
                    type="number"
                    value={formData.tasks_completed}
                    onChange={(e) => setFormData({...formData, tasks_completed: Number(e.target.value)})}
                  />
                </div>
              </div>

              <div>
                <Label>AI Tools Used (comma separated)</Label>
                <Input 
                  placeholder="Opus Clip, Descript, Copy.ai"
                  value={formData.ai_tools_used.join(', ')}
                  onChange={(e) => setFormData({...formData, ai_tools_used: e.target.value.split(',').map(s => s.trim())})}
                />
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea 
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Additional details about the work..."
                />
              </div>

              {formData.manual_hours > 0 && formData.ai_assisted_hours > 0 && (
                <div className="p-4 bg-primary/10 rounded-lg">
                  <p className="text-sm font-medium">Time Saved: {calculateTimeSaved().toFixed(1)} hours</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    That's a {((calculateTimeSaved() / formData.manual_hours) * 100).toFixed(0)}% efficiency improvement!
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={saveTimeLog}>Save Time Log</Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Time Log History</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Month</TableHead>
                  <TableHead>Manual Hours</TableHead>
                  <TableHead>AI Hours</TableHead>
                  <TableHead>Saved</TableHead>
                  <TableHead>Tasks</TableHead>
                  <TableHead>Hourly Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timeLogs.map(log => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.clients?.name}</TableCell>
                    <TableCell>{new Date(log.month_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}</TableCell>
                    <TableCell>{Number(log.manual_hours).toFixed(1)}h</TableCell>
                    <TableCell>{Number(log.ai_assisted_hours).toFixed(1)}h</TableCell>
                    <TableCell className="text-primary">{Number(log.time_saved_hours).toFixed(1)}h</TableCell>
                    <TableCell>{log.tasks_completed}</TableCell>
                    <TableCell className="font-medium">${calculateHourlyRate(log.client_id, Number(log.ai_assisted_hours))}/hr</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default TimeTracking;
