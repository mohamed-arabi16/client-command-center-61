import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, Calendar, List, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  draft: '#6B7280',
  pending_approval: '#009DB0',
  approved: '#00ABAB',
  published: '#0C1439',
  revisions: '#B6DCE9',
};

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  published: 'Published',
  revisions: 'Needs Revisions',
};

export default function ContentCalendar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [filterClient, setFilterClient] = useState('all');
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);
  const [filterPlatforms, setFilterPlatforms] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .eq('user_id', user?.id)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: posts, refetch } = useQuery({
    queryKey: ['content-posts', filterClient, filterStatuses, filterPlatforms, searchQuery, dateRange],
    queryFn: async () => {
      let query = supabase
        .from('content_posts' as any)
        .select('*, clients(name)')
        .order('scheduled_time');

      if (filterClient !== 'all') {
        query = query.eq('client_id', filterClient) as any;
      }

      if (filterStatuses.length > 0) {
        query = query.in('status', filterStatuses) as any;
      }

      if (dateRange.start) {
        query = query.gte('scheduled_time', dateRange.start) as any;
      }

      if (dateRange.end) {
        query = query.lte('scheduled_time', dateRange.end) as any;
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Filter by platforms and search query on the client side
      let filteredData = data as any[];
      
      if (filterPlatforms.length > 0) {
        filteredData = filteredData.filter(post => 
          post.platforms?.some((p: string) => filterPlatforms.includes(p))
        );
      }

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredData = filteredData.filter(post =>
          post.caption?.toLowerCase().includes(query) ||
          post.clients?.name?.toLowerCase().includes(query)
        );
      }

      return filteredData;
    },
  });

  const events = posts?.map((post) => ({
    id: post.id,
    title: `${post.clients?.name} - ${post.platforms?.join(', ') || 'No platforms'}`,
    start: post.scheduled_time || post.created_at,
    backgroundColor: statusColors[post.status],
    borderColor: statusColors[post.status],
    extendedProps: post,
  })) || [];

  const handleEventClick = (info: any) => {
    setSelectedPost(info.event.extendedProps);
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedPost) return;

    try {
      const { error } = await supabase
        .from('content_posts' as any)
        .update({ status: newStatus })
        .eq('id', selectedPost.id);

      if (error) throw error;
      toast.success('Status updated');
      setSelectedPost(null);
      refetch();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async () => {
    if (!selectedPost || !confirm('Delete this post?')) return;

    try {
      const { error } = await supabase
        .from('content_posts' as any)
        .delete()
        .eq('id', selectedPost.id);

      if (error) throw error;
      toast.success('Post deleted');
      setSelectedPost(null);
      refetch();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const toggleStatus = (status: string) => {
    setFilterStatuses(prev =>
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const togglePlatform = (platform: string) => {
    setFilterPlatforms(prev =>
      prev.includes(platform) ? prev.filter(p => p !== platform) : [...prev, platform]
    );
  };

  const activeFiltersCount = filterStatuses.length + filterPlatforms.length + (filterClient !== 'all' ? 1 : 0) + (searchQuery ? 1 : 0) + (dateRange.start || dateRange.end ? 1 : 0);

  const clearAllFilters = () => {
    setFilterStatuses([]);
    setFilterPlatforms([]);
    setFilterClient('all');
    setSearchQuery('');
    setDateRange({ start: '', end: '' });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('calendar')}
            >
              <Calendar className="mr-2 h-4 w-4" />
              Calendar
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="mr-2 h-4 w-4" />
              List
            </Button>
            <Button onClick={() => navigate('/content-uploader')}>
              <Plus className="mr-2 h-4 w-4" />
              Create New Post
            </Button>
          </div>
        </div>

        {/* Collapsible Filters */}
        <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
          <Card className="mb-6 border-border/50">
            <CollapsibleTrigger className="w-full">
              <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">Filters</CardTitle>
                    {activeFiltersCount > 0 && (
                      <Badge variant="secondary" className="bg-primary/20 text-primary">
                        {activeFiltersCount}
                      </Badge>
                    )}
                  </div>
                  <ChevronDown className={`h-5 w-5 transition-transform ${isFiltersOpen ? 'rotate-180' : ''}`} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-4">
                {/* Search */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by caption or client..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Client Filter */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Client</Label>
                    <Select value={filterClient} onValueChange={setFilterClient}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Clients" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Clients</SelectItem>
                        {clients?.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Start Date */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Start Date</Label>
                    <Input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    />
                  </div>

                  {/* End Date */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">End Date</Label>
                    <Input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    />
                  </div>

                  {/* Clear All Button */}
                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearAllFilters}
                      disabled={activeFiltersCount === 0}
                      className="w-full"
                    >
                      Clear All Filters
                    </Button>
                  </div>
                </div>

                {/* Status Filters */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="flex flex-wrap gap-3">
                    {Object.entries(statusLabels).map(([status, label]) => (
                      <label
                        key={status}
                        className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors"
                      >
                        <Checkbox
                          checked={filterStatuses.includes(status)}
                          onCheckedChange={() => toggleStatus(status)}
                        />
                        <span className="text-sm">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Platform Filters */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Platforms</Label>
                  <div className="flex flex-wrap gap-3">
                    {['instagram', 'tiktok', 'facebook', 'linkedin', 'twitter'].map((platform) => (
                      <label
                        key={platform}
                        className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors"
                      >
                        <Checkbox
                          checked={filterPlatforms.includes(platform)}
                          onCheckedChange={() => togglePlatform(platform)}
                        />
                        <span className="text-sm capitalize">{platform}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Results Count */}
        <div className="mb-4 text-sm text-muted-foreground">
          Showing {posts?.length || 0} post{posts?.length !== 1 ? 's' : ''}
        </div>

        {/* Calendar View */}
        {viewMode === 'calendar' && (
          <div className="bg-card rounded-lg p-4 shadow-soft border border-border/50">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay',
              }}
              events={events}
              eventClick={handleEventClick}
              height="auto"
            />
          </div>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <div className="space-y-4">
            {posts?.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No posts found matching your filters
                </CardContent>
              </Card>
            ) : (
              posts?.map((post) => (
                <Card
                  key={post.id}
                  className="cursor-pointer hover:shadow-medium transition-shadow border-border/50"
                  onClick={() => setSelectedPost(post)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            style={{
                              backgroundColor: statusColors[post.status],
                              color: 'white',
                            }}
                          >
                            {statusLabels[post.status]}
                          </Badge>
                          {post.platforms?.map((platform: string) => (
                            <Badge key={platform} variant="outline" className="capitalize">
                              {platform}
                            </Badge>
                          ))}
                        </div>
                        <CardTitle className="text-lg">{post.clients?.name}</CardTitle>
                      </div>
                      <div className="text-sm text-muted-foreground text-right">
                        {post.scheduled_time ? (
                          <>
                            <div>{new Date(post.scheduled_time).toLocaleDateString()}</div>
                            <div>{new Date(post.scheduled_time).toLocaleTimeString()}</div>
                          </>
                        ) : (
                          'Not scheduled'
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground line-clamp-2">{post.caption}</p>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {post.media_urls?.length || 0} media file{post.media_urls?.length !== 1 ? 's' : ''}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Post Details Dialog */}
        <Dialog open={!!selectedPost} onOpenChange={() => setSelectedPost(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Post Details</DialogTitle>
            </DialogHeader>
            {selectedPost && (
              <div className="space-y-4">
                <div>
                  <Badge
                    style={{
                      backgroundColor: statusColors[selectedPost.status],
                      color: 'white',
                    }}
                  >
                    {statusLabels[selectedPost.status]}
                  </Badge>
                  {selectedPost.platforms?.map((platform: string) => (
                    <Badge key={platform} variant="outline" className="ml-2 capitalize">
                      {platform}
                    </Badge>
                  ))}
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Client</h4>
                  <p className="text-muted-foreground">{selectedPost.clients?.name}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Caption</h4>
                  <p className="text-muted-foreground whitespace-pre-wrap">{selectedPost.caption}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Media URLs</h4>
                  <ul className="space-y-1">
                    {selectedPost.media_urls?.map((url: string, i: number) => (
                      <li key={i}>
                        <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm">
                          Media {i + 1}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Scheduled Time</h4>
                  <p className="text-muted-foreground">
                    {selectedPost.scheduled_time ? new Date(selectedPost.scheduled_time).toLocaleString() : 'Not scheduled'}
                  </p>
                </div>
                {selectedPost.auto_approve_at && selectedPost.status === 'pending_approval' && (
                  <div>
                    <h4 className="font-semibold mb-2">Auto-Approve</h4>
                    <p className="text-sm text-muted-foreground">
                      Will auto-approve at: {new Date(selectedPost.auto_approve_at).toLocaleString()}
                    </p>
                  </div>
                )}
                <div className="flex gap-2 pt-4">
                  <Select value={selectedPost.status} onValueChange={handleStatusChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="pending_approval">Pending Approval</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="revisions">Revisions</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="destructive" onClick={handleDelete}>
                    Delete
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
