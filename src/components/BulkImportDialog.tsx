import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Upload, Download, FileSpreadsheet, Loader2, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { parseCSV, generateCSVTemplate, ClientCSVRow } from '@/utils/csvParser';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { extractInstagramHandle } from '@/utils/instagram';

interface BulkImportDialogProps {
  onClientsImported: () => void;
}

export const BulkImportDialog = ({ onClientsImported }: BulkImportDialogProps) => {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parseResult, setParseResult] = useState<any>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const { user } = useAuth();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        toast.error('Please select a CSV file');
        return;
      }
      setFile(selectedFile);
      setParseResult(null);
      setImportResults(null);
    }
  };

  const handleParseFile = async () => {
    if (!file) return;

    setParsing(true);
    try {
      const content = await file.text();
      const result = parseCSV(content);

      setParseResult(result);

      if (result.success && result.data) {
        toast.success(`Parsed ${result.data.length} clients successfully`, {
          description: result.errors?.length ? `${result.errors.length} rows had errors and were skipped` : undefined,
        });
      } else {
        toast.error('Failed to parse CSV', {
          description: result.errors?.[0],
        });
      }
    } catch (error) {
      toast.error('Failed to read file');
      console.error('File read error:', error);
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    if (!user || !parseResult?.data) return;

    setImporting(true);
    setImportProgress(0);

    const clientsData: ClientCSVRow[] = parseResult.data;
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < clientsData.length; i++) {
      const row = clientsData[i];

      try {
        const clientData: any = {
          user_id: user.id,
          name: row.name,
          contract_type: row.contract_type,
          start_date: row.start_date,
          status: (row.status?.toLowerCase() as any) || 'active',
          total_contract_value: row.total_contract_value ? parseFloat(row.total_contract_value) : null,
          payment_terms: row.payment_terms ? { notes: row.payment_terms } : null,
          business_type: row.business_type || null,
          primary_goal: row.primary_goal || null,
          estimated_close_rate: row.estimated_close_rate ? parseFloat(row.estimated_close_rate) : 20,
          average_customer_value: row.average_customer_value ? parseFloat(row.average_customer_value) : null,
          primary_lead_source: row.primary_lead_source || null,
        };

        // Add Instagram data if available
        if (row.instagram_url || row.instagram_handle) {
          clientData.instagram_url = row.instagram_url || null;
          clientData.instagram_handle = row.instagram_handle || extractInstagramHandle(row.instagram_url || '');
          clientData.instagram_profile_pic_url = row.instagram_profile_pic_url || null;
          clientData.instagram_bio = row.instagram_bio || null;
          clientData.instagram_follower_count = row.instagram_follower_count ? parseInt(row.instagram_follower_count) : null;

          if (row.instagram_profile_pic_url || row.instagram_bio || row.instagram_follower_count) {
            clientData.instagram_scraped_at = new Date().toISOString();
          }

          // Use Instagram profile pic as logo if available
          if (!clientData.logo_url && row.instagram_profile_pic_url) {
            clientData.logo_url = row.instagram_profile_pic_url;
          }
        }

        const { error } = await supabase.from('clients').insert(clientData);

        if (error) throw error;

        successCount++;
      } catch (error: any) {
        failedCount++;
        errors.push(`Row ${i + 2} (${row.name}): ${error.message}`);
        console.error(`Failed to import client ${row.name}:`, error);
      }

      setImportProgress(((i + 1) / clientsData.length) * 100);
    }

    setImportResults({
      success: successCount,
      failed: failedCount,
      errors,
    });

    if (successCount > 0) {
      toast.success(`Successfully imported ${successCount} clients`, {
        description: failedCount > 0 ? `${failedCount} clients failed to import` : undefined,
      });
      onClientsImported();
    } else {
      toast.error('Failed to import any clients');
    }

    setImporting(false);
  };

  const handleDownloadTemplate = () => {
    const template = generateCSVTemplate();
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'client_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Template downloaded');
  };

  const handleClose = () => {
    setOpen(false);
    setFile(null);
    setParseResult(null);
    setImportResults(null);
    setImportProgress(0);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          variant="outline"
          className="bg-white/10 border-white/20 text-white hover:bg-white/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
        >
          <Upload className="h-5 w-5 mr-2" />
          Bulk Import
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Import Clients</DialogTitle>
          <DialogDescription>
            Import multiple clients from a CSV file with their Instagram data
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Download Template */}
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-start gap-3">
              <FileSpreadsheet className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-sm mb-1">CSV Template</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Download the template to see the required format and all available fields
                </p>
                <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
              </div>
            </div>
          </div>

          {/* File Upload */}
          <div className="space-y-3">
            <label className="block">
              <div className="flex items-center justify-center w-full h-32 px-4 transition border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 border-border bg-muted/20">
                <div className="space-y-2 text-center">
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                  <div className="text-sm text-muted-foreground">
                    {file ? (
                      <span className="font-medium text-foreground">{file.name}</span>
                    ) : (
                      <>
                        <span className="font-medium text-primary">Click to upload</span> or drag and drop
                      </>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">CSV files only</p>
                </div>
              </div>
              <input
                type="file"
                className="hidden"
                accept=".csv"
                onChange={handleFileChange}
              />
            </label>

            {file && !parseResult && (
              <Button onClick={handleParseFile} disabled={parsing} className="w-full">
                {parsing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Parsing...
                  </>
                ) : (
                  'Parse CSV File'
                )}
              </Button>
            )}
          </div>

          {/* Parse Results */}
          {parseResult && (
            <div className="space-y-3">
              {parseResult.success ? (
                <Alert className="border-green-500/50 bg-green-500/10">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <AlertDescription>
                    Successfully parsed {parseResult.data?.length || 0} clients
                    {parseResult.errors?.length > 0 && ` (${parseResult.errors.length} rows skipped due to errors)`}
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="border-red-500/50 bg-red-500/10">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <AlertDescription>
                    Failed to parse CSV file
                  </AlertDescription>
                </Alert>
              )}

              {parseResult.errors && parseResult.errors.length > 0 && (
                <div className="p-3 rounded-lg bg-muted text-sm space-y-1 max-h-40 overflow-y-auto">
                  <p className="font-medium mb-2">Errors:</p>
                  {parseResult.errors.slice(0, 10).map((error: string, index: number) => (
                    <p key={index} className="text-red-500 text-xs">
                      {error}
                    </p>
                  ))}
                  {parseResult.errors.length > 10 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      ... and {parseResult.errors.length - 10} more errors
                    </p>
                  )}
                </div>
              )}

              {parseResult.success && parseResult.data && parseResult.data.length > 0 && (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-muted text-sm">
                    <p className="font-medium mb-2">Preview (first 3 clients):</p>
                    <div className="space-y-2">
                      {parseResult.data.slice(0, 3).map((client: ClientCSVRow, index: number) => (
                        <div key={index} className="flex items-center gap-2 text-xs">
                          <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                          <span className="font-medium">{client.name}</span>
                          <span className="text-muted-foreground">
                            - {client.contract_type} - {client.start_date}
                          </span>
                        </div>
                      ))}
                      {parseResult.data.length > 3 && (
                        <p className="text-xs text-muted-foreground">
                          ... and {parseResult.data.length - 3} more clients
                        </p>
                      )}
                    </div>
                  </div>

                  {!importing && !importResults && (
                    <Button onClick={handleImport} className="w-full bg-gradient-primary">
                      Import {parseResult.data.length} Clients
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Import Progress */}
          {importing && (
            <div className="space-y-3">
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription>
                  Importing clients... Please wait.
                </AlertDescription>
              </Alert>
              <Progress value={importProgress} className="w-full" />
              <p className="text-sm text-center text-muted-foreground">
                {Math.round(importProgress)}% complete
              </p>
            </div>
          )}

          {/* Import Results */}
          {importResults && (
            <div className="space-y-3">
              <Alert className="border-green-500/50 bg-green-500/10">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <AlertDescription>
                  Import completed: {importResults.success} successful, {importResults.failed} failed
                </AlertDescription>
              </Alert>

              {importResults.errors.length > 0 && (
                <div className="p-3 rounded-lg bg-muted text-sm space-y-1 max-h-40 overflow-y-auto">
                  <p className="font-medium mb-2">Import Errors:</p>
                  {importResults.errors.slice(0, 10).map((error, index) => (
                    <p key={index} className="text-red-500 text-xs">
                      {error}
                    </p>
                  ))}
                  {importResults.errors.length > 10 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      ... and {importResults.errors.length - 10} more errors
                    </p>
                  )}
                </div>
              )}

              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            </div>
          )}

          {/* Instructions */}
          <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
              <div className="space-y-2 text-sm">
                <p className="font-medium">CSV Format Instructions:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Required fields: name, contract_type, start_date</li>
                  <li>Dates must be in YYYY-MM-DD format (e.g., 2025-01-01)</li>
                  <li>Contract types: Monthly Retainer, 3-Month Retainer, 6-Month Retainer, Project-Based</li>
                  <li>Status: active, paused, or completed (defaults to active)</li>
                  <li>Instagram data is optional but will be included if provided</li>
                  <li>Use the template to ensure correct formatting</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
