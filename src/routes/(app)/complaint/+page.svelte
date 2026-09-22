<script lang="ts">
  import { onMount, tick } from "svelte";
  import * as Table from "$lib/components/ui/table";
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";
  import * as Dialog from "$lib/components/ui/dialog";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { Textarea } from "$lib/components/ui/textarea";
  import { toast } from "svelte-sonner";
  import { userSession } from "$lib/session.svelte";
  import { convex } from "$lib/convexClient";
  import { api } from "../../../../convex/_generated/api";
  import { 
    ShieldAlert, 
    Plus, 
    Search, 
    MessageSquare, 
    Clock, 
    CheckCircle2, 
    AlertCircle, 
    User, 
    Send,
    LifeBuoy,
    RefreshCw,
    Store,
    Shield,
    UserCheck,
    MessageCircle,
    Building2,
    Sparkles
  } from "lucide-svelte";

  // Active User session
  let currentUser = $derived(userSession.user);
  let userId = $derived(currentUser?._id);

  // Reactive State
  let tickets = $state<any[]>([]);
  let messages = $state<any[]>([]);
  let chattableAccounts = $state<any[]>([]);

  let isLoadingTickets = $state(true);
  let isLoadingMessages = $state(false);
  let isSendingMessage = $state(false);

  let searchQuery = $state("");
  let filterTab = $state<"all" | "admin_chats" | "pharmacist_chats" | "customer_chats">("all");
  let selectedTicketId = $state<string | null>(null);

  // Modal State for New Chat / Complaint
  let isNewChatOpen = $state(false);
  let accountSearchQuery = $state("");
  let selectedTargetUser = $state<any | null>(null);
  let newChatCategory = $state("Overcharging / Refund Issue");
  let newChatTitle = $state("");
  let newChatInitialMsg = $state("");
  let replyText = $state("");

  let chatContainer: HTMLElement | null = $state(null);

  // Auto-scroll to bottom of chat
  async function scrollToBottom() {
    await tick();
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }

  // Fetch / Subscribe to Tickets
  async function loadTickets() {
    if (!userId) return;
    isLoadingTickets = true;
    try {
      const res = await convex.query(api.complaints.listUserTickets, {
        userId: userId as any,
        filterTab,
        searchQuery,
      });
      if (res) {
        tickets = res;
        if (!selectedTicketId && res.length > 0) {
          selectedTicketId = res[0]._id;
        }
      }
    } catch (err) {
      console.error("Failed to load tickets from Convex:", err);
    } finally {
      isLoadingTickets = false;
    }
  }

  // Fetch Messages for Selected Ticket
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
      console.error("Failed to load messages:", err);
    } finally {
      isLoadingMessages = false;
    }
  }

  // Load Chattable Accounts for Start Chat Modal
  async function loadChattableAccounts() {
    try {
      const accounts = await convex.query(api.complaints.listChattableAccounts, {
        userId: userId ? (userId as any) : undefined,
        searchQuery: accountSearchQuery,
      });
      if (accounts) {
        chattableAccounts = accounts;
      }
    } catch (err) {
      console.error("Failed to load chattable accounts:", err);
    }
  }

  // Subscriptions setup
  let unsubTickets: (() => void) | null = null;
  let unsubMessages: (() => void) | null = null;

  $effect(() => {
    if (userId) {
      loadTickets();
      unsubTickets?.();
      unsubTickets = convex.onUpdate(
        api.complaints.listUserTickets,
        { userId: userId as any, filterTab, searchQuery },
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

  $effect(() => {
    if (isNewChatOpen) {
      const q = accountSearchQuery;
      const uid = userId;
      convex.query(api.complaints.listChattableAccounts, {
        userId: uid ? (uid as any) : undefined,
        searchQuery: q,
      }).then((accounts) => {
        if (accounts) chattableAccounts = accounts;
      }).catch((err) => {
        console.error("Failed to load chattable accounts:", err);
      });
    }
  });

  // Selected Active Ticket Object
  let activeTicket = $derived(
    selectedTicketId ? tickets.find((t) => t._id === selectedTicketId) || null : null
  );

  // Send reply message
  async function handleSendMessage() {
    if (!replyText.trim() || !selectedTicketId || !userId) return;
    isSendingMessage = true;
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
      isSendingMessage = false;
    }
  }

  // Start a new 1-on-1 chat
  async function handleStartNewChat() {
    if (!selectedTargetUser) {
      toast.error("Please select an account to start a 1-on-1 chat.");
      return;
    }
    if (!newChatInitialMsg.trim()) {
      toast.error("Please provide an initial message.");
      return;
    }
    if (!userId) {
      toast.error("You must be logged in.");
      return;
    }

    try {
      const ticketId = await convex.mutation(api.complaints.createOrGetDirectTicket, {
        creatorId: userId as any,
        targetId: selectedTargetUser._id as any,
        category: newChatCategory,
        title: newChatTitle.trim() || `${newChatCategory}: ${selectedTargetUser.displayName}`,
        initialMessage: newChatInitialMsg.trim(),
      });

      toast.success("1-on-1 chat channel established!");
      isNewChatOpen = false;
      selectedTargetUser = null;
      newChatTitle = "";
      newChatInitialMsg = "";
      selectedTicketId = ticketId;
      await loadTickets();
    } catch (err: any) {
      toast.error(err?.message || "Failed to initiate chat.");
    }
  }

  // Toggle ticket status (Open/Resolved)
  async function handleToggleStatus() {
    if (!activeTicket) return;
    const nextStatus = activeTicket.status === "open" ? "resolved" : "open";
    try {
      await convex.mutation(api.complaints.toggleTicketStatus, {
        ticketId: activeTicket._id as any,
        status: nextStatus as any,
      });
      toast.success(`Ticket thread marked as ${nextStatus}.`);
      await loadTickets();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update status.");
    }
  }

  function formatTime(timestamp: number) {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function formatDate(timestamp: number) {
    return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
</script>

<div class="dashboard-container max-w-7xl mx-auto p-4 md:p-8 space-y-6">
  <!-- Top Header Banner -->
  <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50 pb-6">
    <div>
      <div class="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider mb-1">
        <Sparkles class="w-4 h-4" /> Live One-on-One Communication
      </div>
      <h1 class="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
        <MessageCircle class="w-8 h-8 text-primary" /> Complaint & Support Center
      </h1>
      <p class="text-muted-foreground mt-1 text-sm md:text-base">
        Direct, real-time 1-on-1 messaging for complaint resolution, order inquiries, and medication reviews.
      </p>
    </div>
    
    <Button 
      onclick={() => { isNewChatOpen = true; selectedTargetUser = null; }} 
      class="gap-2 shadow-md bg-primary text-primary-foreground font-bold px-6 h-11 text-sm"
    >
      <Plus class="w-4 h-4" /> Start 1-on-1 Chat / Complaint
    </Button>
  </div>

  <!-- Channel Filter Tabs & Search -->
  <div class="flex flex-col md:flex-row gap-4 items-center justify-between">
    <div class="flex flex-wrap gap-2">
      <Button 
        variant={filterTab === 'all' ? 'default' : 'outline'} 
        size="sm" 
        onclick={() => filterTab = 'all'} 
        class="text-xs font-semibold rounded-full px-4">
        All Chats ({tickets.length})
      </Button>

      {#if userSession.role === 'customer'}
        <Button 
          variant={filterTab === 'admin_chats' ? 'default' : 'outline'} 
          size="sm" 
          onclick={() => filterTab = 'admin_chats'} 
          class="text-xs font-semibold rounded-full px-4">
          <Shield class="w-3.5 h-3.5 mr-1.5 text-amber-500" /> Admin Support
        </Button>
        <Button 
          variant={filterTab === 'pharmacist_chats' ? 'default' : 'outline'} 
          size="sm" 
          onclick={() => filterTab = 'pharmacist_chats'} 
          class="text-xs font-semibold rounded-full px-4">
          <Store class="w-3.5 h-3.5 mr-1.5 text-blue-500" /> Pharmacy Reviews & Chats
        </Button>
      {:else if userSession.role === 'pharmacist'}
        <Button 
          variant={filterTab === 'customer_chats' ? 'default' : 'outline'} 
          size="sm" 
          onclick={() => filterTab = 'customer_chats'} 
          class="text-xs font-semibold rounded-full px-4">
          <User class="w-3.5 h-3.5 mr-1.5 text-emerald-500" /> Customer Inquiries
        </Button>
        <Button 
          variant={filterTab === 'admin_chats' ? 'default' : 'outline'} 
          size="sm" 
          onclick={() => filterTab = 'admin_chats'} 
          class="text-xs font-semibold rounded-full px-4">
          <Shield class="w-3.5 h-3.5 mr-1.5 text-amber-500" /> Admin Support
        </Button>
      {:else}
        <Button 
          variant={filterTab === 'customer_chats' ? 'default' : 'outline'} 
          size="sm" 
          onclick={() => filterTab = 'customer_chats'} 
          class="text-xs font-semibold rounded-full px-4">
          Customer Complaints
        </Button>
        <Button 
          variant={filterTab === 'pharmacist_chats' ? 'default' : 'outline'} 
          size="sm" 
          onclick={() => filterTab = 'pharmacist_chats'} 
          class="text-xs font-semibold rounded-full px-4">
          Pharmacist Channels
        </Button>
      {/if}
    </div>

    <div class="relative w-full md:w-80">
      <Search class="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input 
        bind:value={searchQuery} 
        placeholder="Search subject or pharmacy name..." 
        class="pl-9 bg-background h-9 text-xs" 
      />
    </div>
  </div>

  <!-- Main 1-on-1 Chat Container Layout -->
  <div class="flex flex-col lg:flex-row gap-0 overflow-hidden bg-card border border-border rounded-xl shadow-md min-h-[580px] h-[650px]">
    
    <!-- Left Sidebar: Chat Thread List -->
    <div class="w-full lg:w-1/3 flex flex-col border-r border-border/50 bg-muted/10 shrink-0 lg:min-w-[320px]">
      <div class="p-3.5 border-b border-border/50 bg-muted/30 flex justify-between items-center text-xs font-bold text-muted-foreground">
        <span>CONVERSATIONS ({tickets.length})</span>
        <Button variant="ghost" size="icon" class="h-6 w-6" onclick={loadTickets}>
          <RefreshCw class="w-3.5 h-3.5 {isLoadingTickets ? 'animate-spin' : ''}" />
        </Button>
      </div>

      <div class="flex-1 overflow-y-auto divide-y divide-border/40">
        {#if isLoadingTickets && tickets.length === 0}
          <div class="p-8 text-center text-muted-foreground text-xs font-medium">
            Loading conversations...
          </div>
        {:else if tickets.length === 0}
          <div class="p-8 text-center text-muted-foreground text-xs space-y-2">
            <MessageSquare class="w-8 h-8 mx-auto opacity-40 text-primary" />
            <p class="font-bold text-foreground">No active chat threads found.</p>
            <p class="text-xs opacity-75">Click "Start 1-on-1 Chat" above to begin a conversation.</p>
          </div>
        {:else}
          {#each tickets as ticket (ticket._id)}
            {@const isSelected = selectedTicketId === ticket._id}
            {@const isCustomerMe = ticket.creatorId === userId}
            {@const otherPartyDisplayName = isCustomerMe ? ticket.targetDisplayName : ticket.creatorDisplayName}
            {@const otherPartyRole = isCustomerMe ? ticket.targetRole : ticket.creatorRole}
            
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div 
              class={`p-4 cursor-pointer transition-all hover:bg-muted/40 ${isSelected ? 'bg-primary/10 border-l-4 border-l-primary' : 'border-l-4 border-l-transparent'}`}
              onclick={() => { selectedTicketId = ticket._id; }}
            >
              <div class="flex justify-between items-start mb-1.5">
                <span class="text-sm font-bold truncate pr-2 text-foreground">
                  {ticket.title}
                </span>
                <Badge variant="outline" class={`text-[11px] px-2 py-0.5 capitalize font-semibold ${ticket.status === 'open' ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300' : 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'}`}>
                  {ticket.status}
                </Badge>
              </div>

              <div class="text-xs text-primary font-semibold truncate">
                🏷️ {ticket.category}
              </div>

              <div class="flex justify-between items-end mt-3 text-xs text-muted-foreground">
                <div class="flex items-center gap-1.5 max-w-[200px] truncate font-bold text-foreground">
                  {#if otherPartyRole === 'admin'}
                    <Shield class="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  {:else if otherPartyRole === 'pharmacist'}
                    <Store class="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  {:else}
                    <User class="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  {/if}
                  <span class="truncate text-xs font-extrabold text-foreground">
                    {otherPartyDisplayName}
                  </span>
                </div>
                <div class="whitespace-nowrap text-[11px] font-medium opacity-80">
                  {formatDate(ticket.updatedAt || ticket.createdAt)}
                </div>
              </div>
            </div>
          {/each}
        {/if}
      </div>
    </div>

    <!-- Right Main Area: Active 1-on-1 Chat Stream -->
    <div class="w-full lg:w-2/3 flex flex-col bg-background relative flex-1">
      {#if activeTicket}
        {@const isMeCreator = activeTicket.creatorId === userId}
        {@const recipientDisplayName = isMeCreator ? activeTicket.targetDisplayName : activeTicket.creatorDisplayName}
        {@const recipientRole = isMeCreator ? activeTicket.targetRole : activeTicket.creatorRole}

        <!-- Chat Window Header -->
        <div class="p-4 border-b border-border/50 flex justify-between items-center bg-card shadow-sm z-10 shrink-0">
          <div>
            <div class="flex items-center gap-2">
              <h2 class="font-extrabold text-base md:text-lg text-foreground truncate max-w-md">
                {activeTicket.title}
              </h2>
              <Badge variant="outline" class="text-xs font-semibold uppercase">
                {activeTicket.category}
              </Badge>
            </div>
            <p class="text-xs md:text-sm text-muted-foreground mt-1 flex items-center gap-2">
              <span>Chatting with: <strong class="text-sm md:text-base font-black text-primary">{recipientDisplayName}</strong></span>
              <span class="capitalize bg-muted px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1">
                {#if recipientRole === 'admin'}
                  <Shield class="w-3.5 h-3.5 text-amber-500" /> Admin
                {:else if recipientRole === 'pharmacist'}
                  <Store class="w-3.5 h-3.5 text-blue-500" /> Pharmacy Store
                {:else}
                  <User class="w-3.5 h-3.5 text-emerald-500" /> Customer
                {/if}
              </span>
            </p>
          </div>

          <Button 
            variant={activeTicket.status === 'open' ? 'outline' : 'default'} 
            size="sm" 
            class="gap-1.5 text-xs font-semibold shadow-sm h-9" 
            onclick={handleToggleStatus}
          >
            {#if activeTicket.status === 'open'}
              <CheckCircle2 class="w-4 h-4 text-emerald-600" /> Mark Resolved
            {:else}
              <Clock class="w-4 h-4" /> Reopen Chat
            {/if}
          </Button>
        </div>

        <!-- Messages History Body -->
        <div 
          bind:this={chatContainer} 
          class="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-slate-50/60 dark:bg-slate-950/20"
        >
          {#if isLoadingMessages && messages.length === 0}
            <div class="p-8 text-center text-muted-foreground text-xs font-medium">
              Loading chat messages...
            </div>
          {:else if messages.length === 0}
            <div class="p-8 text-center text-muted-foreground text-xs italic">
              No messages recorded yet in this 1-on-1 thread.
            </div>
          {:else}
            {#each messages as msg (msg._id)}
              {@const isMe = msg.senderId === userId}
              
              <div class={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div class={`max-w-[80%] md:max-w-[70%] flex flex-col gap-1 ${isMe ? 'items-end' : 'items-start'}`}>
                  <div class="text-xs text-muted-foreground px-1 flex items-center gap-1.5 font-semibold">
                    <span>{isMe ? 'You' : msg.senderDisplayName}</span>
                    <span class="opacity-50 font-normal">• {formatTime(msg.timestamp)}</span>
                  </div>

                  <div class={`px-4 py-3 rounded-2xl text-sm md:text-base shadow-sm leading-relaxed ${
                    isMe 
                      ? 'bg-primary text-primary-foreground rounded-br-none font-medium' 
                      : 'bg-card border border-border/60 text-foreground rounded-bl-none font-medium'
                  }`}>
                    {msg.message}
                  </div>
                </div>
              </div>
            {/each}
          {/if}
        </div>

        <!-- Message Input Footer -->
        <div class="p-4 border-t border-border/50 bg-card shrink-0">
          <form class="flex gap-2" onsubmit={(e) => { e.preventDefault(); handleSendMessage(); }}>
            <Input 
              bind:value={replyText} 
              placeholder={activeTicket.status === 'resolved' ? "This ticket is resolved. Reopen to chat..." : "Type your message..."}
              class="flex-1 shadow-sm h-11 text-xs md:text-sm"
              disabled={activeTicket.status === 'resolved' || isSendingMessage}
            />
            <Button 
              type="submit" 
              class="gap-2 shadow-sm h-11 px-6 bg-primary text-primary-foreground font-bold"
              disabled={!replyText.trim() || activeTicket.status === 'resolved' || isSendingMessage}
            >
              <Send class="w-4 h-4" /> {isSendingMessage ? 'Sending...' : 'Send'}
            </Button>
          </form>
          {#if activeTicket.status === 'resolved'}
            <p class="text-xs text-muted-foreground mt-2 text-center font-medium">
              This 1-on-1 thread is resolved. Click "Reopen Chat" above to continue messaging.
            </p>
          {/if}
        </div>
      {:else}
        <!-- Empty State -->
        <div class="flex flex-col items-center justify-center flex-1 text-muted-foreground p-8 text-center">
          <div class="bg-primary/10 p-5 rounded-full mb-4">
            <MessageCircle class="w-12 h-12 text-primary" />
          </div>
          <h3 class="text-xl font-bold text-foreground mb-1">No Chat Selected</h3>
          <p class="text-sm max-w-sm font-medium">
            Select an existing conversation from the left sidebar or start a new 1-on-1 chat with Admin or a Pharmacy Store.
          </p>
          <Button 
            onclick={() => { isNewChatOpen = true; selectedTargetUser = null; }} 
            class="mt-5 gap-2 shadow-sm font-bold"
          >
            <Plus class="w-4 h-4" /> Start New 1-on-1 Chat
          </Button>
        </div>
      {/if}
    </div>
  </div>

  <!-- Start New 1-on-1 Chat Modal -->
  <Dialog.Root bind:open={isNewChatOpen}>
    <Dialog.Content class="sm:max-w-[550px]">
      <Dialog.Header>
        <Dialog.Title class="text-xl font-bold flex items-center gap-2">
          <MessageCircle class="w-5 h-5 text-primary" /> Start 1-on-1 Chat / Complaint
        </Dialog.Title>
        <Dialog.Description class="text-xs">
          Select an account to initiate a direct private chat thread. (Admin-Admin, Customer-Customer, and Pharmacist-Pharmacist messaging are disabled).
        </Dialog.Description>
      </Dialog.Header>

      <div class="space-y-4 py-2 text-xs">
        <!-- Account Search Input -->
        <div class="space-y-1.5">
          <Label class="font-bold text-xs">1. Select Recipient Account *</Label>
          <div class="relative">
            <Search class="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              bind:value={accountSearchQuery} 
              oninput={loadChattableAccounts}
              placeholder="Search by pharmacy shop name, email, or admin..." 
              class="pl-9 text-xs" 
            />
          </div>

          <!-- Permitted Accounts List -->
          <div class="max-h-44 overflow-y-auto border border-border rounded-md p-1 divide-y divide-border/40 mt-1 bg-muted/20">
            {#if chattableAccounts.length === 0}
              <div class="p-3 text-center text-muted-foreground text-xs font-medium">
                No matching accounts found.
              </div>
            {:else}
              {#each chattableAccounts as acc (acc._id)}
                {@const isSelected = selectedTargetUser?._id === acc._id}
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div 
                  class={`p-3 rounded-md cursor-pointer flex justify-between items-center transition-colors ${isSelected ? 'bg-primary/20 border border-primary' : 'hover:bg-muted/60'}`}
                  onclick={() => { selectedTargetUser = acc; }}
                >
                  <div class="min-w-0 pr-2">
                    <div class="font-extrabold text-foreground text-sm truncate">{acc.displayName}</div>
                    <div class="text-xs text-muted-foreground truncate">{acc.email}</div>
                  </div>
                  <Badge variant="outline" class="text-xs font-bold capitalize shrink-0">
                    {#if acc.role === 'admin'}
                      🛡️ Admin Support
                    {:else if acc.role === 'pharmacist'}
                      🏥 Pharmacy Store
                    {:else}
                      👤 Customer
                    {/if}
                  </Badge>
                </div>
              {/each}
            {/if}
          </div>
        </div>

        {#if selectedTargetUser}
          <div class="p-3 bg-primary/10 border border-primary/30 rounded-lg flex items-center justify-between text-xs font-semibold">
            <span>Recipient: <strong class="text-primary text-sm font-black">{selectedTargetUser.displayName}</strong></span>
            <Button variant="ghost" size="sm" class="h-6 text-xs font-bold" onclick={() => selectedTargetUser = null}>Change</Button>
          </div>
        {/if}

        <div class="space-y-1">
          <Label for="category" class="font-bold text-xs">2. Category</Label>
          <select 
            id="category" 
            bind:value={newChatCategory} 
            class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs font-medium"
          >
            <option value="Overcharging / Refund Issue">Overcharging / Refund Issue</option>
            <option value="Medicine Review & Inquiry">Medicine Review & Dosage Inquiry</option>
            <option value="Delayed Pickup & Order Status">Delayed Pickup & Order Status</option>
            <option value="General Complaint">General Service Complaint</option>
          </select>
        </div>

        <div class="space-y-1">
          <Label for="ticketTitle" class="font-bold text-xs">3. Subject Title *</Label>
          <Input 
            id="ticketTitle" 
            bind:value={newChatTitle} 
            placeholder="e.g. Paracetamol side effects / Overcharging query" 
            class="text-xs font-medium" 
          />
        </div>

        <div class="space-y-1">
          <Label for="initialMsg" class="font-bold text-xs">4. Initial Message *</Label>
          <Textarea 
            id="initialMsg" 
            bind:value={newChatInitialMsg} 
            placeholder="Type your initial message to start the 1-on-1 thread..." 
            class="text-xs font-medium h-20" 
          />
        </div>
      </div>

      <Dialog.Footer class="gap-2">
        <Button variant="outline" onclick={() => isNewChatOpen = false} class="text-xs">Cancel</Button>
        <Button 
          onclick={handleStartNewChat} 
          class="text-xs bg-primary text-primary-foreground font-bold px-4"
          disabled={!selectedTargetUser || !newChatInitialMsg.trim()}
        >
          Send & Start Chat
        </Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>
</div>