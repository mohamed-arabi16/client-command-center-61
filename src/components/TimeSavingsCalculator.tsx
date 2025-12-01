import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { TrendingDown, DollarSign, Clock } from "lucide-react";

export const TimeSavingsCalculator = () => {
  const [monthlyRevenue, setMonthlyRevenue] = useState(1250);
  const [clientCount, setClientCount] = useState(5);

  const traditionalHoursPerClient = 12;
  const aiAssistedHoursPerClient = 4;
  const hoursPerMonth = clientCount * aiAssistedHoursPerClient;
  const hoursSaved = clientCount * (traditionalHoursPerClient - aiAssistedHoursPerClient);
  const traditionalHourlyRate = monthlyRevenue / (clientCount * traditionalHoursPerClient);
  const aiHourlyRate = monthlyRevenue / hoursPerMonth;
  const additionalClientsCapacity = Math.floor(hoursSaved / aiAssistedHoursPerClient);
  const potentialRevenue = additionalClientsCapacity * monthlyRevenue;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          AI Time Savings Calculator
        </CardTitle>
        <CardDescription>
          See how AI-assisted workflows transform your agency economics
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label>Average Package Price: ${monthlyRevenue}/month</Label>
            <Slider
              value={[monthlyRevenue]}
              onValueChange={(val) => setMonthlyRevenue(val[0])}
              min={500}
              max={2000}
              step={50}
              className="mt-2"
            />
          </div>

          <div>
            <Label>Current Number of Clients: {clientCount}</Label>
            <Slider
              value={[clientCount]}
              onValueChange={(val) => setClientCount(val[0])}
              min={1}
              max={20}
              step={1}
              className="mt-2"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-destructive/10 rounded-lg">
            <h4 className="font-semibold mb-2 text-destructive">Traditional Workflow</h4>
            <div className="space-y-2 text-sm">
              <p>Hours per client: <span className="font-bold">{traditionalHoursPerClient}h</span></p>
              <p>Total monthly hours: <span className="font-bold">{clientCount * traditionalHoursPerClient}h</span></p>
              <p>Hourly rate: <span className="font-bold">${traditionalHourlyRate.toFixed(2)}/hr</span></p>
            </div>
          </div>

          <div className="p-4 bg-primary/10 rounded-lg">
            <h4 className="font-semibold mb-2 text-primary">AI-Assisted Workflow</h4>
            <div className="space-y-2 text-sm">
              <p>Hours per client: <span className="font-bold">{aiAssistedHoursPerClient}h</span></p>
              <p>Total monthly hours: <span className="font-bold">{hoursPerMonth}h</span></p>
              <p>Hourly rate: <span className="font-bold">${aiHourlyRate.toFixed(2)}/hr</span></p>
            </div>
          </div>
        </div>

        <div className="space-y-3 p-5 bg-primary/5 rounded-lg border-2 border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-primary" />
              <span className="font-semibold">Time Saved Per Month</span>
            </div>
            <span className="text-2xl font-bold text-primary">{hoursSaved}h</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <span className="font-semibold">Hourly Rate Increase</span>
            </div>
            <span className="text-2xl font-bold text-primary">
              +{((aiHourlyRate / traditionalHourlyRate - 1) * 100).toFixed(0)}%
            </span>
          </div>

          <div className="pt-3 border-t border-primary/20">
            <p className="text-sm text-muted-foreground mb-2">With saved time, you could serve:</p>
            <p className="text-xl font-bold">+{additionalClientsCapacity} additional clients</p>
            <p className="text-sm text-primary font-medium mt-1">
              Potential additional revenue: ${potentialRevenue.toLocaleString()}/month
            </p>
          </div>
        </div>

        <div className="p-4 bg-muted/50 rounded-lg">
          <h4 className="font-semibold mb-3">How We Get to 4 Hours</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Video editing (15 clips)</p>
              <p className="font-medium">Traditional: 6h → AI: 1.5h</p>
            </div>
            <div>
              <p className="text-muted-foreground">Caption writing (20 posts)</p>
              <p className="font-medium">Traditional: 3h → AI: 0.5h</p>
            </div>
            <div>
              <p className="text-muted-foreground">Content scheduling</p>
              <p className="font-medium">Traditional: 1h → AI: 0.25h</p>
            </div>
            <div>
              <p className="text-muted-foreground">Community management</p>
              <p className="font-medium">Traditional: 2h → AI: 1h</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Plus content capture session (0.75h) = 4 hours total
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
