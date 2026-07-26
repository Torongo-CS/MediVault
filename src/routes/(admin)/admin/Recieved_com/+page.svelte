<script lang="ts">
  import { Input } from "$lib/components/ui/input";
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";
  import { Search, Send, CheckCircle, Clock, MessageSquare } from "lucide-svelte";
  import dummyData from "../../../../../convex/dummyData.json";
  import { toast } from "svelte-sonner";

  // Reactive State mimicking DB
  let tickets = $state([...dummyData.complaintTickets]);
  let messages = $state([...dummyData.complaintMessages]);
  const users = dummyData.users;
  
  // The current logged in admin (dummy)
  const currentAdmin = users.find(u => u.role === "admin") || users[0];

  let searchQuery = $state("");
  let selectedTicketId = $state<string | null>(null);
  let replyText = $state("");

  // Derived processed tickets with user info for the sidebar
  let processedTickets = $derived(() => {
    return tickets.map(ticket => {
      const creator = users.find(u => u._id === ticket.creatorId);
      return {
        ...ticket,
        creatorEmail: creator ? creator.email : "Unknown User",
        creatorRole: creator ? creator.role : "Unknown",
      };
    }).sort((a, b) => b.updatedAt - a.updatedAt);
  });

  // Filtered tickets for search
  let filteredTickets = $derived(() => {
    const list = processedTickets();
    if (!searchQuery) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(t => 
      t.title.toLowerCase().includes(q) || 
      t.creatorEmail.toLowerCase().includes(q)
    );
  });

  // Active ticket messages
  let activeMessages = $derived(() => {
    if (!selectedTicketId) return [];
    return messages
      .filter(m => m.ticketId === selectedTicketId)
      .map(m => {
        const sender = users.find(u => u._id === m.senderId);
        return {
          ...m,
          senderRole: sender?.role || "customer",
          senderEmail: sender?.email || "Unknown"
        };
      })
      .sort((a, b) => a.timestamp - b.timestamp); // Oldest first
  });

  let activeTicket = $derived(() => {
    if (!selectedTicketId) return null;
    return processedTickets().find(t => t._id === selectedTicketId);
  });

  function selectTicket(id: string) {
    selectedTicketId = id;
    replyText = ""; // Reset reply input when switching tickets
  }

  function sendMessage() {
    if (!replyText.trim() || !selectedTicketId) return;

    const newMessage = {
      _id: `msg_${Date.now()}`,
      ticketId: selectedTicketId,
      senderId: currentAdmin._id,
      message: replyText,
      timestamp: Date.now()
    };
    
    messages = [...messages, newMessage];
    
    // Update ticket updatedAt
    tickets = tickets.map(t => 
      t._id === selectedTicketId ? { ...t, updatedAt: Date.now() } : t
    );

    replyText = "";
  }

  function toggleTicketStatus() {
    const ticket = activeTicket();
    if (!ticket) return;
    const newStatus = ticket.status === "open" ? "resolved" : "open";
    
    tickets = tickets.map(t => 
      t._id === ticket._id ? { ...t, status: newStatus as any, updatedAt: Date.now() } : t
    );
    toast.success(`Ticket marked as ${newStatus}`);
  }

  // Utilities
  function formatTime(timestamp: number) {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  function formatDate(timestamp: number) {
    return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
</script>

<div class="dashboard-container max-w-7xl mx-auto h-[calc(100vh-2rem)] flex flex-col pt-8 pb-8 px-4 sm:px-8">
  <div class="dashboard-header flex justify-between items-end mb-8 border-b border-border/50 pb-6 shrink-0">
    <div>
      <h1 class="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">Complaints Support</h1>
      <p class="text-muted-foreground mt-2 text-base md:text-lg">Manage and respond to user and pharmacy tickets.</p>
    </div>
  </div>

  <div class="flex flex-1 gap-0 overflow-hidden bg-card border border-border rounded-xl shadow-md min-h-[500px]">
    
    <!-- Sidebar: Ticket List -->
    <div class="w-1/3 flex flex-col border-r border-border/50 bg-muted/10 shrink-0 min-w-[300px]">
      <!-- Search -->
      <div class="p-4 border-b border-border/50">
        <div class="relative w-full">
          <Search class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input bind:value={searchQuery} placeholder="Search tickets..." class="pl-10 bg-background shadow-sm" />
        </div>
      </div>
      
      <!-- List -->
      <div class="flex-1 overflow-y-auto">
        {#each filteredTickets() as ticket}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div 
            class={`p-4 border-b border-border/50 cursor-pointer transition-colors hover:bg-muted/50 ${selectedTicketId === ticket._id ? 'bg-primary/5 border-l-4 border-l-primary' : 'border-l-4 border-l-transparent'}`}
            onclick={() => selectTicket(ticket._id)}
          >
            <div class="flex justify-between items-start mb-1">
              <h3 class={`font-semibold text-sm truncate pr-2 ${selectedTicketId === ticket._id ? 'text-primary' : 'text-foreground'}`}>
                {ticket.title}
              </h3>
              <Badge variant="outline" class={`text-[10px] px-2 py-0 font-semibold tracking-wide ${ticket.status === 'open' ? 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                {ticket.status}
              </Badge>
            </div>
            <div class="flex justify-between items-end mt-3">
              <div class="text-xs text-muted-foreground truncate max-w-[150px]">
                {ticket.creatorEmail}
              </div>
              <div class="text-[10px] text-muted-foreground whitespace-nowrap">
                {formatDate(ticket.updatedAt)}
              </div>
            </div>
          </div>
        {/each}
        {#if filteredTickets().length === 0}
          <div class="p-8 text-center text-muted-foreground text-sm">
            No tickets found.
          </div>
        {/if}
      </div>
    </div>

    <!-- Main Content: Chat Window -->
    <div class="w-2/3 flex flex-col bg-background relative flex-1">
      {#if activeTicket()}
        {@const ticket = activeTicket()!}
        
        <!-- Chat Header -->
        <div class="p-5 border-b border-border/50 flex justify-between items-center bg-card shadow-sm z-10 shrink-0">
          <div>
            <h2 class="font-bold text-lg text-foreground">{ticket.title}</h2>
            <p class="text-sm text-muted-foreground mt-0.5">
              Reported by <span class="font-medium">{ticket.creatorEmail}</span> 
              <span class="capitalize bg-muted px-1.5 py-0.5 rounded text-xs ml-1">{ticket.creatorRole}</span>
            </p>
          </div>
          <Button variant={ticket.status === 'open' ? 'default' : 'outline'} size="sm" class="gap-2 shadow-sm" onclick={toggleTicketStatus}>
            {#if ticket.status === 'open'}
              <CheckCircle class="w-4 h-4" /> Mark Resolved
            {:else}
              <Clock class="w-4 h-4" /> Reopen Ticket
            {/if}
          </Button>
        </div>

        <!-- Messages Area -->
        <div class="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 dark:bg-slate-950/20">
          {#each activeMessages() as msg}
            {@const isAdmin = msg.senderRole === 'admin'}
            <div class={`flex w-full ${isAdmin ? 'justify-end' : 'justify-start'}`}>
              <div class={`max-w-[75%] flex flex-col gap-1 ${isAdmin ? 'items-end' : 'items-start'}`}>
                <div class="text-xs text-muted-foreground px-1 font-medium">
                  {isAdmin ? 'You' : msg.senderEmail} <span class="opacity-50 ml-1 font-normal">• {formatTime(msg.timestamp)}</span>
                </div>
                <div class={`px-4 py-2.5 rounded-2xl text-sm shadow-sm leading-relaxed ${
                  isAdmin 
                    ? 'bg-primary text-primary-foreground rounded-br-sm' 
                    : 'bg-card border border-border/50 text-foreground rounded-bl-sm'
                }`}>
                  {msg.message}
                </div>
              </div>
            </div>
          {/each}
        </div>

        <!-- Chat Input -->
        <div class="p-4 border-t border-border/50 bg-card shrink-0">
          <form class="flex gap-3" onsubmit={(e) => { e.preventDefault(); sendMessage(); }}>
            <Input 
              bind:value={replyText} 
              placeholder={ticket.status === 'resolved' ? "Ticket is resolved..." : "Type your reply here..."}
              class="flex-1 shadow-sm h-11"
              disabled={ticket.status === 'resolved'}
            />
            <Button type="submit" class="gap-2 shadow-sm h-11 px-6" disabled={!replyText.trim() || ticket.status === 'resolved'}>
              <Send class="w-4 h-4" /> Send
            </Button>
          </form>
          {#if ticket.status === 'resolved'}
            <p class="text-xs text-muted-foreground mt-3 text-center">This ticket has been resolved. Reopen the ticket to send further messages.</p>
          {/if}
        </div>
      {:else}
        <!-- Empty State -->
        <div class="flex flex-col items-center justify-center flex-1 text-muted-foreground opacity-60">
          <div class="bg-muted p-4 rounded-full mb-4">
            <MessageSquare class="w-12 h-12 text-primary opacity-80" />
          </div>
          <p class="text-xl font-semibold text-foreground mb-1">No ticket selected</p>
          <p class="text-sm">Choose a complaint from the sidebar to view the conversation.</p>
        </div>
      {/if}
    </div>
  </div>
</div>