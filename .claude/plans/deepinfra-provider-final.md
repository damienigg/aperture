# Plan: Add DeepInfra as a first-class AI provider

## Goal
Integrate DeepInfra into Aperture's multi-provider AI abstraction so users can select DeepInfra for **embeddings**, **chat**, **textGeneration**, and **exploration**, using the official Vercel AI SDK provider `@ai-sdk/deepinfra`.

---

## 1. Model choices

### Embeddings

| Tier | Model | Stored dimension | Cost per 1M input tokens |
|------|-------|------------------|--------------------------|
| 1. Minimal / fast / cheap | `Qwen/Qwen3-Embedding-0.6B` | **512** | $0.01 |
| 2. Average quality | `Qwen/Qwen3-Embedding-4B` | **1536** | $0.02 |
| 3. High quality | `Qwen/Qwen3-Embedding-8B` | **4096** | $0.01 |

**Dimension note:** Qwen3 embedding models are Matryoshka-style and natively emit 1024D (0.6B), 2560D (4B), and 4096D (8B). Tiers 1 and 2 use smaller target dimensions (512 and 1536), so the embedding pipeline must truncate generated vectors to the configured dimension. Tier 3 uses the native 4096D dimension. All three target dimensions already exist in Aperture's `VALID_EMBEDDING_DIMENSIONS`.

### Chat / textGeneration / exploration

| Tier | Model | Approximate cost per 1M tokens |
|------|-------|-------------------------------|
| 1. Minimal / fast / cheap | `Qwen/Qwen3-32B` | ~$0.08 / $0.28 |
| 2. Average quality | `deepseek-ai/DeepSeek-V3.2` | ~$0.26 / $0.38 |
| 3. High quality | `deepseek-ai/DeepSeek-V4-Pro` | ~$1.30 / $2.60 |

---

## 2. Files to change

### Backend / `packages/core`

1. **`packages/core/package.json`**
   - Add dependency: `"@ai-sdk/deepinfra": "^3.0.0"`
   - Update `zod` to `"^3.25.76"` to satisfy AI SDK peer dependencies.

2. **`packages/core/src/lib/ai-capabilities/data/deepinfra.json`** (new file)
   - Provider metadata: `id: "deepinfra"`, `name: "DeepInfra"`, `type: "cloud"`, `supportsEmbeddings/chat/textGeneration/exploration: true`, `requiresApiKey: true`, `requiresBaseUrl: false`.
   - Built-in embedding models with configured `embeddingDimensions`: 512, 1536, 4096.
   - Built-in chat/textGeneration/exploration models.

3. **`packages/core/src/lib/ai-capabilities/loadProviders.ts`**
   - Import `deepinfra.json` with `{ type: 'json' }`.
   - Add it to `RAW_PROVIDERS`.

4. **`packages/core/src/lib/ai-provider.ts`**
   - Add `'deepinfra'` to the `ProviderType` union.
   - Import `createDeepInfra` from `@ai-sdk/deepinfra`.
   - Add `case 'deepinfra':` in `createProviderInstance()`.
   - Add `case 'deepinfra':` in `getEmbeddingModelInstance()` returning `(provider as any).embeddingModel(modelId)`.
   - Add a small helper to truncate/slice embeddings to the configured dimension when generated vectors are larger.

5. **`packages/core/src/recommender/movies/embeddings.ts` and `packages/core/src/recommender/series/embeddings.ts`**
   - Call the dimension-normalisation helper on generated embeddings before storing.

### Frontend / `apps/web`

6. **`apps/web/src/components/aiProviderInfo.ts`**
   - Add `'deepinfra'` to the `ProviderType` union and `PROVIDER_INFO` record.

7. **`apps/web/public/deepinfra.svg`** (new file)
   - Add the DeepInfra logo.

### Root workspace

8. **`package.json` (root)**
   - Update the `pnpm.overrides.zod` value to `"^3.25.76"` so all workspaces resolve a zod version compatible with `@ai-sdk/deepinfra`.

---

## 3. Verification

1. `pnpm install`
2. `pnpm -r typecheck`
3. `pnpm build` for `@aperture/core`, `@aperture/api`, `@aperture/web`
4. In the UI:
   - Select DeepInfra embeddings tier 1 (512D) and run **Test**.
   - Select DeepInfra chat tier 2 (`DeepSeek-V3.2`) and run **Test**.
5. Check that the generated vectors are stored in `embeddings_512`, `embeddings_1536`, or `embeddings_4096` depending on the chosen embedding tier.

---

## 4. Pull-request scope

This is a first-class provider addition following the existing OpenAI/DeepSeek/Groq pattern. It adds one dependency, one registry JSON file, small factory/metadata updates, embedding dimension normalisation for Matryoshka models, and a logo. No database migrations are required because all chosen embedding dimensions are already supported.
