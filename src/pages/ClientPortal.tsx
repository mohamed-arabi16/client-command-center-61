import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

export default function ClientPortal() {
  const { user } = useAuth();
  const [feedbackText, setFeedbackText] = useState<Record<string, string>>({});
  const [showFeedback, setShowFeedback] = useState<Record<string, boolean>>({});

  const { data: clientData } = useQuery({
    queryKey: ['client-user-data'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_users' as any)
        .select('client_id, clients(id, name, logo_url)')
        .eq('user_id', user?.id)
        .single();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: pendingPosts, refetch } = useQuery({
    queryKey: ['pending-posts', clientData?.client_id],
    queryFn: async () => {
      if (!clientData?.client_id) return [];
      const { data, error } = await supabase
        .from('content_posts' as any)
        .select('*, approval_feedback(*)')
        .eq('client_id', clientData.client_id)
        .in('status', ['pending_approval', 'revisions'])
        .order('scheduled_time');
      if (error) throw error;
      return data as any[];
    },
    enabled: !!clientData?.client_id,
  });

  const { data: approvedPosts } = useQuery({
    queryKey: ['approved-posts', clientData?.client_id],
    queryFn: async () => {
      if (!clientData?.client_id) return [];
      const { data, error } = await supabase
        .from('content_posts' as any)
        .select('*')
        .eq('client_id', clientData.client_id)
        .eq('status', 'approved')
        .order('scheduled_time')
        .limit(10);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!clientData?.client_id,
  });

  const handleApprove = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('content_posts' as any)
        .update({ status: 'approved' })
        .eq('id', postId);

      if (error) throw error;
      toast.success('Post approved successfully');
      refetch();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleRequestChanges = async (postId: string) => {
    const feedback = feedbackText[postId];
    if (!feedback?.trim()) {
      toast.error('Please provide feedback');
      return;
    }

    try {
      const { error: feedbackError } = await supabase
        .from('approval_feedback' as any)
        .insert({
          post_id: postId,
          client_id: clientData?.client_id,
          feedback_by: user?.id,
          feedback_text: feedback,
        });

      if (feedbackError) throw feedbackError;

      const { error: updateError } = await supabase
        .from('content_posts' as any)
        .update({ status: 'revisions' })
        .eq('id', postId);

      if (updateError) throw updateError;

      toast.success('Feedback submitted');
      setFeedbackText({ ...feedbackText, [postId]: '' });
      setShowFeedback({ ...showFeedback, [postId]: false });
      refetch();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const getTimeUntilAutoApprove = (autoApproveAt: string | null) => {
    if (!autoApproveAt) return null;
    const now = new Date();
    const deadline = new Date(autoApproveAt);
    const diff = deadline.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (diff <= 0) return 'Auto-approving soon...';
    return `Auto-approves in ${hours}h ${minutes}m`;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">Setup Required</h3>
                <p className="text-sm text-blue-800">
                  The client portal requires setup by your agency. Please contact your account manager to link your user account to view and approve content.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Welcome, {clientData?.clients?.name || 'Client'}
          </h1>
          <p className="text-muted-foreground">
            Review and approve your scheduled content
          </p>
        </div>

        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">Pending Approval</h2>
            {!pendingPosts?.length ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No posts pending approval
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {pendingPosts.map((post) => (
                  <Card key={post.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex flex-wrap gap-2 items-center">
                          {post.platforms?.map((platform: string) => (
                            <Badge key={platform} variant="secondary" className="capitalize">
                              {platform}
                            </Badge>
                          ))}
                          Post
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            <Clock className="h-3 w-3 mr-1" />
                            {getTimeUntilAutoApprove(post.auto_approve_at)}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2">Caption</h4>
                        <p className="text-muted-foreground whitespace-pre-wrap">{post.caption}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Media</h4>
                        <div className="space-y-1">
                          {post.media_urls?.map((url: string, i: number) => (
                            <a
                              key={i}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-primary hover:underline text-sm"
                            >
                              View Media {i + 1}
                            </a>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Scheduled For</h4>
                        <p className="text-muted-foreground">
                          {post.scheduled_time ? new Date(post.scheduled_time).toLocaleString() : 'Not scheduled'}
                        </p>
                      </div>

                      {post.approval_feedback?.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-2">Previous Feedback</h4>
                          <div className="space-y-2">
                            {post.approval_feedback.map((fb: any) => (
                              <div key={fb.id} className="bg-muted p-3 rounded text-sm">
                                <p>{fb.feedback_text}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {new Date(fb.created_at).toLocaleString()}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {showFeedback[post.id] && (
                        <div className="space-y-2">
                          <Textarea
                            placeholder="Enter your feedback..."
                            value={feedbackText[post.id] || ''}
                            onChange={(e) => setFeedbackText({ ...feedbackText, [post.id]: e.target.value })}
                            rows={4}
                          />
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleApprove(post.id)}
                          className="flex-1"
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Approve
                        </Button>
                        {!showFeedback[post.id] ? (
                          <Button
                            onClick={() => setShowFeedback({ ...showFeedback, [post.id]: true })}
                            variant="outline"
                            className="flex-1"
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Request Changes
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleRequestChanges(post.id)}
                            variant="outline"
                            className="flex-1"
                          >
                            Submit Feedback
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Recently Approved</h2>
            {!approvedPosts?.length ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No approved posts yet
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {approvedPosts.map((post) => (
                  <Card key={post.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex flex-wrap gap-2 items-center">
                          {post.platforms?.map((platform: string) => (
                            <Badge key={platform} variant="secondary" className="capitalize">
                              {platform}
                            </Badge>
                          ))}
                          Post
                        </CardTitle>
                        <Badge variant="default">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Approved
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground line-clamp-3">{post.caption}</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Scheduled: {post.scheduled_time ? new Date(post.scheduled_time).toLocaleString() : 'TBD'}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
