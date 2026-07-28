<!-- routes/(app)/prescriptions/+page.svelte -->
<script lang="ts">
  import PageHeader from "$lib/components/shared/PageHeader.svelte";
  import EmptyState from "$lib/components/shared/EmptyState.svelte";
  import * as Card from "$lib/components/ui/card";
  import * as Dialog from "$lib/components/ui/dialog";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Textarea } from "$lib/components/ui/textarea";
  import { Upload, FileText, Trash2, Eye, Sparkles, Calendar, FileImage, Plus } from "lucide-svelte";

  interface Prescription { id: string; fileName: string; notes: string; uploadedAt: number; }

  let prescriptions = $state<Prescription[]>([
    { id: "rx-1", fileName: "dr_ahmed_prescription.pdf", notes: "Monthly refill — Blood pressure medication", uploadedAt: Date.now() - 5 * 24 * 60 * 60 * 1000 },
    { id: "rx-2", fileName: "lab_report_july.jpg", notes: "Lab results for follow-up visit", uploadedAt: Date.now() - 12 * 24 * 60 * 60 * 1000 },
    { id: "rx-3", fileName: "antibiotic_prescription.png", notes: "", uploadedAt: Date.now() - 20 * 24 * 60 * 60 * 1000 },
  ]);

  let showUploadDialog = $state(false);
  let viewingPrescription = $state<Prescription | null>(null);
  let uploadFileName = $state("");
  let uploadNotes = $state("");
  let isDragging = $state(false);

  function formatDate(ts: number): string {
    return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function handleUpload() {
    if (!uploadFileName.trim()) return;
    prescriptions = [{ id: `rx-${Date.now()}`, fileName: uploadFileName, notes: uploadNotes, uploadedAt: Date.now() }, ...prescriptions];
    uploadFileName = "";
    uploadNotes = "";
    showUploadDialog = false;
  }

  function handleDelete(id: string) {
    if (confirm("Delete this prescription? This cannot be undone.")) {
      prescriptions = prescriptions.filter((p) => p.id !== id);
    }
  }
</script>

<div class="page-root">
  <PageHeader title="Prescription Vault" subtitle="Securely store and manage your prescriptions" showBack={true} backHref="/dashboard">
    {#snippet actions()}
      <Button class="text-xs font-semibold gap-1.5" onclick={() => (showUploadDialog = true)}>
        <Plus class="h-3.5 w-3.5" />
        Upload Prescription
      </Button>
    {/snippet}
  </PageHeader>

  <!-- Upload Drop Zone -->
  <div
    class="upload-dropzone {isDragging ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-border hover:border-primary/40 hover:bg-muted/30'}"
    role="button"
    tabindex="0"
    ondragover={(e) => { e.preventDefault(); isDragging = true; }}
    ondragleave={() => (isDragging = false)}
    ondrop={(e) => { e.preventDefault(); isDragging = false; showUploadDialog = true; }}
    onclick={() => (showUploadDialog = true)}
    onkeydown={(e) => { if (e.key === 'Enter') showUploadDialog = true; }}
  >
    <div class="flex flex-col items-center gap-3">
      <div class="upload-dropzone__icon">
        <Upload class="h-6 w-6 text-primary" />
      </div>
      <div>
        <p class="upload-dropzone__title">Drop files here or click to upload</p>
        <p class="upload-dropzone__hint">Supports PDF, JPG, PNG — max 10MB</p>
      </div>
    </div>
  </div>

  <!-- Prescriptions Grid -->
  {#if prescriptions.length === 0}
    <EmptyState
      icon={FileText}
      headline="Your vault is empty"
      description="Upload your first prescription to get started."
      ctaLabel="Upload Prescription"
      onCtaClick={() => (showUploadDialog = true)}
    />
  {:else}
    <div class="rx-grid">
      {#each prescriptions as rx (rx.id)}
        <Card.Root class="group overflow-hidden hover:shadow-md hover:border-primary/20 transition-all duration-200">
          <div class="rx-card__thumb">
            <FileImage class="h-10 w-10 text-muted-foreground/50" />
            <div class="rx-card__overlay">
              <button class="rx-card__overlay-btn" onclick={() => (viewingPrescription = rx)} aria-label="View">
                <Eye class="h-3.5 w-3.5 text-foreground" />
              </button>
              <button class="rx-card__overlay-btn" aria-label="Extract Text">
                <Sparkles class="h-3.5 w-3.5 text-primary" />
              </button>
              <button class="rx-card__overlay-btn hover:bg-red-50" onclick={() => handleDelete(rx.id)} aria-label="Delete">
                <Trash2 class="h-3.5 w-3.5 text-destructive" />
              </button>
            </div>
          </div>
          <Card.Content class="p-3.5">
            <p class="rx-card__filename">{rx.fileName}</p>
            {#if rx.notes}
              <p class="rx-card__notes">{rx.notes}</p>
            {/if}
            <p class="rx-card__date">
              <Calendar class="h-3 w-3" />
              {formatDate(rx.uploadedAt)}
            </p>
          </Card.Content>
        </Card.Root>
      {/each}
    </div>
  {/if}
</div>

<!-- Upload Dialog -->
<Dialog.Root bind:open={showUploadDialog}>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>Upload Prescription</Dialog.Title>
      <Dialog.Description>Add a new prescription document to your vault.</Dialog.Description>
    </Dialog.Header>
    <div class="space-y-4 py-4">
      <div>
        <label for="filename" class="form-label">File Name</label>
        <Input id="filename" placeholder="e.g. dr_smith_prescription.pdf" bind:value={uploadFileName} />
      </div>
      <div>
        <label for="notes" class="form-label">Notes (optional)</label>
        <Textarea id="notes" placeholder="Add any notes about this prescription..." bind:value={uploadNotes} rows={3} />
      </div>
    </div>
    <Dialog.Footer>
      <Button variant="outline" onclick={() => (showUploadDialog = false)}>Cancel</Button>
      <Button onclick={handleUpload} disabled={!uploadFileName.trim()}>Upload</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<!-- View Dialog -->
<Dialog.Root open={!!viewingPrescription} onOpenChange={(v) => { if (!v) viewingPrescription = null; }}>
  <Dialog.Content class="sm:max-w-lg">
    <Dialog.Header>
      <Dialog.Title>{viewingPrescription?.fileName ?? ""}</Dialog.Title>
      <Dialog.Description>{viewingPrescription?.notes || "No notes"}</Dialog.Description>
    </Dialog.Header>
    <div class="py-4">
      <div class="h-64 bg-muted rounded-lg flex items-center justify-center">
        <FileImage class="h-16 w-16 text-muted-foreground/30" />
      </div>
    </div>
    <Dialog.Footer>
      <Button variant="outline" onclick={() => (viewingPrescription = null)}>Close</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
