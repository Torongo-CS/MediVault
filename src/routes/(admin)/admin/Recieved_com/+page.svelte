<script lang="ts">
  import { onMount } from "svelte";
  import { Input } from "$lib/components/ui/input";
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";
  import { Search, Send, CheckCircle, Clock, MessageSquare, RefreshCw } from "lucide-svelte";
  import dummyData from "../../../../../convex/dummyData.json";
  import { toast } from "svelte-sonner";
  import { convex } from "$lib/convexClient";
  import { api } from "../../../../../convex/_generated/api";

  // Reactive State
  let tickets = $state<any[]>([...dummyData.complaintTickets]);
  let messages = $state<any[]>([...dummyData.complaintMessages]);
  let isLoading = $state(true);
  let isSending = $state(false);

  let searchQuery = $state("");
  let selectedTicketId = $state<string | null>(null);
  let replyText = $state("");

  async function fetchTickets() {
    isLoading = true;
    try {
      const res = await convex.query(api.admin.listComplaintTickets, {});
      if (res && res.length > 0) {
        tickets = res;
        if (!selectedTicketId) {
          selectedTicketId = res[0]._id;
        }
      }
    } catch (err) {
      console.warn("Using local fallback complaint data:", err);
    } finally {
      isLoading = false;
    }
  }

  async function fetchMessages(ticketId: string) {
    try {
      const msgs = await convex.query(api.admin.getComplaintMessages, { ticketId: ticketId as any });
      if (msgs && msgs.length > 0) {
        // Merge or update messages list
        const existingOther = messages.filter(m => m.ticketId !== ticketId);
        messages = [...existingOther, ...msgs];
      }
    } catch (err) {
      console.warn("Using local fallback message data:", err);
    }
  }

  onMount(() => {
    fetchTickets();
    const unsubscribe = convex.onUpdate(api.admin.listComplaintTickets, {}, (updated) => {
      if (updated) tickets = updated;
    });
    return () => unsubscribe();
  });

  $effect(() => {
    if (selectedTicketId) {
      fetchMessages(selectedTicketId);
    }
  });

  // Filtered tickets for search
  let filteredTickets = $derived(
    tickets.filter(t => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        (t.creatorEmail && t.creatorEmail.toLowerCase().includes(q)) ||
        (t.creatorName && t.creatorName.toLowerCase().includes(q))
      );
    })
  );

  // Active ticket messages
  let activeMessages = $derived(
    selectedTicketId
      ? messages
          .filter(m => m.ticketId === selectedTicketId)
          .sort((a, b) => a.timestamp - b.timestamp)
      : []
  );

  let activeTicket = $derived(
    selectedTicketId
      ? tickets.find(t => t._id === selectedTicketId) || null
      : null
  );

  function selectTicket(id: string) {
    selectedTicketId = id;
    replyText = "";
    fetchMessages(id);
  }

  async function sendMessage() {
    if (!replyText.trim() || !selectedTicketId) return;

    isSending = true;
    const text = replyText.trim();
    replyText = "";

    try {
      // Find admin user or use default
      const adminUsers = await convex.query(api.admin.listUsers, { role: "admin" });
      const adminId = adminUsers && adminUsers.length > 0 ? adminUsers[0]._id : (tickets[0]?.creatorId);

      if (adminId) {
        await convex.mutation(api.admin.sendAdminReply, {
          ticketId: selectedTicketId as any,
          adminId: adminId as any,
          message: text,
        });

        // Refresh messages
        await fetchMessages(selectedTicketId);
        toast.success("Reply sent successfully");
      }
    } catch (err: any) {
      // Fallback local update if offline
      const newMessage = {
        _id: `msg_${Date.now()}`,
        ticketId: selectedTicketId,
        senderId: "admin_1",
        senderEmail: "admin@medivault.com",
        senderRole: "admin",
        message: text,
        timestamp: Date.now()
      };
      messages = [...messages, newMessage];
      toast.success("Reply sent (local state)");
    } finally {
      isSending = false;
    }
  }

  async function toggleTicketStatus() {
    const ticket = activeTicket;
    if (!ticket) return;
    const nextStatus = ticket.status === "open" ? "resolved" : "open";
    
    try {
      await convex.mutation(api.admin.toggleTicketStatus, {
        ticketId: ticket._id as any,
        status: nextStatus as any,
      });

      tickets = tickets.map(t =>
        t._id === ticket._id ? { ...t, status: nextStatus, updatedAt: Date.now() } : t
      );
      toast.success(`Ticket marked as ${nextStatus}`);
    } catch (err: any) {
      tickets = tickets.map(t =>
        t._id === ticket._id ? { ...t, status: nextStatus, updatedAt: Date.now() } : t
      );
      toast.success(`Ticket status updated to ${nextStatus}`);
    }
  }

  // Utilities
  function formatTime(timestamp: number) {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  function formatDate(timestamp: number) {
    return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
</script>

<div class="dashboard-container max-w-7xl mx-auto flex flex-col pt-6 pb-6 px-4 sm:px-8">
  <div class="dashboard-header flex justify-between items-end mb-6 border-b border-border/50 pb-4 shrink-0">
    <div>
      <h1 class="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">Complaints & Support Tickets</h1>
      <p class="text-muted-foreground mt-1 text-sm md:text-base">Manage customer inquiries and respond via Convex DB messaging.</p>
    </div>
    <Button variant="outline" onclick={fetchTickets} class="gap-2 h-10 px-4">
      <RefreshCw class="w-4 h-4 {isLoading ? 'animate-spin' : ''}" /> Refresh
    </Button>
  </div>

  <div class="flex gap-0 overflow-hidden bg-card border border-border rounded-xl shadow-md h-[600px]">
    
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
        {#each filteredTickets as ticket}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div 
            class={`p-4 border-b border-border/50 cursor-pointer transition-colors hover:bg-muted/50 ${selectedTicketId === ticket._id ? 'bg-primary/10 border-l-4 border-l-primary' : 'border-l-4 border-l-transparent'}`}
            onclick={() => selectTicket(ticket._id)}
          >
            <div class="flex justify-between items-start mb-1">
              <h3 class={`font-semibold text-sm truncate pr-2 ${selectedTicketId === ticket._id ? 'text-primary font-bold' : 'text-foreground'}`}>
                {ticket.title}
              </h3>
              <Badge variant="outline" class={`text-[10px] px-2 py-0 font-semibold tracking-wide ${ticket.status === 'open' ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                {ticket.status}
              </Badge>
            </div>
            <div class="flex justify-between items-end mt-3">
              <div class="text-xs text-muted-foreground truncate max-w-[150px]">
                {ticket.creatorEmail || ticket.creatorName || "User"}
              </div>
              <div class="text-[10px] text-muted-foreground whitespace-nowrap">
                {formatDate(ticket.updatedAt || ticket.createdAt)}
              </div>
            </div>
          </div>
        {/each}
        {#if filteredTickets.length === 0}
          <div class="p-8 text-center text-muted-foreground text-sm">
            No tickets found.
          </div>
        {/if}
      </div>
    </div>

    <!-- Main Content: Chat Window -->
    <div class="w-2/3 flex flex-col bg-background relative flex-1">
      {#if activeTicket}
        {@const ticket = activeTicket}
        
        <!-- Chat Header -->
        <div class="p-5 border-b border-border/50 flex justify-between items-center bg-card shadow-sm z-10 shrink-0">
          <div>
            <h2 class="font-bold text-lg text-foreground">{ticket.title}</h2>
            <p class="text-sm text-muted-foreground mt-0.5">
              Reported by <span class="font-medium">{ticket.creatorEmail || "User"}</span> 
              <span class="capitalize bg-muted px-1.5 py-0.5 rounded text-xs ml-1 font-semibold">{ticket.creatorRole || "customer"}</span>
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
          {#each activeMessages as msg}
            {@const isAdmin = msg.senderRole === 'admin' || msg.senderEmail?.includes('admin')}
            <div class={`flex w-full ${isAdmin ? 'justify-end' : 'justify-start'}`}>
              <div class={`max-w-[75%] flex flex-col gap-1 ${isAdmin ? 'items-end' : 'items-start'}`}>
                <div class="text-xs text-muted-foreground px-1 font-medium">
                  {isAdmin ? 'MediVault Admin' : (msg.senderEmail || 'User')} <span class="opacity-50 ml-1 font-normal">• {formatTime(msg.timestamp)}</span>
                </div>
                <div class={`px-4 py-2.5 rounded-2xl text-sm shadow-sm leading-relaxed ${
                  isAdmin 
                    ? 'bg-primary text-primary-foreground rounded-br-sm font-medium' 
                    : 'bg-card border border-border/50 text-foreground rounded-bl-sm'
                }`}>
                  {msg.message}
                </div>
              </div>
            </div>
          {/each}
          {#if activeMessages.length === 0}
            <div class="p-8 text-center text-muted-foreground text-sm italic">
              No messages recorded yet for this ticket.
            </div>
          {/if}
        </div>

        <!-- Chat Input -->
        <div class="p-4 border-t border-border/50 bg-card shrink-0">
          <form class="flex gap-3" onsubmit={(e) => { e.preventDefault(); sendMessage(); }}>
            <Input 
              bind:value={replyText} 
              placeholder={ticket.status === 'resolved' ? "Ticket is resolved..." : "Type your official response here..."}
              class="flex-1 shadow-sm h-11"
              disabled={ticket.status === 'resolved' || isSending}
            />
            <Button type="submit" class="gap-2 shadow-sm h-11 px-6" disabled={!replyText.trim() || ticket.status === 'resolved' || isSending}>
              <Send class="w-4 h-4" /> {isSending ? 'Sending...' : 'Send'}
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
          <p class="text-sm">Choose a complaint from the sidebar to view the conversation history.</p>
        </div>
      {/if}
    </div>
  </div>
</div>