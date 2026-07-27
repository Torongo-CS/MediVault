<script lang="ts">
  import * as Table from "$lib/components/ui/table";
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";
  import * as Dialog from "$lib/components/ui/dialog";
  import * as Card from "$lib/components/ui/card";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { Textarea } from "$lib/components/ui/textarea";
  import { toast } from "svelte-sonner";
  import dummyData from "../../../../convex/dummyData.json";
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
    LifeBuoy
  } from "lucide-svelte";

  // Reactive State
  let tickets = $state([...dummyData.complaintTickets]);
  let messages = $state([...dummyData.complaintMessages]);
  let users = $state([...dummyData.users]);

  let searchQuery = $state("");
  let selectedTab = $state("all");

  // Form / Modal state
  let isCreateOpen = $state(false);
  let isThreadOpen = $state(false);
  let selectedTicket = $state<any>(null);

  // New ticket form inputs
  let formTitle = $state("");
  let formCategory = $state("Overcharging");
  let formDescription = $state("");

  // Reply input
  let replyText = $state("");

  // Filtered tickets
  let filteredTickets = $derived(
    tickets.filter(t => {
      const matchesSearch = 
        t._id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.title.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (selectedTab === "open") return t.status === "open";
      if (selectedTab === "resolved") return t.status === "resolved";
      return true;
    })
  );

  // Messages for selected ticket
  let currentMessages = $derived(
    selectedTicket ? messages.filter(m => m.ticketId === selectedTicket._id) : []
  );

  function openThread(ticket: any) {
    selectedTicket = ticket;
    replyText = "";
    isThreadOpen = true;
  }

  function submitNewTicket() {
    if (!formTitle.trim() || !formDescription.trim()) {
      toast.error("Please enter both a ticket title and description.");
      return;
    }

    const newTicketId = `ticket_${Date.now()}`;
    const newTicket = {
      _id: newTicketId,
      creatorId: "user_3",
      title: `[${formCategory}] ${formTitle}`,
      status: "open",
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const newMsg = {
      _id: `msg_${Date.now()}`,
      ticketId: newTicketId,
      senderId: "user_3",
      message: formDescription,
      timestamp: Date.now()
    };

    tickets = [newTicket, ...tickets];
    messages = [...messages, newMsg];

    toast.success("Complaint ticket submitted successfully!");
    isCreateOpen = false;

    formTitle = "";
    formDescription = "";
  }

  function sendReply() {
    if (!replyText.trim() || !selectedTicket) return;

    const newMsg = {
      _id: `msg_${Date.now()}`,
      ticketId: selectedTicket._id,
      senderId: "user_3",
      message: replyText,
      timestamp: Date.now()
    };

    messages = [...messages, newMsg];
    toast.success("Response sent!");
    replyText = "";
  }

  function markResolved(ticketId: string) {
    tickets = tickets.map(t => t._id === ticketId ? { ...t, status: "resolved" } : t);
    if (selectedTicket) selectedTicket.status = "resolved";
    toast.success("Ticket marked as resolved.");
  }
</script>

<div class="dashboard-container max-w-7xl mx-auto p-4 md:p-8 space-y-8">
  <!-- Header -->
  <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50 pb-6">
    <div>
      <h1 class="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
        <LifeBuoy class="w-8 h-8 text-primary" /> Complaint & Support Center
      </h1>
      <p class="text-muted-foreground mt-1 text-sm md:text-base">
        Submit tickets, track resolution status, and resolve pharmacy or order discrepancies.
      </p>
    </div>
    <Button onclick={() => isCreateOpen = true} class="gap-2 shadow-sm bg-primary text-primary-foreground">
      <Plus class="w-4 h-4" /> Submit Complaint Ticket
    </Button>
  </div>

  <!-- Search & Filter Controls -->
  <div class="flex flex-col md:flex-row gap-4 items-center justify-between">
    <div class="flex flex-wrap gap-2">
      <Button 
        variant={selectedTab === 'all' ? 'default' : 'outline'} 
        size="sm" 
        onclick={() => selectedTab = 'all'} 
        class="text-xs rounded-full">
        All Tickets ({tickets.length})
      </Button>
      <Button 
        variant={selectedTab === 'open' ? 'default' : 'outline'} 
        size="sm" 
        onclick={() => selectedTab = 'open'} 
        class="text-xs rounded-full text-amber-600">
        Open ({tickets.filter(t => t.status === 'open').length})
      </Button>
      <Button 
        variant={selectedTab === 'resolved' ? 'default' : 'outline'} 
        size="sm" 
        onclick={() => selectedTab = 'resolved'} 
        class="text-xs rounded-full text-emerald-600">
        Resolved ({tickets.filter(t => t.status === 'resolved').length})
      </Button>
    </div>

    <div class="relative w-full md:w-80">
      <Search class="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input bind:value={searchQuery} placeholder="Search ticket ID or subject..." class="pl-9 bg-background h-9 text-xs" />
    </div>
  </div>

  <!-- Tickets Table -->
  <div class="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
    <div class="relative w-full overflow-auto">
      <Table.Root>
        <Table.Header class="bg-muted/30">
          <Table.Row>
            <Table.Head class="font-semibold text-xs pl-6">Ticket Ref & Date</Table.Head>
            <Table.Head class="font-semibold text-xs">Subject / Title</Table.Head>
            <Table.Head class="font-semibold text-xs">Submitted By</Table.Head>
            <Table.Head class="font-semibold text-xs">Status</Table.Head>
            <Table.Head class="text-right font-semibold text-xs pr-6">Action</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#if filteredTickets.length === 0}
            <Table.Row>
              <Table.Cell colspan={5} class="text-center h-40 text-muted-foreground text-sm">
                No complaint tickets match the selected filter.
              </Table.Cell>
            </Table.Row>
          {:else}
            {#each filteredTickets as ticket}
              {@const creator = users.find(u => u._id === ticket.creatorId)}
              <Table.Row class="hover:bg-muted/30 transition-colors">
                <Table.Cell class="font-mono text-xs pl-6">
                  <div class="font-bold text-foreground">{ticket._id}</div>
                  <div class="text-[11px] text-muted-foreground mt-0.5">{new Date(ticket.createdAt).toLocaleDateString()}</div>
                </Table.Cell>

                <Table.Cell class="font-semibold text-xs text-foreground max-w-xs truncate">
                  {ticket.title}
                </Table.Cell>

                <Table.Cell class="text-xs text-muted-foreground">
                  {creator ? creator.email : ticket.creatorId}
                </Table.Cell>

                <Table.Cell>
                  {#if ticket.status === 'open'}
                    <Badge variant="outline" class="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 capitalize text-xs">
                      Open
                    </Badge>
                  {:else}
                    <Badge variant="outline" class="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 capitalize text-xs">
                      Resolved
                    </Badge>
                  {/if}
                </Table.Cell>

                <Table.Cell class="text-right pr-6">
                  <Button variant="ghost" size="sm" onclick={() => openThread(ticket)} class="h-8 text-xs gap-1">
                    <MessageSquare class="w-3.5 h-3.5 text-primary" /> View Thread
                  </Button>
                </Table.Cell>
              </Table.Row>
            {/each}
          {/if}
        </Table.Body>
      </Table.Root>
    </div>
  </div>

  <!-- Create Complaint Ticket Dialog -->
  <Dialog.Root bind:open={isCreateOpen}>
    <Dialog.Content class="sm:max-w-[500px]">
      <Dialog.Header>
        <Dialog.Title class="text-xl font-bold flex items-center gap-2">
          <LifeBuoy class="w-5 h-5 text-primary" /> Submit Complaint Ticket
        </Dialog.Title>
        <Dialog.Description class="text-xs">
          Report overcharging, delivery delays, or service issues to MediVault Admin.
        </Dialog.Description>
      </Dialog.Header>

      <div class="space-y-4 py-3 text-xs">
        <div class="space-y-1">
          <Label for="category" class="text-xs font-semibold">Complaint Category</Label>
          <select id="category" bind:value={formCategory} class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs">
            <option value="Overcharging">Overcharging / Refund Issue</option>
            <option value="Delayed Pickup">Delayed Order / Pickup Issue</option>
            <option value="Medicine Discrepancy">Incorrect Medicine Received</option>
            <option value="General Inquiry">General Service Inquiry</option>
          </select>
        </div>

        <div class="space-y-1">
          <Label for="ticketTitle" class="text-xs font-semibold">Short Subject / Summary *</Label>
          <Input id="ticketTitle" bind:value={formTitle} placeholder="e.g. Overcharged $50 for Paracetamol" class="text-xs" />
        </div>

        <div class="space-y-1">
          <Label for="ticketDesc" class="text-xs font-semibold">Detailed Explanation *</Label>
          <Textarea id="ticketDesc" bind:value={formDescription} placeholder="Provide details, order ID, and receipt info..." class="text-xs h-28" />
        </div>
      </div>

      <Dialog.Footer class="gap-2">
        <Button variant="outline" onclick={() => isCreateOpen = false} class="text-xs">Cancel</Button>
        <Button onclick={submitNewTicket} class="text-xs bg-primary text-primary-foreground">
          Submit Ticket
        </Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>

  <!-- Message Thread Modal -->
  {#if selectedTicket}
    <Dialog.Root bind:open={isThreadOpen}>
      <Dialog.Content class="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <Dialog.Header>
          <div class="flex items-center justify-between">
            <Dialog.Title class="text-lg font-bold flex items-center gap-2">
              <MessageSquare class="w-5 h-5 text-primary" /> Ticket #{selectedTicket._id}
            </Dialog.Title>
            <Badge variant="outline" class={selectedTicket.status === 'open' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}>
              {selectedTicket.status}
            </Badge>
          </div>
          <Dialog.Description class="text-xs font-semibold text-foreground pt-1">
            {selectedTicket.title}
          </Dialog.Description>
        </Dialog.Header>

        <!-- Message Thread -->
        <div class="space-y-3 py-3 text-xs border-y my-2 max-h-80 overflow-y-auto">
          {#if currentMessages.length === 0}
            <p class="text-muted-foreground text-center py-6">No messages in this ticket thread yet.</p>
          {:else}
            {#each currentMessages as msg}
              {@const sender = users.find(u => u._id === msg.senderId)}
              <div class="p-3 rounded-lg border bg-muted/20 space-y-1">
                <div class="flex justify-between items-center text-[11px]">
                  <strong class="text-foreground">{sender ? sender.email : msg.senderId}</strong>
                  <span class="text-muted-foreground">{new Date(msg.timestamp).toLocaleString()}</span>
                </div>
                <p class="text-foreground leading-relaxed pt-1">{msg.message}</p>
              </div>
            {/each}
          {/if}
        </div>

        <!-- Reply bar -->
        <div class="space-y-2">
          <Label for="replyText" class="text-xs font-semibold">Post Reply</Label>
          <div class="flex gap-2">
            <Textarea id="replyText" bind:value={replyText} placeholder="Type your response here..." class="text-xs h-16" />
            <Button onclick={sendReply} class="px-4 bg-primary text-primary-foreground self-end">
              <Send class="w-4 h-4" />
            </Button>
          </div>
        </div>

        <Dialog.Footer class="gap-2 pt-2">
          {#if selectedTicket.status === 'open'}
            <Button variant="outline" onclick={() => markResolved(selectedTicket._id)} class="text-xs text-emerald-600 border-emerald-300">
              <CheckCircle2 class="w-3.5 h-3.5 mr-1" /> Mark Resolved
            </Button>
          {/if}
          <Button variant="outline" onclick={() => isThreadOpen = false} class="text-xs">Close</Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  {/if}
</div>