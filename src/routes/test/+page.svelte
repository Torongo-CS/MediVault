<script lang="ts">
    import RichTextEditor from '$lib/components/Tiptap/RichTextEditor.svelte';
</script>

<div class="min-h-screen bg-[#09090b] text-zinc-100 p-8 flex items-center justify-center">
    <div class="w-full max-w-5xl bg-[#0c0c0e] border border-zinc-900 rounded-xl p-8 shadow-2xl">
        
        <!-- Header Panel Area -->
        <div class="flex items-start justify-between pb-6 border-b border-zinc-900 mb-8">
            <div>
                <h1 class="text-2xl font-bold tracking-tight text-white">Content</h1>
                <p class="text-zinc-500 text-sm mt-1">Provide a concise title and clear details about the algorithmic challenge.</p>
            </div>
            <button class="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                <span>✨</span> Generate Problem
            </button>
        </div>

        <!-- Input Form Section -->
        <div class="space-y-6">
            <!-- Title Row -->
            <div class="space-y-2">
                <label for="problem-title" class="block text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Problem Title
                </label>
                <input 
                    id="problem-title"
                    type="text" 
                    placeholder="e.g. Reverse a Linked List..." 
                    class="w-full bg-[#09090b] border border-zinc-800/80 rounded-lg px-4 py-2.5 text-zinc-100 placeholder-zinc-700 text-sm focus:outline-none focus:border-zinc-700 transition-colors"
                />
            </div>

            <!-- Description Rich Text Row -->
            <div class="space-y-2">
                <label class="block text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Problem Description
                </label>
                <RichTextEditor />
            </div>
        </div>

    </div>
</div>