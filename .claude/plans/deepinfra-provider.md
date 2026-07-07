# Plan: Add DeepInfra as a first-class AI provider

## Goal
Integrate DeepInfra into Aperture's multi-provider AI abstraction so that users can select DeepInfra for **embeddings**, **chat**, **textGeneration**, and **exploration**, using the official Vercel AI SDK provider (`@ai-sdk/deepinfra`).

---

## 1. Analysis summary

- Aperture's backend provider layer lives in `packages/core/src/lib/ai-provider.ts` and `packages/core/src/lib/ai-capabilities/*`.
- Each provider has:
  - a JSON model registry in `packages/core/src/lib/ai-capabilities/data/<provider>.json`
  - an entry in `loadProviders.ts`
  - a case in `createProviderInstance()` and `getEmbeddingModelInstance()`
  - a member of the `ProviderType` union
- The frontend has a static copy of provider metadata in `apps/web/src/components/aiProviderInfo.ts` and a logo in `apps/web/public/`.
- DeepInfra offers an official AI SDK package at `@ai-sdk/deepinfra@^3.x` that exposes:
  - chat/text generation via callable provider `(modelId)`
  - embeddings via `.embeddingModel(modelId)`
  - base URL default: `https://api.deepinfra.com/v1`
  - requires API key
- DeepInfra is a **cloud** provider (no base URL editing required for normal use, but a custom base URL is supported by the SDK).

---

## 2. Files to change

### Backend / `packages/core`

1. **`packages/core/package.json`**
   - Add dependency: `"@ai-sdk/deepinfra": "^3.0.0"`
   - Update `zod` to `^3.25.76` (satisfies `@ai-sdk/deepinfra` peer dependency) or the workspace's resolved latest 3.x.

2. **`packages/core/src/lib/ai-capabilities/data/deepinfra.json`** (new)
   - Provider metadata: `id: "deepinfra"`, `name: "DeepInfra"`, `type: "cloud"`, `supportsEmbeddings: true`, `supportsChat: true`, `supportsTextGeneration: true`, `supportsExploration: true`, `requiresApiKey: true`, `requiresBaseUrl: false`.
   - Curated model lists:
     - **embeddings**: `BAAI/bge-large-en-v1.5` (1024D), `intfloat/multilingual-e5-large` (1024D), `sentence-transformers/all-MiniLM-L6-v2` (384D).
     - **chat/textGeneration/exploration**: `meta-llama/Llama-3.3-70B-Instruct`, `meta-llama/Meta-Llama-3.1-70B-Instruct`, `meta-llama/Meta-Llama-3.1-8B-Instruct`, `Qwen/Qwen2.5-72B-Instruct`.
   - Set `capabilities` and static `inputCostPerMillion` / `outputCostPerMillion` or leave as fallback values.

3. **`packages/core/src/lib/ai-capabilities/loadProviders.ts`**
   - Import `deepinfra.json`.
   - Append it to `RAW_PROVIDERS`.

4. **`packages/core/src/lib/ai-provider.ts`**
   - Add `'deepinfra'` to `ProviderType` union.
   - Import `createDeepInfra` from `@ai-sdk/deepinfra`.
   - Add `case 'deepinfra':` in `createProviderInstance()`.
   - Add `case 'deepinfra':` in `getEmbeddingModelInstance()` returning `(provider as any).embeddingModel(modelId)`.

5. **`packages/core/src/lib/pricing-cache.ts`** (optional but recommended)
   - Add Helicone provider mapping: `deepinfra: ['DEEPINFRA']`.
   - Add any known model aliases to `MODEL_ALIASES` so the cost estimator works.

### Frontend / `apps/web`

6. **`apps/web/public/deepinfra.svg`** (new)
   - Add an SVG logo for the DeepInfra provider.

7. **`apps/web/src/components/aiProviderInfo.ts`**
   - Add `'deepinfra'` to the `ProviderType` union.
   - Add a `deepinfra` entry to `PROVIDER_INFO` with `id`, `name`, `type: 'cloud'`, `requiresApiKey: true`, `requiresBaseUrl: false`, `website`, `logoPath: '/deepinfra.svg'`.

### Not changed (deliberately minimal)

- **Custom model support**: leave DeepInfra with the curated built-in model list only. Adding arbitrary custom DeepInfra models is a logical follow-up but touches more files and is not required for MVP.
- **Migrations**: no database schema changes are required because provider/model IDs are stored as strings and the provider registry is loaded from JSON.

---

## 3. Verification steps

1. Run `pnpm install` in the workspace root.
2. Run `pnpm -r typecheck` to verify TypeScript compilation.
3. Run `pnpm build` for `core`, `api`, and `web`.
4. In the UI:
   - Open Settings → AI.
   - Select DeepInfra for each of the four functions.
   - Verify model lists populate and that the DeepInfra logo appears.
   - Use the **Test** button to confirm connectivity for embeddings and chat.
5. Confirm the cost estimator shows DeepInfra pricing (or zero fallback if Helicone has no match).

---

## 4. Pull-request scope

This is intentionally a first-class-provider addition, following the same pattern used by OpenAI, DeepSeek, and OpenRouter. It adds one dependency, one provider JSON file, one logo, and small updates to the factory/metadata files. It keeps the door open for custom-model support and more DeepInfra models in future PRs without touching the same files again.
