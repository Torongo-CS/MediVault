# MediVault Clinical RAG & AI Chatbot System

## Overview

The **MediVault Clinical RAG (Retrieval-Augmented Generation) & AI Chatbot System** is an intelligent pharmaceutical assistant integrated into the MediVault application. It helps users describe their health symptoms in natural language, automatically matches appropriate medicines from the pharmacy database, checks for drug-drug contraindications, and displays interactive medicine cards for fast reservation and purchase.

---

## Key Features

1. **Symptom-to-Medicine Matching (Clinical RAG)**:
   - Evaluates user symptom queries against the Convex `medicines` database.
   - Intelligent symptom synonym expansion (e.g. mapping "acid reflux" to "heartburn/gastric/acidity", "feverish" to "pyrexia/temperature/fever", "migraine" to "headache").
   - Multi-field weighted scoring (Symptom relevance, Generic Name match, Brand Name match, Clinical Description keyword search).

2. **Drug Interaction & Contraindication Warning Engine**:
   - Detects potential contraindications between medicines mentioned in the user prompt and medicines stored in the catalog.
   - Displays clear warning banners with `⚠️` alerts to prevent dangerous drug combinations.

3. **Multi-LLM & Free API Integration**:
   - **Google Gemini Free API**: Connects to `gemini-2.0-flash` via `GEMINI_API_KEY`.
   - **OpenRouter Free Models**: Supports top free open-access models (`meta-llama/llama-3.3-70b-instruct:free`, `google/gemini-2.0-flash-exp:free`, `deepseek/deepseek-r1:free`, `qwen/qwen-2.5-72b-instruct:free`, `mistralai/mistral-7b-instruct:free`).
   - **Offline Convex Clinical RAG Fallback**: If external API keys are omitted or experience downtime/rate-limits, the system seamlessly falls back to a built-in offline clinical generator powered directly by the Convex database.

