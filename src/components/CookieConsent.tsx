import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X, Cookie } from 'lucide-react';
import { Link } from 'react-router-dom';

const COOKIE_CONSENT_KEY = 'cookie-consent';

export const CookieConsent = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already given consent
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      // Show banner after a brief delay
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    setIsVisible(false);

    // Initialize analytics/tracking here if needed
    // Example: window.gtag('consent', 'update', { analytics_storage: 'granted' });
  };

  const handleDecline = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'declined');
    setIsVisible(false);

    // Disable analytics/tracking here if needed
    // Example: window.gtag('consent', 'update', { analytics_storage: 'denied' });
  };

  const handleClose = () => {
    // If they just close without accepting/declining, ask again next time
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom duration-300">
      <Card className="max-w-4xl mx-auto p-6 bg-background/95 backdrop-blur-sm border-2 shadow-lg">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close cookie consent banner"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-4">
          <div className="rounded-full bg-primary/10 p-3 shrink-0">
            <Cookie className="h-6 w-6 text-primary" />
          </div>

          <div className="flex-1 space-y-4">
            <div>
              <h3 className="font-semibold text-lg mb-2">
                We value your privacy
              </h3>
              <p className="text-sm text-muted-foreground">
                We use cookies to enhance your browsing experience, analyze site traffic, and
                personalize content. By clicking "Accept All", you consent to our use of cookies.
                You can manage your preferences or learn more in our{' '}
                <Link
                  to="/privacy"
                  className="text-primary hover:underline font-medium"
                >
                  Privacy Policy
                </Link>
                .
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handleAccept}
                className="bg-primary hover:bg-primary/90"
              >
                Accept All
              </Button>
              <Button
                onClick={handleDecline}
                variant="outline"
              >
                Decline
              </Button>
              <Button
                onClick={handleClose}
                variant="ghost"
                className="text-muted-foreground"
              >
                Decide Later
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
