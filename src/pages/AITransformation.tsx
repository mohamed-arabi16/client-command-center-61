import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Package, Clock, Sparkles, Calculator, TrendingUp } from "lucide-react";
import { Logo } from "@/components/Logo";
import { TimeSavingsCalculator } from "@/components/TimeSavingsCalculator";

const AITransformation = () => {
  const navigate = useNavigate();

  const features = [
    {
      title: "Package Comparison",
      description: "Compare all 3 AI-assisted packages side-by-side with clear boundaries",
      icon: Package,
      path: "/package-comparison",
      color: "bg-primary/10 text-primary"
    },
    {
      title: "Time Tracking",
      description: "Track hours spent per client and measure AI efficiency gains",
      icon: Clock,
      path: "/time-tracking",
      color: "bg-secondary/10 text-secondary-foreground"
    },
    {
      title: "AI Tools Catalog",
      description: "Explore all AI tools used across your agency workflows",
      icon: Sparkles,
      path: "/ai-tools",
      color: "bg-accent/10 text-accent-foreground"
    }
  ];

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
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-4 flex items-center justify-center gap-3">
            <TrendingUp className="h-10 w-10 text-primary" />
            AI-Powered Agency Transformation
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Transform your agency from traditional workflows to AI-assisted efficiency. 
            Track your progress, measure ROI, and scale sustainably.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.path} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(feature.path)}>
                <CardHeader>
                  <div className={`w-12 h-12 rounded-lg ${feature.color} flex items-center justify-center mb-3`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    Explore
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mb-12">
          <TimeSavingsCalculator />
        </div>

        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardHeader>
            <CardTitle className="text-2xl">The 4-Hour Rule</CardTitle>
            <CardDescription className="text-base">
              Our AI-assisted packages are designed around a 4-hour workflow per client, transforming your agency economics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-5 bg-background rounded-lg">
                <h3 className="font-semibold mb-3 text-lg">Traditional Agency Model</h3>
                <div className="space-y-2 text-sm">
                  <p>⏱️ <strong>12-15 hours</strong> per client/month</p>
                  <p>💰 Hourly rate: <strong>$75-$100/hr</strong></p>
                  <p>📊 Capacity: <strong>5-6 clients max</strong></p>
                  <p>😰 Result: Burnout, low profitability</p>
                </div>
              </div>

              <div className="p-5 bg-background rounded-lg border-2 border-primary">
                <h3 className="font-semibold mb-3 text-lg text-primary">AI-Assisted Model</h3>
                <div className="space-y-2 text-sm">
                  <p>⚡ <strong>4 hours</strong> per client/month</p>
                  <p>💎 Hourly rate: <strong>$300+/hr</strong></p>
                  <p>🚀 Capacity: <strong>15-20 clients</strong></p>
                  <p>✨ Result: Scalability, profitability</p>
                </div>
              </div>
            </div>

            <div className="p-5 bg-background rounded-lg">
              <h4 className="font-semibold mb-3">How AI Gets Us to 4 Hours</h4>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Video editing (15 clips)</span>
                    <span className="font-medium">6h → <span className="text-primary">1.5h</span></span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Caption writing (20 posts)</span>
                    <span className="font-medium">3h → <span className="text-primary">0.5h</span></span>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Content scheduling</span>
                    <span className="font-medium">1h → <span className="text-primary">0.25h</span></span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Community management</span>
                    <span className="font-medium">2h → <span className="text-primary">1h</span></span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">
                Plus 0.75h content capture session = <strong className="text-primary">4 hours total</strong>
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AITransformation;
