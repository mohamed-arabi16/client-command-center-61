import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, X, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";

const PackageComparison = () => {
  const navigate = useNavigate();

  const packages = [
    {
      name: "Video Content Foundation",
      price: 650,
      tier: "video_foundation",
      description: "Perfect for small businesses starting with content",
      bestFor: "Local businesses wanting consistent video content presence",
      included: [
        "1× Content Management (Lite)",
        "15× AI-repurposed video clips",
        "1× Monthly content capture session (3-4 hours)",
        "Community management (2 platforms, 3-4×/week)",
        "AI-assisted caption writing",
        "Monthly Business Intelligence Summary"
      ],
      notIncluded: [
        "Custom graphic designs",
        "GMB optimization",
        "Ad campaign management",
        "Landing pages",
        "Daily community management"
      ]
    },
    {
      name: "Content Engine",
      price: 1250,
      tier: "content_engine",
      description: "For growing businesses needing consistent presence",
      bestFor: "Established businesses ready to scale their content",
      included: [
        "1× Pro Management",
        "20× AI-repurposed video clips",
        "10× Custom graphic designs",
        "1× Monthly content capture session",
        "AI-assisted caption writing",
        "GMB optimization & AI-powered review responses",
        "Community management (2 platforms)",
        "Monthly Business Intelligence Summary"
      ],
      notIncluded: [
        "Ad campaign management",
        "Landing pages",
        "Daily community management",
        "Multiple content capture sessions"
      ]
    },
    {
      name: "Lead Generation",
      price: 1750,
      tier: "lead_generation",
      description: "Complete lead generation and conversion system",
      bestFor: "Businesses focused on aggressive growth and ROI",
      included: [
        "Everything from Content Engine",
        "Monthly ad campaign management (up to $500 ad spend)",
        "1× High-converting landing page (built & monitored)",
        "Full daily community management",
        "Priority support & strategy calls",
        "Advanced ROI tracking & reporting"
      ],
      notIncluded: [
        "Ad spend over $500/month (upgradable)",
        "Multiple landing pages",
        "Custom video production (from scratch)"
      ]
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
          <h1 className="text-4xl font-bold mb-4">AI-Assisted Package Comparison</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Choose the perfect package for your business. All packages leverage AI tools to deliver maximum value with efficient workflows.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {packages.map((pkg) => (
            <Card key={pkg.tier} className={pkg.tier === "content_engine" ? "border-primary shadow-lg" : ""}>
              <CardHeader>
                <CardTitle className="text-2xl">{pkg.name}</CardTitle>
                <CardDescription className="text-sm">{pkg.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">${pkg.price}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium">Best For:</p>
                  <p className="text-sm text-muted-foreground">{pkg.bestFor}</p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2 flex items-center text-sm">
                    <Check className="h-4 w-4 mr-2 text-primary" />
                    What's Included
                  </h4>
                  <ul className="space-y-1">
                    {pkg.included.map((item, idx) => (
                      <li key={idx} className="text-sm flex items-start">
                        <Check className="h-3 w-3 mr-2 mt-1 text-primary flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2 flex items-center text-sm">
                    <X className="h-4 w-4 mr-2 text-destructive" />
                    Not Included
                  </h4>
                  <ul className="space-y-1">
                    {pkg.notIncluded.map((item, idx) => (
                      <li key={idx} className="text-sm flex items-start text-muted-foreground">
                        <X className="h-3 w-3 mr-2 mt-1 text-destructive flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Button 
                  className="w-full" 
                  variant={pkg.tier === "content_engine" ? "default" : "outline"}
                  onClick={() => navigate(`/proposals/new?packageTier=${pkg.tier}`)}
                >
                  Choose {pkg.name}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle>The 4-Hour Rule: How AI Makes This Possible</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Our AI-assisted workflow transforms traditional agency work from 10-15 hours per client to just 4 hours, 
              while maintaining quality and delivering better results.
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 bg-background rounded-lg">
                <h4 className="font-semibold mb-2">Video Repurposing</h4>
                <p className="text-sm text-muted-foreground mb-2">Traditional: 1.5 hours per video</p>
                <p className="text-sm font-medium">AI-Assisted: 15 minutes</p>
                <p className="text-xs text-primary mt-1">Tools: Opus Clip, Descript</p>
              </div>
              <div className="p-4 bg-background rounded-lg">
                <h4 className="font-semibold mb-2">Caption Writing</h4>
                <p className="text-sm text-muted-foreground mb-2">Traditional: 30 minutes per post</p>
                <p className="text-sm font-medium">AI-Assisted: 5 minutes</p>
                <p className="text-xs text-primary mt-1">Tools: Rytr, Copy.ai</p>
              </div>
              <div className="p-4 bg-background rounded-lg">
                <h4 className="font-semibold mb-2">Content Scheduling</h4>
                <p className="text-sm text-muted-foreground mb-2">Traditional: 1 hour weekly</p>
                <p className="text-sm font-medium">AI-Assisted: 15 minutes</p>
                <p className="text-xs text-primary mt-1">Tools: Buffer AI, SocialBee</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default PackageComparison;
