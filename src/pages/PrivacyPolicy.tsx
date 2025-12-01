import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Button
          variant="ghost"
          className="gap-2"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Privacy Policy</CardTitle>
            <CardDescription>
              Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </CardDescription>
          </CardHeader>
          <CardContent className="prose dark:prose-invert max-w-none">
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">1. Introduction</h2>
              <p>
                Welcome to Session Zen Pro ("we," "our," or "us"). We are committed to protecting your
                personal information and your right to privacy. This Privacy Policy explains how we
                collect, use, disclose, and safeguard your information when you use our service.
              </p>
            </section>

            <section className="space-y-4 mt-6">
              <h2 className="text-2xl font-semibold">2. Information We Collect</h2>
              <p>We collect information that you provide directly to us, including:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Account Information:</strong> Name, email address, password, and profile information</li>
                <li><strong>Client Data:</strong> Information about your clients, including names, contact details, and business information</li>
                <li><strong>Proposal Data:</strong> Contracts, proposals, pricing information, and related documents</li>
                <li><strong>Usage Data:</strong> Information about how you use our service, including time tracking and activity logs</li>
                <li><strong>Payment Information:</strong> Billing details and transaction information (processed securely through third-party providers)</li>
              </ul>
            </section>

            <section className="space-y-4 mt-6">
              <h2 className="text-2xl font-semibold">3. How We Use Your Information</h2>
              <p>We use the information we collect to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Provide, maintain, and improve our services</li>
                <li>Process your transactions and send related information</li>
                <li>Send you technical notices, updates, and support messages</li>
                <li>Respond to your comments and questions</li>
                <li>Monitor and analyze trends, usage, and activities</li>
                <li>Detect, prevent, and address technical issues and fraudulent activity</li>
              </ul>
            </section>

            <section className="space-y-4 mt-6">
              <h2 className="text-2xl font-semibold">4. Data Storage and Security</h2>
              <p>
                Your data is stored securely using Supabase, which provides enterprise-grade security
                features including encryption at rest and in transit. We implement industry-standard
                security measures to protect your information.
              </p>
              <p>
                However, no method of transmission over the Internet or electronic storage is 100%
                secure. While we strive to use commercially acceptable means to protect your personal
                information, we cannot guarantee its absolute security.
              </p>
            </section>

            <section className="space-y-4 mt-6">
              <h2 className="text-2xl font-semibold">5. Data Sharing and Disclosure</h2>
              <p>We do not sell your personal information. We may share your information only in the following circumstances:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>With your consent:</strong> When you explicitly authorize us to share specific information</li>
                <li><strong>Service providers:</strong> With third-party vendors who perform services on our behalf</li>
                <li><strong>Legal requirements:</strong> When required by law or to protect our rights</li>
                <li><strong>Business transfers:</strong> In connection with a merger, sale, or acquisition</li>
              </ul>
            </section>

            <section className="space-y-4 mt-6">
              <h2 className="text-2xl font-semibold">6. Your Rights and Choices</h2>
              <p>You have the right to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Access:</strong> Request access to your personal information</li>
                <li><strong>Correction:</strong> Request correction of inaccurate data</li>
                <li><strong>Deletion:</strong> Request deletion of your personal information</li>
                <li><strong>Data Portability:</strong> Request a copy of your data in a machine-readable format</li>
                <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
              </ul>
            </section>

            <section className="space-y-4 mt-6">
              <h2 className="text-2xl font-semibold">7. Cookies and Tracking</h2>
              <p>
                We use cookies and similar tracking technologies to collect information about your
                browsing activities. You can control cookies through your browser settings.
              </p>
            </section>

            <section className="space-y-4 mt-6">
              <h2 className="text-2xl font-semibold">8. Children's Privacy</h2>
              <p>
                Our service is not intended for users under the age of 18. We do not knowingly collect
                personal information from children under 18.
              </p>
            </section>

            <section className="space-y-4 mt-6">
              <h2 className="text-2xl font-semibold">9. International Data Transfers</h2>
              <p>
                Your information may be transferred to and processed in countries other than your own.
                We ensure appropriate safeguards are in place to protect your information.
              </p>
            </section>

            <section className="space-y-4 mt-6">
              <h2 className="text-2xl font-semibold">10. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of any changes
                by posting the new Privacy Policy on this page and updating the "Last updated" date.
              </p>
            </section>

            <section className="space-y-4 mt-6">
              <h2 className="text-2xl font-semibold">11. Contact Us</h2>
              <p>
                If you have questions about this Privacy Policy, please contact us at:
              </p>
              <p className="font-medium">
                Email: privacy@sessionzenpro.com
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
