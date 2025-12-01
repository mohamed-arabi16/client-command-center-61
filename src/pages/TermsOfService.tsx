import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const TermsOfService = () => {
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
            <CardTitle className="text-3xl">Terms of Service</CardTitle>
            <CardDescription>
              Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </CardDescription>
          </CardHeader>
          <CardContent className="prose dark:prose-invert max-w-none">
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">1. Acceptance of Terms</h2>
              <p>
                By accessing and using Session Zen Pro ("Service"), you accept and agree to be bound by
                the terms and provisions of this agreement. If you do not agree to these Terms of Service,
                please do not use our Service.
              </p>
            </section>

            <section className="space-y-4 mt-6">
              <h2 className="text-2xl font-semibold">2. Description of Service</h2>
              <p>
                Session Zen Pro is a business management platform that provides tools for client management,
                proposal creation, content planning, time tracking, and business intelligence. We reserve
                the right to modify, suspend, or discontinue the Service at any time without notice.
              </p>
            </section>

            <section className="space-y-4 mt-6">
              <h2 className="text-2xl font-semibold">3. User Accounts</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>You must create an account to use certain features of the Service</li>
                <li>You are responsible for maintaining the confidentiality of your account credentials</li>
                <li>You must provide accurate and complete information when creating your account</li>
                <li>You are responsible for all activities that occur under your account</li>
                <li>You must notify us immediately of any unauthorized use of your account</li>
                <li>We reserve the right to suspend or terminate accounts that violate these terms</li>
              </ul>
            </section>

            <section className="space-y-4 mt-6">
              <h2 className="text-2xl font-semibold">4. Acceptable Use</h2>
              <p>You agree not to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Use the Service for any illegal or unauthorized purpose</li>
                <li>Violate any laws in your jurisdiction</li>
                <li>Infringe on the intellectual property rights of others</li>
                <li>Upload viruses or malicious code</li>
                <li>Attempt to gain unauthorized access to the Service</li>
                <li>Interfere with or disrupt the Service or servers</li>
                <li>Use the Service to harass, abuse, or harm others</li>
                <li>Impersonate any person or entity</li>
                <li>Collect or store personal data about other users without their consent</li>
              </ul>
            </section>

            <section className="space-y-4 mt-6">
              <h2 className="text-2xl font-semibold">5. Intellectual Property</h2>
              <p>
                The Service and its original content, features, and functionality are owned by Session Zen Pro
                and are protected by international copyright, trademark, patent, trade secret, and other
                intellectual property laws.
              </p>
              <p>
                You retain all rights to the content you upload to the Service. By uploading content, you
                grant us a license to use, store, and process that content solely for the purpose of
                providing the Service.
              </p>
            </section>

            <section className="space-y-4 mt-6">
              <h2 className="text-2xl font-semibold">6. Payment Terms</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Certain features require a paid subscription</li>
                <li>Subscription fees are billed in advance on a recurring basis</li>
                <li>All fees are non-refundable except as required by law</li>
                <li>We reserve the right to change our pricing with 30 days notice</li>
                <li>Failure to pay may result in suspension or termination of your account</li>
              </ul>
            </section>

            <section className="space-y-4 mt-6">
              <h2 className="text-2xl font-semibold">7. Data and Privacy</h2>
              <p>
                Your use of the Service is also governed by our Privacy Policy. Please review our Privacy
                Policy to understand how we collect, use, and protect your information.
              </p>
            </section>

            <section className="space-y-4 mt-6">
              <h2 className="text-2xl font-semibold">8. Termination</h2>
              <p>
                We may terminate or suspend your account and access to the Service immediately, without
                prior notice or liability, for any reason, including but not limited to breach of these Terms.
              </p>
              <p>
                Upon termination, your right to use the Service will immediately cease. You may delete your
                account at any time by contacting us.
              </p>
            </section>

            <section className="space-y-4 mt-6">
              <h2 className="text-2xl font-semibold">9. Disclaimer of Warranties</h2>
              <p>
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER
                EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR
                A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
              </p>
            </section>

            <section className="space-y-4 mt-6">
              <h2 className="text-2xl font-semibold">10. Limitation of Liability</h2>
              <p>
                IN NO EVENT SHALL SESSION ZEN PRO BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
                CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION LOSS OF PROFITS, DATA,
                USE, OR OTHER INTANGIBLE LOSSES, RESULTING FROM YOUR USE OF OR INABILITY TO USE THE SERVICE.
              </p>
            </section>

            <section className="space-y-4 mt-6">
              <h2 className="text-2xl font-semibold">11. Indemnification</h2>
              <p>
                You agree to indemnify and hold harmless Session Zen Pro and its affiliates from any claims,
                damages, losses, liabilities, and expenses arising from your use of the Service or violation
                of these Terms.
              </p>
            </section>

            <section className="space-y-4 mt-6">
              <h2 className="text-2xl font-semibold">12. Governing Law</h2>
              <p>
                These Terms shall be governed by and construed in accordance with the laws of your jurisdiction,
                without regard to its conflict of law provisions.
              </p>
            </section>

            <section className="space-y-4 mt-6">
              <h2 className="text-2xl font-semibold">13. Changes to Terms</h2>
              <p>
                We reserve the right to modify these Terms at any time. We will notify you of any changes
                by posting the new Terms on this page and updating the "Last updated" date. Your continued
                use of the Service after any changes constitutes acceptance of the new Terms.
              </p>
            </section>

            <section className="space-y-4 mt-6">
              <h2 className="text-2xl font-semibold">14. Contact Information</h2>
              <p>
                If you have any questions about these Terms, please contact us at:
              </p>
              <p className="font-medium">
                Email: legal@sessionzenpro.com
              </p>
            </section>

            <section className="space-y-4 mt-6">
              <h2 className="text-2xl font-semibold">15. Severability</h2>
              <p>
                If any provision of these Terms is found to be unenforceable or invalid, that provision
                will be limited or eliminated to the minimum extent necessary so that these Terms will
                otherwise remain in full force and effect.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TermsOfService;
