<script lang="ts">
  import { onMount, tick } from "svelte";
  import { Input } from "$lib/components/ui/input";
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";
  import { Search, Send, CheckCircle, Clock, MessageSquare, RefreshCw, Shield, Store, User } from "lucide-svelte";
  import { toast } from "svelte-sonner";
  import { userSession } from "$lib/session.svelte";
  import { convex } from "$lib/convexClient";
  import { api } from "../../../../../convex/_generated/api";

  // Current session user
  let currentUser = $derived(userSession.user);
  let userId = $derived(currentUser?._id);

  // Reactive State
  let tickets = $state<any[]>([]);
  let messages = $state<any[]>([]);
  let isLoadingTickets = $state(true);
  let isLoadingMessages = $state(false);
  let isSending = $state(false);

  let searchQuery = $state("");
  let filterStatus = $state<"all" | "open" | "resolved">("all");
  let selectedTicketId = $state<string | null>(null);
  let replyText = $state("");

  let chatContainer: HTMLElement | null = $state(null);

  async function scrollToBottom() {
    await tick();
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }

  async function loadTickets() {
    if (!userId) return;
    isLoadingTickets = true;
    try {
      const res = await convex.query(api.complaints.listUserTickets, {
        userId: userId as any,
        searchQuery,
      });
      if (res) {
        tickets = res;
        if (!selectedTicketId && res.length > 0) {
          selectedTicketId = res[0]._id;
        }
      }
    } catch (err) {
      console.error("Failed to load admin tickets:", err);
    } finally {
      isLoadingTickets = false;
    }
  }

  async function loadMessages(ticketId: string) {
    isLoadingMessages = true;
    try {
      const msgs = await convex.query(api.complaints.getTicketMessages, {
        ticketId: ticketId as any,
      });
      if (msgs) {
        messages = msgs;
        scrollToBottom();
      }
    } catch (err) {
      console.error("Failed to load ticket messages:", err);
    } finally {
      isLoadingMessages = false;
    }
  }

  // Realtime subscriptions
  let unsubTickets: (() => void) | null = null;
  let unsubMessages: (() => void) | null = null;

  $effect(() => {
    if (userId) {
      loadTickets();
      unsubTickets?.();
      unsubTickets = convex.onUpdate(
        api.complaints.listUserTickets,
        { userId: userId as any, searchQuery },
        (updated) => {
          if (updated) {
            tickets = updated;
            if (!selectedTicketId && updated.length > 0) {
              selectedTicketId = updated[0]._id;
            }
          }
        }
      );
    }
    return () => {
      unsubTickets?.();
    };
  });

  $effect(() => {
    if (selectedTicketId) {
      loadMessages(selectedTicketId);
      unsubMessages?.();
      unsubMessages = convex.onUpdate(
        api.complaints.getTicketMessages,
        { ticketId: selectedTicketId as any },
        (updatedMsgs) => {
          if (updatedMsgs) {
            messages = updatedMsgs;
            scrollToBottom();
          }
        }
      );
    }
    return () => {
      unsubMessages?.();
    };
  });

  // Derived filtered tickets by status
  let filteredTickets = $derived(
    tickets.filter((t) => {
      if (filterStatus === "open") return t.status === "open";
      if (filterStatus === "resolved") return t.status === "resolved";
      return true;
    })
  );

  let activeTicket = $derived(
    selectedTicketId ? tickets.find((t) => t._id === selectedTicketId) || null : null
  );

  async function sendMessage() {
    if (!replyText.trim() || !selectedTicketId || !userId) return;
    isSending = true;
    const text = replyText.trim();
    replyText = "";

    try {
      await convex.mutation(api.complaints.sendMessage, {
        ticketId: selectedTicketId as any,
        senderId: userId as any,
        message: text,
      });
      await loadMessages(selectedTicketId);
      scrollToBottom();
    } catch (err: any) {
      toast.error(err?.message || "Failed to send message.");
    } finally {
      isSending = false;
    }
  }

  async function toggleTicketStatus() {
    if (!activeTicket) return;
    const nextStatus = activeTicket.status === "open" ? "resolved" : "open";
    try {
      await convex.mutation(api.complaints.toggleTicketStatus, {
        ticketId: activeTicket._id as any,
        status: nextStatus as any,
      });
      toast.success(`Ticket status updated to ${nextStatus}.`);
      await loadTickets();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update ticket status.");
    }
  }

  function formatTime(timestamp: number) {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function formatDate(timestamp: number) {
    return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
</script>

<div class="dashboard-container max-w-7xl mx-auto flex flex-col pt-6 pb-6 px-4 sm:px-8 space-y-6">
  <!-- Header -->
  <div class="dashboard-header flex justify-between items-end border-b border-border/50 pb-4 shrink-0">
    <div>
      <h1 class="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
        <Shield class="w-8 h-8 text-amber-500" /> Admin Received Complaints & Support
      </h1>
      <p class="text-muted-foreground mt-1 text-sm md:text-base">
        Manage 1-on-1 complaint tickets and direct message streams from Customers and Pharmacy Stores.
      </p>
    </div>
    <Button variant="outline" onclick={loadTickets} class="gap-2 h-10 px-4 font-semibold text-xs">
      <RefreshCw class="w-4 h-4 {isLoadingTickets ? 'animate-spin' : ''}" /> Refresh
    </Button>
  </div>

  <!-- Main Container -->
  <div class="flex gap-0 overflow-hidden bg-card border border-border rounded-xl shadow-md h-[620px]">
    
    <!-- Sidebar: Ticket List -->
    <div class="w-1/3 flex flex-col border-r border-border/50 bg-muted/10 shrink-0 min-w-[320px]">
      <!-- Search & Status Filter -->
      <div class="p-3 border-b border-border/50 space-y-2">
        <div class="relative w-full">
          <Search class="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input bind:value={searchQuery} placeholder="Search tickets..." class="pl-9 bg-background text-xs h-9 shadow-sm" />
        </div>
        <div class="flex gap-1">
          <Button 
            variant={filterStatus === 'all' ? 'default' : 'ghost'} 
            size="sm" 
            onclick={() => filterStatus = 'all'} 
            class="text-[11px] font-semibold h-7 px-3 flex-1">
            All ({tickets.length})
          </Button>
          <Button 
            variant={filterStatus === 'open' ? 'default' : 'ghost'} 
            size="sm" 
            onclick={() => filterStatus = 'open'} 
            class="text-[11px] font-semibold h-7 px-3 flex-1 text-amber-600">
            Open
          </Button>
          <Button 
            variant={filterStatus === 'resolved' ? 'default' : 'ghost'} 
            size="sm" 
            onclick={() => filterStatus = 'resolved'} 
            class="text-[11px] font-semibold h-7 px-3 flex-1 text-emerald-600">
            Resolved
          </Button>
        </div>
      </div>
      
      <!-- Ticket List Stream -->
      <div class="flex-1 overflow-y-auto divide-y divide-border/40">
        {#each filteredTickets as ticket (ticket._id)}
          {@const isSelected = selectedTicketId === ticket._id}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div 
            class={`p-4 cursor-pointer transition-colors hover:bg-muted/40 ${isSelected ? 'bg-primary/10 border-l-4 border-l-primary' : 'border-l-4 border-l-transparent'}`}
            onclick={() => { selectedTicketId = ticket._id; }}
          >
            <div class="flex justify-between items-start mb-1.5">
              <h3 class={`font-bold text-sm truncate pr-2 ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                {ticket.title}
              </h3>
              <Badge variant="outline" class={`text-[11px] px-2 py-0.5 font-semibold capitalize ${ticket.status === 'open' ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300' : 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'}`}>
                {ticket.status}
              </Badge>
            </div>
            
            <div class="text-xs text-primary font-semibold truncate">
              🏷️ {ticket.category}
            </div>

            <div class="flex justify-between items-end mt-3 text-xs text-muted-foreground">
              <div class="flex items-center gap-1.5 max-w-[200px] truncate font-extrabold text-foreground">
                {#if ticket.creatorRole === 'pharmacist'}
                  <Store class="w-3.5 h-3.5 text-blue-500 shrink-0" />
                {:else}
                  <User class="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                {/if}
                <span class="truncate">{ticket.creatorDisplayName}</span>
              </div>
              <div class="text-[11px] font-medium opacity-80">
                {formatDate(ticket.updatedAt || ticket.createdAt)}
              </div>
            </div>
          </div>
        {/each}

        {#if filteredTickets.length === 0}
          <div class="p-8 text-center text-muted-foreground text-xs font-medium">
            No complaint tickets found.
          </div>
        {/if}
      </div>
    </div>

    <!-- Main Content: Chat Window -->
    <div class="w-2/3 flex flex-col bg-background relative flex-1">
      {#if activeTicket}
        {@const ticket = activeTicket}
        
        <!-- Header -->
        <div class="p-4 border-b border-border/50 flex justify-between items-center bg-card shadow-sm z-10 shrink-0">
          <div>
            <div class="flex items-center gap-2">
              <h2 class="font-extrabold text-base md:text-lg text-foreground truncate max-w-md">{ticket.title}</h2>
              <Badge variant="outline" class="text-xs uppercase font-semibold">{ticket.category}</Badge>
            </div>
            <p class="text-xs md:text-sm text-muted-foreground mt-1">
              From: <span class="font-black text-foreground text-sm">{ticket.creatorDisplayName}</span> 
              <span class="capitalize bg-muted px-2 py-0.5 rounded text-xs font-bold ml-1.5">{ticket.creatorRole}</span>
            </p>
          </div>
          <Button 
            variant={ticket.status === 'open' ? 'default' : 'outline'} 
            size="sm" 
            class="gap-1.5 text-xs font-semibold shadow-sm h-9" 
            onclick={toggleTicketStatus}
          >
            {#if ticket.status === 'open'}
              <CheckCircle class="w-4 h-4" /> Mark Resolved
            {:else}
              <Clock class="w-4 h-4" /> Reopen Ticket
            {/if}
          </Button>
        </div>

        <!-- Messages Area -->
        <div 
          bind:this={chatContainer} 
          class="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-slate-50/50 dark:bg-slate-950/20"
        >
          {#each messages as msg (msg._id)}
            {@const isAdmin = msg.senderRole === 'admin' || msg.senderEmail?.includes('admin')}
            <div class={`flex w-full ${isAdmin ? 'justify-end' : 'justify-start'}`}>
              <div class={`max-w-[75%] flex flex-col gap-1 ${isAdmin ? 'items-end' : 'items-start'}`}>
                <div class="text-xs text-muted-foreground px-1 font-semibold">
                  {isAdmin ? 'MediVault Admin (You)' : msg.senderDisplayName} <span class="opacity-50 font-normal">• {formatTime(msg.timestamp)}</span>
                </div>
                <div class={`px-4 py-3 rounded-2xl text-sm md:text-base shadow-sm leading-relaxed ${
                  isAdmin 
                    ? 'bg-primary text-primary-foreground rounded-br-none font-medium' 
                    : 'bg-card border border-border/50 text-foreground rounded-bl-none font-medium'
                }`}>
                  {msg.message}
                </div>
              </div>
            </div>
          {/each}

          {#if messages.length === 0}
            <div class="p-8 text-center text-muted-foreground text-xs italic">
              No messages recorded yet for this ticket.
            </div>
          {/if}
        </div>

        <!-- Chat Input -->
        <div class="p-4 border-t border-border/50 bg-card shrink-0">
          <form class="flex gap-2" onsubmit={(e) => { e.preventDefault(); sendMessage(); }}>
            <Input 
              bind:value={replyText} 
              placeholder={ticket.status === 'resolved' ? "Ticket is resolved..." : "Type official admin response..."}
              class="flex-1 shadow-sm h-11 text-xs md:text-sm font-medium"
              disabled={ticket.status === 'resolved' || isSending}
            />
            <Button type="submit" class="gap-2 shadow-sm h-11 px-6 font-bold" disabled={!replyText.trim() || ticket.status === 'resolved' || isSending}>
              <Send class="w-4 h-4" /> {isSending ? 'Sending...' : 'Send'}
            </Button>
          </form>
        </div>
      {:else}
        <!-- Empty State -->
        <div class="flex flex-col items-center justify-center flex-1 text-muted-foreground p-8 text-center">
          <div class="bg-muted p-4 rounded-full mb-4">
            <MessageSquare class="w-12 h-12 text-primary opacity-80" />
          </div>
          <p class="text-xl font-bold text-foreground mb-1">No ticket selected</p>
          <p class="text-sm font-medium">Choose a complaint ticket from the left sidebar to start responding.</p>
        </div>
      {/if}
    </div>
  </div>
</div>