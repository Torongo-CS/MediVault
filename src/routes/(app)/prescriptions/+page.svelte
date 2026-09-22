<!-- routes/(app)/prescriptions/+page.svelte -->
<script lang="ts">
  import PageHeader from "$lib/components/shared/PageHeader.svelte";
  import EmptyState from "$lib/components/shared/EmptyState.svelte";
  import * as Card from "$lib/components/ui/card";
  import * as Dialog from "$lib/components/ui/dialog";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Textarea } from "$lib/components/ui/textarea";
  import { onMount } from "svelte";
  import { convex } from "$lib/convexClient";
  import { api } from "../../../../convex/_generated/api";
  import type { Id } from "../../../../convex/_generated/dataModel";
  import {
    Upload, FileText, Trash2, Eye, Sparkles, Calendar, FileImage, Plus, Download,
    FileCode, HardDrive, Loader2, CheckCircle2, AlertCircle, FileCheck
  } from "lucide-svelte";

  let { data } = $props();

  interface PrescriptionDoc {
    _id: Id<"prescriptions">;
    name: string;
    imageUrl: string;
    dateUploaded: number;
    userId: Id<"users">;
    fileName?: string;
    fileType?: string;
    fileSize?: number;
    notes?: string;
  }

  let prescriptions = $state<PrescriptionDoc[]>([]);
  let isLoading = $state(true);

  let showUploadDialog = $state(false);
  let viewingPrescription = $state<PrescriptionDoc | null>(null);

  // Upload form state
  let selectedFiles = $state<File[]>([]);
  let uploadName = $state("");
  let uploadNotes = $state("");
  let isUploading = $state(false);
  let isDragging = $state(false);
  let fileInputRef = $state<HTMLInputElement | null>(null);

  onMount(() => {
    const userId = data.user?._id as Id<"users"> | undefined;
    if (!userId) {
      isLoading = false;
      return;
    }

    const unsub = convex.onUpdate(
      api.prescriptions.listByUser,
      { userId },
      (items) => {
        if (items) {
          prescriptions = items as PrescriptionDoc[];
        }
        isLoading = false;
      }
    );
    return () => unsub();
  });

  function formatDate(ts: number): string {
    return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function formatFileSize(bytes?: number): string {
    if (!bytes) return "Unknown size";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function getFormatBadge(fileType?: string, fileName?: string) {
    const ext = (fileType || fileName?.split('.').pop() || "").toLowerCase();
    if (ext.includes("pdf")) return { label: "PDF", bg: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" };
    if (ext.includes("jpg") || ext.includes("jpeg")) return { label: "JPG", bg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" };
    if (ext.includes("png")) return { label: "PNG", bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" };
    if (ext.includes("webp")) return { label: "WEBP", bg: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" };
    if (ext.includes("doc")) return { label: "DOCX", bg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20" };
    if (ext.includes("txt")) return { label: "TXT", bg: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20" };
    return { label: ext.toUpperCase() || "FILE", bg: "bg-primary/10 text-primary border-primary/20" };
  }

  function handleFileSelect(e: Event) {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      selectedFiles = Array.from(target.files);
      if (!uploadName && selectedFiles.length > 0) {
        uploadName = selectedFiles[0].name.replace(/\.[^/.]+$/, "");
      }
    }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    isDragging = false;
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      selectedFiles = Array.from(e.dataTransfer.files);
      if (!uploadName && selectedFiles.length > 0) {
        uploadName = selectedFiles[0].name.replace(/\.[^/.]+$/, "");
      }
      showUploadDialog = true;
    }
  }

  async function readFileAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }

  async function handleUpload() {
    const userId = data.user?._id as Id<"users"> | undefined;
    if (!userId) {
      alert("Please log in to upload prescriptions.");
      return;
    }
    if (selectedFiles.length === 0 && !uploadName.trim()) return;

    isUploading = true;
    try {
      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          const dataUrl = await readFileAsDataURL(file);
          const ext = file.name.split('.').pop() || "doc";
          const title = selectedFiles.length === 1 && uploadName.trim() ? uploadName.trim() : file.name;

          await convex.mutation(api.prescriptions.upload, {
            userId,
            name: title,
            imageUrl: dataUrl,
            fileName: file.name,
            fileType: ext,
            fileSize: file.size,
            notes: uploadNotes,
          });
        }
      } else {
        // Fallback for manual name entry
        await convex.mutation(api.prescriptions.upload, {
          userId,
          name: uploadName.trim(),
          imageUrl: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500",
          fileName: `${uploadName.trim()}.pdf`,
          fileType: "pdf",
          notes: uploadNotes,
        });
      }

      // Reset dialog
      selectedFiles = [];
      uploadName = "";
      uploadNotes = "";
      showUploadDialog = false;
    } catch (err: any) {
      console.error("Failed to upload prescription:", err);
      alert("Upload failed: " + (err.message || "Unknown error"));
    } finally {
      isUploading = false;
    }
  }

  async function handleDelete(id: Id<"prescriptions">) {
    const userId = data.user?._id as Id<"users"> | undefined;
    if (!userId) return;

    if (confirm("Delete this prescription document from your vault?")) {
      try {
        await convex.mutation(api.prescriptions.remove, { id, userId });
      } catch (err: any) {
        alert("Failed to delete prescription: " + err.message);
      }
    }
  }

  function downloadPrescription(rx: PrescriptionDoc) {
    const link = document.createElement("a");
    link.href = rx.imageUrl;
    link.download = rx.fileName || rx.name || "prescription";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
</script>

<div class="page-root">
  <PageHeader title="Prescription Vault" subtitle="Securely store, organize and manage your medical documents" showBack={true} backHref="/dashboard">
    {#snippet actions()}
      <Button class="text-xs font-semibold gap-1.5" onclick={() => (showUploadDialog = true)}>
        <Plus class="h-3.5 w-3.5" />
        Upload Document
      </Button>
    {/snippet}
  </PageHeader>

  <!-- Hidden native file input -->
  <input
    type="file"
    bind:this={fileInputRef}
    accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.txt"
    multiple
    class="hidden"
    onchange={handleFileSelect}
  />

  <!-- Drag & Drop Zone -->
  <div
    class="upload-dropzone {isDragging ? 'border-primary bg-primary/10 scale-[1.01]' : 'border-border hover:border-primary/40 hover:bg-muted/30'}"
    role="button"
    tabindex="0"
    ondragover={(e) => { e.preventDefault(); isDragging = true; }}
    ondragleave={() => (isDragging = false)}
    ondrop={handleDrop}
    onclick={() => fileInputRef?.click()}
    onkeydown={(e) => { if (e.key === 'Enter') fileInputRef?.click(); }}
  >
    <div class="flex flex-col items-center gap-3">
      <div class="upload-dropzone__icon">
        <Upload class="h-6 w-6 text-primary" />
      </div>
      <div>
        <p class="upload-dropzone__title">Drop prescription files here or click to browse</p>
        <p class="upload-dropzone__hint">Supports PDF, JPG, PNG, WEBP, DOCX, TXT — max 10MB per file</p>
      </div>
    </div>
  </div>

  <!-- Prescriptions Content -->
  {#if isLoading}
    <div class="flex justify-center items-center py-20">
      <Loader2 class="h-8 w-8 animate-spin text-primary" />
    </div>
  {:else if prescriptions.length === 0}
    <EmptyState
      icon={FileText}
      headline="Your vault is empty"
      description="Upload your prescription documents or lab reports to store them safely."
      ctaLabel="Upload Prescription"
      onCtaClick={() => (showUploadDialog = true)}
    />
  {:else}
    <div class="rx-grid">
      {#each prescriptions as rx (rx._id)}
        {@const badge = getFormatBadge(rx.fileType, rx.fileName)}
        {@const isImage = rx.imageUrl.startsWith("data:image") || rx.imageUrl.includes("unsplash") || (rx.fileType && ["jpg","jpeg","png","webp"].includes(rx.fileType.toLowerCase()))}

        <Card.Root class="group overflow-hidden hover:shadow-md hover:border-primary/20 transition-all duration-200 flex flex-col justify-between">
          <div>
            <div class="rx-card__thumb">
              {#if isImage}
                <img src={rx.imageUrl} alt={rx.name} class="w-full h-full object-cover" />
              {:else}
                <div class="flex flex-col items-center justify-center text-muted-foreground/60 gap-1.5 p-4">
                  <FileText class="h-10 w-10 text-primary/70" />
                  <span class="text-[10px] font-bold uppercase tracking-wider">{badge.label}</span>
                </div>
              {/if}

              <!-- Format Badge -->
              <span class="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full border backdrop-blur-md shadow-sm {badge.bg}">
                {badge.label}
              </span>

              <!-- Hover Overlay Actions -->
              <div class="rx-card__overlay">
                <button class="rx-card__overlay-btn" onclick={() => (viewingPrescription = rx)} aria-label="View Document">
                  <Eye class="h-3.5 w-3.5 text-foreground" />
                </button>
                <button class="rx-card__overlay-btn" onclick={() => downloadPrescription(rx)} aria-label="Download Document">
                  <Download class="h-3.5 w-3.5 text-primary" />
                </button>
                <button class="rx-card__overlay-btn hover:bg-red-50" onclick={() => handleDelete(rx._id)} aria-label="Delete">
                  <Trash2 class="h-3.5 w-3.5 text-destructive" />
                </button>
              </div>
            </div>

            <Card.Content class="p-3.5">
              <h3 class="rx-card__filename font-bold text-sm text-foreground line-clamp-1">{rx.name}</h3>
              {#if rx.fileName && rx.fileName !== rx.name}
                <p class="text-[11px] text-muted-foreground truncate font-mono mt-0.5">{rx.fileName}</p>
              {/if}
              {#if rx.notes}
                <p class="rx-card__notes text-xs text-muted-foreground mt-1 line-clamp-2">{rx.notes}</p>
              {/if}
            </Card.Content>
          </div>

          <div class="px-3.5 pb-3 pt-0 flex items-center justify-between border-t border-border/40 mt-2 text-[11px] text-muted-foreground">
            <span class="flex items-center gap-1">
              <Calendar class="h-3 w-3" />
              {formatDate(rx.dateUploaded)}
            </span>
            <span>{formatFileSize(rx.fileSize)}</span>
          </div>
        </Card.Root>
      {/each}
    </div>
  {/if}
</div>

<!-- Upload Dialog -->
<Dialog.Root bind:open={showUploadDialog}>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>Upload Prescription Document</Dialog.Title>
      <Dialog.Description>Select a file (PDF, JPG, PNG, WEBP, DOCX, TXT) to upload to your vault.</Dialog.Description>
    </Dialog.Header>

    <div class="space-y-4 py-2">
      <!-- File Selector Dropzone inside modal -->
      <div
        class="border-2 border-dashed border-border hover:border-primary/50 rounded-lg p-4 text-center cursor-pointer transition-colors bg-muted/20"
        role="button"
        tabindex="0"
        onclick={() => fileInputRef?.click()}
        onkeydown={(e) => { if (e.key === 'Enter') fileInputRef?.click(); }}
      >
        {#if selectedFiles.length > 0}
          <div class="space-y-1">
            <FileCheck class="h-8 w-8 text-primary mx-auto" />
            <p class="text-xs font-bold text-foreground">
              {selectedFiles.length === 1 ? selectedFiles[0].name : `${selectedFiles.length} files selected`}
            </p>
            <p class="text-[10px] text-muted-foreground">Click to replace file selection</p>
          </div>
        {:else}
          <div class="space-y-1">
            <Upload class="h-7 w-7 text-muted-foreground mx-auto" />
            <p class="text-xs font-semibold text-foreground">Click to select files from device</p>
            <p class="text-[10px] text-muted-foreground">PDF, Image, Word document, or Text file</p>
          </div>
        {/if}
      </div>

      <div>
        <label for="docName" class="form-label">Document Title</label>
        <Input id="docName" placeholder="e.g. Dr. Ahmed refill prescription" bind:value={uploadName} />
      </div>

      <div>
        <label for="notes" class="form-label">Notes (optional)</label>
        <Textarea id="notes" placeholder="e.g. Dosage instructions, clinic name..." bind:value={uploadNotes} rows={3} />
      </div>
    </div>

    <Dialog.Footer class="gap-2 sm:gap-0">
      <Button variant="outline" onclick={() => (showUploadDialog = false)} disabled={isUploading}>Cancel</Button>
      <Button onclick={handleUpload} disabled={isUploading || (!selectedFiles.length && !uploadName.trim())}>
        {#if isUploading}
          <Loader2 class="h-4 w-4 animate-spin mr-1.5" />
          Uploading...
        {:else}
          Upload Document
        {/if}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<!-- View Dialog -->
<Dialog.Root open={!!viewingPrescription} onOpenChange={(v) => { if (!v) viewingPrescription = null; }}>
  <Dialog.Content class="sm:max-w-xl">
    <Dialog.Header>
      <Dialog.Title class="flex items-center gap-2">
        <span>{viewingPrescription?.name ?? "Prescription"}</span>
        {#if viewingPrescription}
          {@const badge = getFormatBadge(viewingPrescription.fileType, viewingPrescription.fileName)}
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full border {badge.bg}">{badge.label}</span>
        {/if}
      </Dialog.Title>
      <Dialog.Description>
        Uploaded on {viewingPrescription ? formatDate(viewingPrescription.dateUploaded) : ""}
        {#if viewingPrescription?.fileSize} • {formatFileSize(viewingPrescription.fileSize)}{/if}
      </Dialog.Description>
    </Dialog.Header>

    <div class="py-3 space-y-3">
      {#if viewingPrescription}
        {@const isImage = viewingPrescription.imageUrl.startsWith("data:image") || viewingPrescription.imageUrl.includes("unsplash") || (viewingPrescription.fileType && ["jpg","jpeg","png","webp"].includes(viewingPrescription.fileType.toLowerCase()))}

        <div class="max-h-96 overflow-auto bg-muted/40 rounded-lg p-2 flex items-center justify-center border">
          {#if isImage}
            <img src={viewingPrescription.imageUrl} alt={viewingPrescription.name} class="max-h-80 w-auto object-contain rounded" />
          {:else if viewingPrescription.imageUrl.startsWith("data:application/pdf")}
            <object data={viewingPrescription.imageUrl} type="application/pdf" title="PDF Preview" class="w-full h-80 rounded">
              <p class="text-xs text-muted-foreground p-4 text-center">PDF Preview unavailable directly in modal. Use download below to view.</p>
            </object>
          {:else}
            <div class="py-12 text-center space-y-2">
              <FileText class="h-12 w-12 text-primary/70 mx-auto" />
              <p class="text-sm font-semibold text-foreground">{viewingPrescription.fileName || viewingPrescription.name}</p>
              <p class="text-xs text-muted-foreground">Document file type ({viewingPrescription.fileType?.toUpperCase() || "Document"})</p>
            </div>
          {/if}
        </div>

        {#if viewingPrescription.notes}
          <div class="p-3 bg-muted/30 rounded-lg border text-xs space-y-1">
            <span class="font-bold text-foreground">Notes:</span>
            <p class="text-muted-foreground leading-relaxed">{viewingPrescription.notes}</p>
          </div>
        {/if}
      {/if}
    </div>

    <Dialog.Footer class="flex flex-row justify-between items-center w-full">
      {#if viewingPrescription}
        <Button variant="outline" size="sm" onclick={() => downloadPrescription(viewingPrescription!)} class="gap-1.5 text-xs">
          <Download class="h-3.5 w-3.5" />
          Download File
        </Button>
      {/if}
      <Button variant="outline" size="sm" onclick={() => (viewingPrescription = null)}>Close</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
