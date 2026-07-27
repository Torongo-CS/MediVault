<script lang="ts">
    import { browser } from '$app/environment';
    import { Editor } from '@tiptap/core';
    import StarterKit from '@tiptap/starter-kit';
    import Placeholder from '@tiptap/extension-placeholder';

    let element: HTMLDivElement;
    let editor: Editor | undefined = $state();

    $effect(() => {
        if (!browser) return;

        editor = new Editor({
            element: element,
            extensions: [
                StarterKit.configure({
                    heading: {
                        levels: [1, 2]
                    }
                }),
                Placeholder.configure({ 
                    placeholder: 'Type your description here...' 
                })
            ],
            editorProps: {
                attributes: {
                    // Custom targeting for headers, blockquotes, and lists inside the dark container
                    class: 'focus:outline-none min-h-[300px] max-h-[500px] overflow-y-auto p-4 text-zinc-300 w-full text-base \
                            [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-white [&_h1]:mb-3 [&_h1]:mt-2 \
                            [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-white [&_h2]:mb-2 [&_h2]:mt-2 \
                            [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_ol]:my-2 \
                            [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ul]:my-2 \
                            [&_blockquote]:border-l-2 [&_blockquote]:border-zinc-700 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-zinc-400 [&_blockquote]:my-3'
                },
            },
        });

        return () => {
            editor?.destroy();
        };
    });
</script>

<div class="w-full border border-zinc-800 rounded-lg overflow-hidden bg-zinc-950">
    {#if editor}
        <!-- Toolbar Section -->
        <div class="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 bg-[#121214] text-zinc-400 select-none">
            <!-- Left Side Actions -->
            <div class="flex items-center gap-4 text-sm font-medium">
                <button type="button" class="hover:text-zinc-100 font-bold" class:text-white={editor.isActive('bold')} onclick={() => editor?.chain().focus().toggleBold().run()}>B</button>
                <button type="button" class="hover:text-zinc-100 italic" class:text-white={editor.isActive('italic')} onclick={() => editor?.chain().focus().toggleItalic().run()}>I</button>
                <button type="button" class="hover:text-zinc-100 line-through" class:text-white={editor.isActive('strike')} onclick={() => editor?.chain().focus().toggleStrike().run()}>S</button>
                <button type="button" class="hover:text-zinc-100 font-mono" class:text-white={editor.isActive('code')} onclick={() => editor?.chain().focus().toggleCode().run()}>&lt;&gt;</button>
                
                <div class="h-4 w-[1px] bg-zinc-800"></div>

                <button type="button" class="hover:text-zinc-100 text-xs font-bold" class:text-white={editor.isActive('heading', { level: 1 })} onclick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}>H1</button>
                <button type="button" class="hover:text-zinc-100 text-xs font-bold" class:text-white={editor.isActive('heading', { level: 2 })} onclick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button>
                
                <div class="h-4 w-[1px] bg-zinc-800"></div>

                <button type="button" class="hover:text-zinc-100 text-base leading-none" class:text-white={editor.isActive('bulletList')} onclick={() => editor?.chain().focus().toggleBulletList().run()}>•☰</button>
                <button type="button" class="hover:text-zinc-100 text-sm leading-none" class:text-white={editor.isActive('orderedList')} onclick={() => editor?.chain().focus().toggleOrderedList().run()}>1.☰</button>
                
                <div class="h-4 w-[1px] bg-zinc-800"></div>

                <button type="button" class="hover:text-zinc-100 font-serif text-base" class:text-white={editor.isActive('blockquote')} onclick={() => editor?.chain().focus().toggleBlockquote().run()}>“”</button>
                <button type="button" class="hover:text-zinc-100 text-xs">🖼</button>
                <button type="button" class="hover:text-zinc-100 text-xs">🔗</button>
                <button type="button" class="hover:text-zinc-100 text-xs" class:text-white={editor.isActive('codeBlock')} onclick={() => editor?.chain().focus().toggleCodeBlock().run()}>{'[{ ]'}</button>
                <button type="button" class="hover:text-zinc-100 font-serif">∑</button>
            </div>

            <!-- Right Side Undo/Redo Actions -->
            <div class="flex items-center gap-4 text-sm">
                <button type="button" class="hover:text-zinc-100 text-base" onclick={() => editor?.chain().focus().undo().run()}>↩</button>
                <button type="button" class="hover:text-zinc-100 text-base" onclick={() => editor?.chain().focus().redo().run()}>↪</button>
            </div>
        </div>
    {/if}

    <!-- Content Area Container -->
    <div bind:this={element} class="bg-[#09090b]"></div>
</div>

<style>
    /* Ensures placeholder text is visible on the dark background when empty */
    :global(.tiptap p.is-editor-empty:first-child::before) {
        color: #3f3f46;
        content: attr(data-placeholder);
        float: left;
        height: 0;
        pointer-events: none;
    }
</style>