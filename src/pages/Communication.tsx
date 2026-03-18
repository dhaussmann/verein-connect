import { useState, useRef, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Search, Plus, Send, Paperclip, Mail, Bell, MessageSquare, MoreHorizontal, Copy, Trash2, Users, Eye } from 'lucide-react';
import { useMessages, useMessageTemplates, useConversations } from '@/hooks/use-api';

interface Conversation {
  id: string;
  name: string;
  initials: string;
  isGroup: boolean;
  lastMessage: string;
  lastTime: string;
  unread: number;
  messages: { id: string; senderId: string; senderName: string; senderInitials: string; text: string; timestamp: string; isOwn: boolean }[];
}

const placeholderTags = ['{{vorname}}', '{{nachname}}', '{{verein}}', '{{kurs}}', '{{datum}}', '{{uhrzeit}}', '{{betrag}}'];

export default function Communication() {
  const { data: conversationsData } = useConversations();
  const { data: messagesData } = useMessages();
  const { data: templatesData } = useMessageTemplates();

  const conversations: Conversation[] = Array.isArray(conversationsData) ? conversationsData as any : [];
  const sentMessages: any[] = Array.isArray(messagesData) ? messagesData : (messagesData as any)?.data ?? [];
  const messageTemplates: any[] = Array.isArray(templatesData) ? templatesData : (templatesData as any)?.data ?? [];

  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [chatSearch, setChatSearch] = useState('');
  const [msgInput, setMsgInput] = useState('');
  const [channelFilter, setChannelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentConv = activeConv ?? conversations[0] ?? null;

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [currentConv]);

  const filteredMessages = sentMessages.filter((m: any) =>
    (channelFilter === 'all' || m.channel === channelFilter) &&
    (statusFilter === 'all' || m.status === statusFilter)
  );

  const channelIcon = (ch: string) => {
    if (ch === 'email') return <Mail className="h-4 w-4" />;
    if (ch === 'push') return <Bell className="h-4 w-4" />;
    return <MessageSquare className="h-4 w-4" />;
  };

  const statusColor = (s: string) => {
    if (s === 'Gesendet') return 'bg-success/10 text-success border-success/30';
    if (s === 'Entwurf') return 'bg-muted text-muted-foreground';
    return 'bg-warning/10 text-warning border-warning/30';
  };

  const insertTag = (tag: string) => {
    setEmailBody(prev => prev + tag);
  };

  return (
    <div>
      <PageHeader title="Kommunikation" />

      <Tabs defaultValue="messages">
        <TabsList className="mb-6">
          <TabsTrigger value="messages">Nachrichten</TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="templates">Vorlagen</TabsTrigger>
        </TabsList>

        {/* NACHRICHTEN TAB */}
        <TabsContent value="messages">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Kanal" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Kanäle</SelectItem>
                <SelectItem value="email">E-Mail</SelectItem>
                <SelectItem value="push">Push</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle</SelectItem>
                <SelectItem value="Gesendet">Gesendet</SelectItem>
                <SelectItem value="Entwurf">Entwurf</SelectItem>
                <SelectItem value="Geplant">Geplant</SelectItem>
              </SelectContent>
            </Select>
            <div className="ml-auto">
              <Button onClick={() => setEmailOpen(true)}><Plus className="h-4 w-4 mr-2" /> Neue Nachricht</Button>
            </div>
          </div>

          <Card className="border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Betreff</TableHead>
                  <TableHead className="w-16">Kanal</TableHead>
                  <TableHead>Empfänger</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMessages.map((m, i) => (
                  <TableRow key={m.id} className={i % 2 === 1 ? 'bg-muted/50' : ''}>
                    <TableCell className="font-medium">{m.subject}</TableCell>
                    <TableCell>{channelIcon(m.channel)}</TableCell>
                    <TableCell className="text-muted-foreground">{m.recipients}</TableCell>
                    <TableCell className="text-muted-foreground">{m.sentDate || '–'}</TableCell>
                    <TableCell><Badge variant="outline" className={statusColor(m.status)}>{m.status}</Badge></TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem><Eye className="h-4 w-4 mr-2" /> Öffnen</DropdownMenuItem>
                          <DropdownMenuItem><Copy className="h-4 w-4 mr-2" /> Duplizieren</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive"><Trash2 className="h-4 w-4 mr-2" /> Löschen</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* CHAT TAB */}
        <TabsContent value="chat">
          <div className="flex border border-border rounded-lg overflow-hidden h-[600px]">
            {/* Conversation List */}
            <div className="w-80 border-r border-border flex flex-col bg-card">
              <div className="p-3 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Suchen..." value={chatSearch} onChange={e => setChatSearch(e.target.value)} className="pl-9" />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {conversations.filter(c => c.name.toLowerCase().includes(chatSearch.toLowerCase())).map(conv => (
                  <button key={conv.id} onClick={() => setActiveConv(conv)}
                    className={`w-full p-3 flex items-start gap-3 text-left hover:bg-muted/50 transition-colors border-b border-border/50 ${currentConv?.id === conv.id ? 'bg-accent' : ''}`}>
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback className={conv.isGroup ? 'bg-primary text-primary-foreground text-xs' : 'bg-primary-lightest text-primary text-xs'}>{conv.initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm truncate">{conv.name}</span>
                        <span className="text-xs text-muted-foreground shrink-0">{conv.lastTime}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
                    </div>
                    {conv.unread > 0 && (
                      <Badge className="bg-primary text-primary-foreground text-xs shrink-0">{conv.unread}</Badge>
                    )}
                  </button>
                ))}
              </div>
              <div className="p-3 border-t border-border">
                <Button variant="outline" className="w-full" size="sm"><Plus className="h-4 w-4 mr-2" /> Neuer Chat</Button>
              </div>
            </div>

            {/* Chat Window */}
            <div className="flex-1 flex flex-col">
              <div className="p-3 border-b border-border flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className={currentConv?.isGroup ? 'bg-primary text-primary-foreground text-xs' : 'bg-primary-lightest text-primary text-xs'}>{currentConv?.initials ?? '?'}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium text-sm">{currentConv?.name ?? '–'}</div>
                  <div className="text-xs text-muted-foreground">{currentConv?.isGroup ? 'Gruppe' : 'Online'}</div>
                </div>
                {currentConv?.isGroup && <Badge variant="outline" className="ml-auto"><Users className="h-3 w-3 mr-1" /> Gruppe</Badge>}
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {(currentConv?.messages ?? []).map(msg => (
                  <div key={msg.id} className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] ${msg.isOwn ? 'order-1' : 'order-2'}`}>
                      {!msg.isOwn && <span className="text-xs font-medium text-primary mb-1 block">{msg.senderName}</span>}
                      <div className={`px-3 py-2 rounded-lg text-sm ${msg.isOwn ? 'bg-accent text-accent-foreground' : 'bg-muted text-foreground'}`}>
                        {msg.text}
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-0.5 block">{msg.timestamp}</span>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-3 border-t border-border flex items-end gap-2">
                <Button variant="ghost" size="icon"><Paperclip className="h-4 w-4" /></Button>
                <Textarea placeholder="Nachricht schreiben..." value={msgInput} onChange={e => setMsgInput(e.target.value)}
                  className="min-h-[40px] max-h-[120px] resize-none" rows={1}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); setMsgInput(''); } }} />
                <Button size="icon" disabled={!msgInput.trim()} onClick={() => setMsgInput('')}><Send className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* VORLAGEN TAB */}
        <TabsContent value="templates">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {messageTemplates.map(t => (
              <Card key={t.id} className="border border-border">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{t.name}</CardTitle>
                    {channelIcon(t.channel)}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-1 font-medium">{t.subject}</p>
                  <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-line">{t.body}</p>
                  <Button variant="outline" size="sm" className="mt-3 w-full">Bearbeiten</Button>
                </CardContent>
              </Card>
            ))}
            <Card className="border-2 border-dashed border-border flex items-center justify-center min-h-[200px] cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="text-center text-muted-foreground">
                <Plus className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm font-medium">Neue Vorlage</p>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* EMAIL COMPOSER DIALOG */}
      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Neue Nachricht</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">An:</label>
              <Input placeholder="Empfänger, Rollen oder Gruppen eingeben..." />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Betreff:</label>
              <Input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder="Betreff eingeben..." />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Vorlage laden:</label>
              <Select onValueChange={v => {
                const t = messageTemplates.find(x => x.id === v);
                if (t) { setEmailSubject(t.subject); setEmailBody(t.body); }
              }}>
                <SelectTrigger><SelectValue placeholder="Vorlage wählen..." /></SelectTrigger>
                <SelectContent>
                  {messageTemplates.filter(t => t.channel === 'email').map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Platzhalter:</label>
              <div className="flex flex-wrap gap-2">
                {placeholderTags.map(tag => (
                  <Button key={tag} variant="outline" size="sm" onClick={() => insertTag(tag)} className="text-xs">{tag}</Button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Nachricht:</label>
              <Textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} rows={10} placeholder="Nachrichtentext..." />
            </div>
            <div className="text-xs text-muted-foreground border-t border-border pt-3">
              Mit sportlichen Grüßen,<br />Max Vereinsadmin<br />TSV Beispielverein 1900 e.V.
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="ghost" onClick={() => setEmailOpen(false)}>Als Entwurf speichern</Button>
            <Button variant="outline">Senden planen</Button>
            <Button><Send className="h-4 w-4 mr-2" /> Jetzt senden</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
