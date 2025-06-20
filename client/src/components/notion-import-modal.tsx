import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Download, Database, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface NotionDatabase {
  id: string;
  title: string;
  url: string;
}

interface NotionImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function NotionImportModal({ open, onOpenChange }: NotionImportModalProps) {
  const [importStatus, setImportStatus] = useState<'idle' | 'importing' | 'success' | 'error'>('idle');
  const [importResults, setImportResults] = useState<any>(null);
  const [pageUrl, setPageUrl] = useState("https://www.notion.so/Finnciti-E-Commerce-App-2022-14fb9f059197495981db722182301c42");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch available Notion databases
  const { data: databases = [], isLoading: loadingDatabases, error: databaseError } = useQuery<NotionDatabase[]>({
    queryKey: ['/api/notion/databases'],
    queryFn: async () => {
      const response = await fetch('/api/notion/databases');
      if (!response.ok) {
        throw new Error('Failed to fetch Notion databases');
      }
      return response.json();
    },
    enabled: open,
  });

  // Import projects mutation
  const importProjectsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/notion/import-projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        throw new Error('Failed to import projects');
      }
      return response.json();
    },
    onSuccess: (data) => {
      setImportStatus('success');
      setImportResults(data);
      toast({
        title: "Import successful",
        description: `Imported ${data.imported} projects from Notion`,
      });
      // Refresh projects list
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    },
    onError: (error) => {
      setImportStatus('error');
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Failed to import from Notion",
        variant: "destructive",
      });
    },
  });

  const handleImport = () => {
    setImportStatus('importing');
    importProjectsMutation.mutate();
  };

  const handleImportPage = async () => {
    if (!pageUrl) return;
    
    setImportStatus('importing');
    try {
      const response = await fetch('/api/notion/import-page', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pageUrl }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to import page');
      }
      
      const result = await response.json();
      setImportResults(result);
      setImportStatus('success');
      
      toast({
        title: "Success",
        description: `Successfully imported "${result.project.title}" from Notion`,
      });
      
      // Invalidate queries to refresh project list
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      
      // Close modal after short delay
      setTimeout(() => {
        onOpenChange(false);
      }, 1500);
      
    } catch (error) {
      console.error('Import error:', error);
      setImportStatus('error');
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to import from Notion",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    setImportStatus('idle');
    setImportResults(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Import from Notion
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Connection Status */}
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
            <div>
              <h3 className="font-medium text-blue-900">Notion Connection</h3>
              <p className="text-sm text-blue-600">
                {databaseError 
                  ? "Failed to connect to Notion" 
                  : loadingDatabases 
                    ? "Connecting to Notion..." 
                    : `Found ${databases.length} database(s)`
                }
              </p>
            </div>
            {databaseError ? (
              <AlertCircle className="w-5 h-5 text-red-500" />
            ) : loadingDatabases ? (
              <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            ) : (
              <CheckCircle className="w-5 h-5 text-green-500" />
            )}
          </div>

          {/* Direct Page Import */}
          <div>
            <h3 className="font-medium mb-3">Import Specific Page</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Notion Page URL</label>
                <input
                  type="url"
                  placeholder="https://www.notion.so/your-page-url"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={pageUrl}
                  onChange={(e) => setPageUrl(e.target.value)}
                />
              </div>
              <Button
                onClick={handleImportPage}
                disabled={!pageUrl || importStatus === 'importing'}
                className="w-full"
              >
                {importStatus === 'importing' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importing from Notion...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Import Page
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Available Databases */}
          {databases.length > 0 && (
            <div>
              <h3 className="font-medium mb-3">Available Databases</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {databases.map((db) => (
                  <Card key={db.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{db.title}</p>
                        <p className="text-sm text-gray-500">Database ID: {db.id}</p>
                      </div>
                      <Badge variant="secondary">
                        <Database className="w-3 h-3 mr-1" />
                        Database
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Import Status */}
          {importStatus !== 'idle' && (
            <div className="p-4 rounded-lg bg-gray-50">
              <div className="flex items-center gap-2 mb-2">
                {importStatus === 'importing' && <Loader2 className="w-4 h-4 animate-spin" />}
                {importStatus === 'success' && <CheckCircle className="w-4 h-4 text-green-500" />}
                {importStatus === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
                <span className="font-medium">
                  {importStatus === 'importing' && 'Importing projects...'}
                  {importStatus === 'success' && 'Import completed'}
                  {importStatus === 'error' && 'Import failed'}
                </span>
              </div>
              
              {importResults && (
                <div className="text-sm text-gray-600">
                  <p>Imported {importResults.imported} out of {importResults.total} projects</p>
                  {importResults.imported < importResults.total && (
                    <p className="text-orange-600">
                      Some projects may have been skipped due to missing data or duplicates
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Error State */}
          {databaseError && (
            <div className="p-4 bg-red-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="font-medium text-red-900">Connection Failed</span>
              </div>
              <p className="text-sm text-red-600">
                Unable to connect to Notion. Please check your integration settings and ensure 
                the page has been shared with your integration.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {importStatus === 'success' ? 'Close' : 'Cancel'}
          </Button>
          <Button 
            onClick={handleImport}
            disabled={loadingDatabases || databases.length === 0 || importStatus === 'importing' || !!databaseError}
          >
            {importStatus === 'importing' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Import Projects
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}