4. **Dual Interface Options**:
   - **Dedicated AI Assistant Page** ([/ai-assistant](file:///c:/Users/toron/OneDrive/Desktop/MediVault_workspace/MediVault/src/routes/(app)/ai-assistant/+page.svelte)): Complete workspace featuring full chat history, quick suggestion chips, prescription OCR scanner, and clinical metadata panel.
   - **Global Floating AI Chatbot Widget** ([AiChatWidget.svelte](file:///c:/Users/toron/OneDrive/Desktop/MediVault_workspace/MediVault/src/lib/components/AiChatWidget.svelte)): Accessible from any workspace page via a floating action button in the lower-right corner.

5. **Interactive Medicine Cards**:
   - Every medicine suggestion card displays:
     - Medicine Brand Name & Generic Name.
     - **OTC** (Over-The-Counter) vs. **Rx** (Prescription Required) badges.
     - Price tag ($) & stock level.
     - Direct one-click navigation to search pharmacy inventory for order placement.

---

## Architecture & Data Flow

## Comprehensive System Workflow Flowchart

```mermaid
flowchart TD
    %% User Action & Entry Points
    subgraph UI_Layer ["1. User Interface & Entry Points"]
        U1[User opens AI Assistant / Chat Widget]
        U2[User enters symptoms or query e.g., 'fever & acidity']
        U3[Click Quick Symptom Chip or Upload Prescription]
    end

    %% Frontend State Management
    subgraph Frontend ["2. SvelteKit Frontend Handler"]
        F1[sendPrompt Function Executed]
        F2[Extract Chat History & User Input]
        F3[HTTP POST Request to /api/ai/chat]
    end

    %% Convex RAG Engine
    subgraph Convex_RAG ["3. Convex Backend Clinical RAG Engine (convex/rag.ts)"]
        R1[searchMedicineKnowledgeBase Query]
        R2[Query Normalization & Tokenization]
        R3[Symptom Synonym Expansion Engine]
        R4[Scan Convex `medicines` Database]
        R5[Calculate Weighted Relevance Score]
        R6[Check Drug Contraindications & Warnings]
        R7[Generate RAG Context Prompt String]
    end

    %% LLM & Fallback Routing
    subgraph AI_Router ["4. Multi-LLM & Fallback Router (/api/ai/chat)"]
        A1{Check Available API Keys}
        A2[Google Gemini Free API]
        A3[OpenRouter API: openrouter/auto]
        A4[Offline Convex Clinical RAG Engine]
    end

    %% Response Parsing & Rendering
    subgraph Rendering ["5. Response Parsing & UI Render"]
        P1[Parse Clinical Answer Text]
        P2[Extract <suggested_medicines> JSON Block]
        P3[Render Assistant Message]
        P4[Display Interactive Medicine Cards (Price, OTC/Rx)]
        P5[One-click Navigation to Pharmacy Checkout]
    end

    %% Flow Connections
    U1 --> U2
    U2 --> F1
    U3 --> F1
    F1 --> F2 --> F3
    F3 --> R1
    R1 --> R2 --> R3 --> R4 --> R5 --> R6 --> R7
    R7 --> A1
    A1 -- Gemini API Key Present --> A2
    A1 -- OpenRouter Key Present --> A3
    A1 -- No Key / Network Fail --> A4
    A2 --> P1
    A3 --> P1
    A4 --> P1
    P1 --> P2 --> P3 --> P4 --> P5
```

---

## Modified & Created Files

| File Path | Description |
| :--- | :--- |
| [`convex/rag.ts`](file:///c:/Users/toron/OneDrive/Desktop/MediVault_workspace/MediVault/convex/rag.ts) | Convex RAG database query function with symptom synonym mapping, weighted scoring, and drug conflict detection. |
| [`src/routes/api/ai/chat/+server.ts`](file:///c:/Users/toron/OneDrive/Desktop/MediVault_workspace/MediVault/src/routes/api/ai/chat/+server.ts) | Server-side endpoint connecting RAG retriever with Google Gemini Free API, OpenRouter Free Models, and Offline Convex Fallback. |
| [`src/routes/(app)/ai-assistant/+page.svelte`](file:///c:/Users/toron/OneDrive/Desktop/MediVault_workspace/MediVault/src/routes/(app)/ai-assistant/+page.svelte) | Full AI Assistant page with symptom advisor chat, prescription OCR scanner, disclaimer alerts, and suggestion chips. |
| [`src/lib/components/AiChatWidget.svelte`](file:///c:/Users/toron/OneDrive/Desktop/MediVault_workspace/MediVault/src/lib/components/AiChatWidget.svelte) | Global floating AI chatbot widget mounted on all workspace pages. |
| [`src/routes/+layout.svelte`](file:///c:/Users/toron/OneDrive/Desktop/MediVault_workspace/MediVault/src/routes/+layout.svelte) | Workspace layout updated to mount `AiChatWidget` for instant access across routes. |
| [`src/lib/utils/ragAiChatbot.test.ts`](file:///c:/Users/toron/OneDrive/Desktop/MediVault_workspace/MediVault/src/lib/utils/ragAiChatbot.test.ts) | Unit tests verifying symptom matching, drug conflict warnings, and suggested medicine parsing. |

---

## Configuration & Environment Variables

The system works **out-of-the-box in offline mode** without requiring any external keys. To enable online LLM capabilities via free APIs, set either of the following environment variables in `.env.local`:

```env
# Option 1: Free Google Gemini API Key (from Google AI Studio)
GEMINI_API_KEY=your_free_gemini_api_key

# Option 2: OpenRouter Free Models (from openrouter.ai)
OPENROUTER_API_KEY=your_free_openrouter_api_key
OPENROUTER_MODEL=meta-llama/llama-3.3-70b-instruct:free
```

---

## Verification & Testing

- **Unit Tests**: Executed via Vitest (`bun run test:unit --run`). All 7 unit tests passed cleanly.
- **RAG & Chat Verification**: Tested symptom matching for common complaints (fever, headache, heartburn, cough, stomach pain), verified contraindication alerts for conflicting drugs (e.g. Paracetamol vs Warfarin), and confirmed fallbacks when API keys are unconfigured.

---

*MediVault AI Health Assistant - Built with SvelteKit, Convex Backend, and Clinical RAG Architecture.*
