import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Copy, Share, Check, X, ExternalLink } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface ShareProjectModalProps {
  projectId: number;
  projectTitle: string;
  trigger?: React.ReactNode;
  isShared?: boolean;
  shareToken?: string;
}

interface ShareResponse {
  token: string;
  shareUrl: string;
  expiryDays: number;
}

export default function ShareProjectModal({ 
  projectId, 
  projectTitle, 
  trigger,
  isShared = false,
  shareToken
}: ShareProjectModalProps) {
  const [open, setOpen] = useState(false);
  const [expiryDays, setExpiryDays] = useState('30');
  const [shareData, setShareData] = useState<ShareResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();

  const generateShareLink = useMutation({
    mutationFn: async (days: number) => {
      const response = await fetch(`/api/projects/${projectId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiryDays: days })
      });
      if (!response.ok) throw new Error('Failed to generate share link');
      return response.json();
    },
    onSuccess: (data) => {
      setShareData(data);
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
      toast({
        title: "Share link generated",
        description: "Your project share link is ready to use.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate share link.",
        variant: "destructive",
      });
    }
  });

  const revokeShareLink = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/share`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to revoke share link');
      return response.json();
    },
    onSuccess: () => {
      setShareData(null);
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
      toast({
        title: "Share link revoked",
        description: "The share link has been deactivated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to revoke share link.",
        variant: "destructive",
      });
    }
  });

  const handleGenerateLink = () => {
    generateShareLink.mutate(parseInt(expiryDays));
  };

  const handleCopyLink = async () => {
    if (!shareData) return;
    
    try {
      await navigator.clipboard.writeText(shareData.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied!",
        description: "Share link copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy link.",
        variant: "destructive",
      });
    }
  };

  const handleOpenLink = () => {
    if (!shareData) return;
    window.open(shareData.shareUrl, '_blank');
  };

  const currentShareUrl = shareData?.shareUrl || (shareToken ? `${window.location.origin}/shared/${shareToken}` : '');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Share className="w-4 h-4 mr-2" />
            Share
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Project</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-sm text-gray-600">
            Share "{projectTitle}" with team members or external collaborators.
          </div>

          {(isShared || shareData) ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-800 mb-2">
                  <ExternalLink className="w-4 h-4" />
                  <span className="font-medium">Project is shared</span>
                </div>
                <div className="text-sm text-green-700">
                  Anyone with this link can view the project details.
                </div>
              </div>

              <div className="space-y-2">
                <Label>Share Link</Label>
                <div className="flex gap-2">
                  <Input
                    value={currentShareUrl}
                    readOnly
                    className="text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyLink}
                    disabled={!currentShareUrl}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenLink}
                    disabled={!currentShareUrl}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={() => revokeShareLink.mutate()}
                disabled={revokeShareLink.isPending}
                className="w-full text-red-600 hover:text-red-700"
              >
                <X className="w-4 h-4 mr-2" />
                Revoke Share Link
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Link Expiry</Label>
                <Select value={expiryDays} onValueChange={setExpiryDays}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                    <SelectItem value="365">1 year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleGenerateLink}
                disabled={generateShareLink.isPending}
                className="w-full"
              >
                <Share className="w-4 h-4 mr-2" />
                Generate Share Link
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}