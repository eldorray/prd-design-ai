# Multi-Canvas Design Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the single-select "Jenis halaman" into multi-select where each selected page type has its own canvas, all generated in parallel from one prompt and saved as one project.

**Architecture:** One `Design` becomes a *project* holding many *canvases* via a new JSON `canvases` column. The existing SSE stream endpoint is reused — the frontend calls it once per selected `kind` in parallel. Preview switches canvases via tabs; refine/edit act on the active tab. Per-canvas frontend state is encapsulated in a `Record<DesignKind, CanvasState>` plus `selectedKinds` and `activeKind`.

**Tech Stack:** Laravel 12 + Pest (backend, TDD), Inertia + React 19 + TypeScript (frontend; verified via `tsc`/`vite build`/`eslint`, no JS unit runner present).

**Spec:** [docs/superpowers/specs/2026-06-08-multi-canvas-design-studio-design.md](../specs/2026-06-08-multi-canvas-design-studio-design.md)

**Note:** This project is NOT a git repo. The "Commit" steps below are written as `git` commands for habit, but in this repo they are no-ops — skip them or just save files. Do NOT initialize git unless the user asks.

**Verification commands (memorize):**
- Backend tests: `php artisan test --filter=Design`
- Full backend tests: `php artisan test`
- Types: `npm run types:check`
- Lint: `npm run lint:check`
- Build: `npm run build`

---

## File Structure

**Backend (modify):**
- `database/migrations/2026_06_09_000000_add_canvases_to_designs_table.php` — *create*: add `canvases` JSON column + backfill existing rows.
- `app/Models/Design.php` — add `canvases` to `$fillable` and cast to `array`.
- `database/factories/DesignFactory.php` — add `canvases` to default state.
- `app/Http/Requests/StoreDesignRequest.php` — validate `canvases`.
- `app/Http/Controllers/DesignController.php` — include `canvases` in the loaded `current` (back-compat fallback).
- `tests/Feature/DesignTest.php` — add tests for canvases store/load/back-compat.

**Frontend (modify/create):**
- `resources/js/types/design.ts` — add `CanvasState`, extend `Design`.
- `resources/js/hooks/use-canvases.ts` — *create*: hook encapsulating per-canvas state.
- `resources/js/pages/design.tsx` — multi-select selector, parallel generate, persist all canvases, tab bar, per-active-canvas wiring.

---

## PHASE 1 — Backend (TDD)

### Task 1: Add `canvases` column + backfill migration

**Files:**
- Create: `database/migrations/2026_06_09_000000_add_canvases_to_designs_table.php`
- Test: `tests/Feature/DesignTest.php`

- [ ] **Step 1: Write the failing test**

Add to the end of `tests/Feature/DesignTest.php`:

```php
test('designs table has a canvases json column', function () {
    expect(Schema::hasColumn('designs', 'canvases'))->toBeTrue();
});
```

Add this import at the top of the file (after the existing `use` lines):

```php
use Illuminate\Support\Facades\Schema;
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --filter="canvases json column"`
Expected: FAIL — column `canvases` does not exist.

- [ ] **Step 3: Create the migration**

Create `database/migrations/2026_06_09_000000_add_canvases_to_designs_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('designs', function (Blueprint $table) {
            $table->json('canvases')->nullable()->after('messages');
        });

        // Backfill existing single-canvas designs into the new structure.
        DB::table('designs')->orderBy('id')->lazyById()->each(function ($design) {
            $messages = $design->messages;
            if (is_string($messages)) {
                $decoded = json_decode($messages, true);
                $messages = is_array($decoded) ? $decoded : [];
            }
            $messages = $messages ?? [];

            $canvas = [[
                'kind' => $design->kind ?? 'landing-page',
                'html' => $design->html,
                'messages' => $messages,
                'prompt' => $design->prompt,
            ]];

            DB::table('designs')
                ->where('id', $design->id)
                ->update(['canvases' => json_encode($canvas)]);
        });
    }

    public function down(): void
    {
        Schema::table('designs', function (Blueprint $table) {
            $table->dropColumn('canvases');
        });
    }
};
```

- [ ] **Step 4: Run the migration against the test DB and re-run the test**

Run: `php artisan test --filter="canvases json column"`
Expected: PASS (Pest uses `RefreshDatabase`/in-memory and runs migrations).

- [ ] **Step 5: Commit**

```bash
git add database/migrations/2026_06_09_000000_add_canvases_to_designs_table.php tests/Feature/DesignTest.php
git commit -m "feat(design): add canvases json column with backfill"
```

---

### Task 2: Cast `canvases` on the Design model + factory default

**Files:**
- Modify: `app/Models/Design.php`
- Modify: `database/factories/DesignFactory.php`
- Test: `tests/Feature/DesignTest.php`

- [ ] **Step 1: Write the failing test**

Add to `tests/Feature/DesignTest.php`:

```php
test('canvases is cast to an array on the model', function () {
    $design = Design::factory()->create();

    expect($design->fresh()->canvases)->toBeArray()
        ->and($design->fresh()->canvases[0]['kind'])->toBeString();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --filter="canvases is cast"`
Expected: FAIL — `canvases` is null/not an array (factory doesn't set it, cast missing).

- [ ] **Step 3: Add the cast and fillable entry**

In `app/Models/Design.php`, change the `$fillable` array to include `'canvases'`:

```php
    protected $fillable = [
        'title',
        'prompt',
        'kind',
        'model',
        'html',
        'messages',
        'canvases',
    ];
```

And change `casts()` to:

```php
    protected function casts(): array
    {
        return [
            'messages' => 'array',
            'canvases' => 'array',
        ];
    }
```

- [ ] **Step 4: Add `canvases` to the factory default**

In `database/factories/DesignFactory.php`, inside `definition()`'s returned array, add after the `messages` entry:

```php
            'canvases' => [[
                'kind' => 'landing-page',
                'html' => '<!doctype html><html><body><h1>Canvas</h1></body></html>',
                'messages' => [
                    ['role' => 'user', 'content' => fake()->sentence()],
                    ['role' => 'assistant', 'content' => '<!doctype html>...'],
                ],
                'prompt' => fake()->sentence(),
            ]],
```

- [ ] **Step 5: Run test to verify it passes**

Run: `php artisan test --filter="canvases is cast"`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/Models/Design.php database/factories/DesignFactory.php tests/Feature/DesignTest.php
git commit -m "feat(design): cast canvases and add factory default"
```

---

### Task 3: Validate `canvases` in StoreDesignRequest

**Files:**
- Modify: `app/Http/Requests/StoreDesignRequest.php`
- Test: `tests/Feature/DesignTest.php`

- [ ] **Step 1: Write the failing tests**

Add to `tests/Feature/DesignTest.php`:

```php
test('a user can store a design with multiple canvases', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->postJson(route('designs.store'), [
            'title' => 'Multi project',
            'prompt' => 'Aplikasi toko online',
            'kind' => 'landing-page',
            'model' => 'deepseek-v4-flash',
            'html' => '<!doctype html><html></html>',
            'messages' => [],
            'canvases' => [
                ['kind' => 'landing-page', 'html' => '<html>L</html>', 'messages' => [], 'prompt' => 'x'],
                ['kind' => 'dashboard', 'html' => '<html>D</html>', 'messages' => [], 'prompt' => 'x'],
            ],
        ])
        ->assertCreated()
        ->assertJsonPath('design.canvases.1.kind', 'dashboard');
});

test('storing a design rejects an invalid canvas kind', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->postJson(route('designs.store'), [
            'title' => 'Bad canvas',
            'kind' => 'landing-page',
            'model' => 'deepseek-v4-flash',
            'messages' => [],
            'canvases' => [
                ['kind' => 'not-a-kind', 'html' => '<html></html>', 'messages' => []],
            ],
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['canvases.0.kind']);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `php artisan test --filter="canvas"`
Expected: FAIL — `canvases.0.kind` is not validated and the value is dropped (so first test's `canvases.1.kind` path missing, second test has no validation error).

- [ ] **Step 3: Add validation rules**

In `app/Http/Requests/StoreDesignRequest.php`, add these entries to the array returned by `rules()` (after the existing `messages.*.content` rule):

```php
            'canvases' => ['nullable', 'array', 'max:3'],
            'canvases.*.kind' => ['required', 'string', Rule::in(['landing-page', 'dashboard', 'mobile-app'])],
            'canvases.*.html' => ['nullable', 'string', 'max:120000'],
            'canvases.*.prompt' => ['nullable', 'string', 'max:50000'],
            'canvases.*.messages' => ['present', 'array', 'max:60'],
            'canvases.*.messages.*.role' => ['required', 'string', Rule::in(['user', 'assistant'])],
            'canvases.*.messages.*.content' => ['required', 'string', 'max:120000'],
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `php artisan test --filter="canvas"`
Expected: PASS (both).

- [ ] **Step 5: Commit**

```bash
git add app/Http/Requests/StoreDesignRequest.php tests/Feature/DesignTest.php
git commit -m "feat(design): validate canvases array in store request"
```

---

### Task 4: Ensure loaded `current` always has canvases (back-compat)

**Files:**
- Modify: `app/Http/Controllers/DesignController.php:23-41`
- Test: `tests/Feature/DesignTest.php`

Existing designs are backfilled by Task 1's migration, but a defensive fallback guards rows created before this feature or via direct DB writes.

- [ ] **Step 1: Write the failing test**

Add to `tests/Feature/DesignTest.php`:

```php
test('loading a legacy design without canvases synthesizes one canvas', function () {
    $user = User::factory()->create();
    $design = Design::factory()->for($user)->create([
        'kind' => 'dashboard',
        'html' => '<html>legacy</html>',
        'canvases' => null,
    ]);

    $this->actingAs($user)
        ->get(route('design.index', ['design' => $design->id]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('current.canvases.0.kind', 'dashboard')
            ->where('current.canvases.0.html', '<html>legacy</html>'));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --filter="legacy design"`
Expected: FAIL — `current.canvases.0` is null.

- [ ] **Step 3: Add the fallback in the controller**

In `app/Http/Controllers/DesignController.php`, replace the `index` method body's `$current` block (lines ~23-32, where `$current` is fetched) so that after fetching, a fallback is applied. Replace:

```php
        $current = null;

        if ($request->filled('design')) {
            $current = $user->designs()->whereKey($request->string('design'))->first();
        }
```

with:

```php
        $current = null;

        if ($request->filled('design')) {
            $current = $user->designs()->whereKey($request->string('design'))->first();

            if ($current && empty($current->canvases)) {
                $current->canvases = [[
                    'kind' => $current->kind,
                    'html' => $current->html,
                    'messages' => $current->messages ?? [],
                    'prompt' => $current->prompt,
                ]];
            }
        }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `php artisan test --filter="legacy design"`
Expected: PASS.

- [ ] **Step 5: Run the full Design suite (regression)**

Run: `php artisan test --filter=Design`
Expected: PASS (all design tests).

- [ ] **Step 6: Commit**

```bash
git add app/Http/Controllers/DesignController.php tests/Feature/DesignTest.php
git commit -m "feat(design): synthesize canvases fallback when loading legacy designs"
```

---

## PHASE 2 — Frontend types + state hook

### Task 5: Add `CanvasState` type and extend `Design`

**Files:**
- Modify: `resources/js/types/design.ts`

- [ ] **Step 1: Add the types**

In `resources/js/types/design.ts`, after the `DesignKind` type, add:

```ts
export type CanvasState = {
    kind: DesignKind;
    html: string;
    messages: DesignMessage[];
    prompt: string | null;
};
```

And add `canvases` to the `Design` type (after the `messages` line):

```ts
    canvases: CanvasState[] | null;
```

- [ ] **Step 2: Verify types compile**

Run: `npm run types:check`
Expected: PASS (no new errors; existing code does not yet read `canvases`).

- [ ] **Step 3: Commit**

```bash
git add resources/js/types/design.ts
git commit -m "feat(design): add CanvasState type"
```

---

### Task 6: Create the `useCanvases` hook

This hook owns per-canvas data, selection, and the active tab. Keeping it in its own file keeps `design.tsx` manageable.

**Files:**
- Create: `resources/js/hooks/use-canvases.ts`

- [ ] **Step 1: Create the hook**

Create `resources/js/hooks/use-canvases.ts`:

```ts
import { useCallback, useState } from 'react';
import type { CanvasState, Design, DesignKind, DesignMessage } from '@/types/design';

export const ALL_KINDS: DesignKind[] = ['landing-page', 'dashboard', 'mobile-app'];

function emptyCanvas(kind: DesignKind): CanvasState {
    return { kind, html: '', messages: [], prompt: '' };
}

/** Build the initial per-canvas record from a loaded design (with back-compat). */
export function initialCanvasesFrom(current: Design | null): {
    canvases: Record<DesignKind, CanvasState>;
    selectedKinds: DesignKind[];
} {
    const record = {} as Record<DesignKind, CanvasState>;

    let source: CanvasState[] = [];
    if (current?.canvases?.length) {
        source = current.canvases;
    } else if (current) {
        source = [{
            kind: current.kind,
            html: current.html ?? '',
            messages: current.messages ?? [],
            prompt: current.prompt,
        }];
    } else {
        source = [emptyCanvas('landing-page')];
    }

    for (const canvas of source) {
        record[canvas.kind] = {
            kind: canvas.kind,
            html: canvas.html ?? '',
            messages: canvas.messages ?? [],
            prompt: canvas.prompt ?? '',
        };
    }

    const selectedKinds = source.map((c) => c.kind);
    return { canvases: record, selectedKinds };
}

export function useCanvases(current: Design | null) {
    const init = initialCanvasesFrom(current);
    const [canvases, setCanvases] = useState<Record<DesignKind, CanvasState>>(init.canvases);
    const [selectedKinds, setSelectedKinds] = useState<DesignKind[]>(init.selectedKinds);
    const [activeKind, setActiveKind] = useState<DesignKind>(init.selectedKinds[0]);

    /** Toggle a kind on/off. Never allow zero selected; keep activeKind valid. */
    const toggleKind = useCallback((kind: DesignKind) => {
        setSelectedKinds((prev) => {
            const isOn = prev.includes(kind);
            if (isOn && prev.length === 1) {
                return prev; // keep at least one
            }
            const next = isOn ? prev.filter((k) => k !== kind) : [...prev, kind];
            // Order by ALL_KINDS for stable tab order.
            const ordered = ALL_KINDS.filter((k) => next.includes(k));

            if (!isOn) {
                setCanvases((c) => (c[kind] ? c : { ...c, [kind]: emptyCanvas(kind) }));
            }
            setActiveKind((current) => (ordered.includes(current) ? current : ordered[0]));
            return ordered;
        });
    }, []);

    /** Replace one canvas's html + messages + prompt after a generate/refine/edit. */
    const applyCanvasResult = useCallback(
        (kind: DesignKind, html: string, messages: DesignMessage[], prompt: string) => {
            setCanvases((prev) => ({
                ...prev,
                [kind]: { ...(prev[kind] ?? emptyCanvas(kind)), html, messages, prompt },
            }));
        },
        [],
    );

    return {
        canvases,
        setCanvases,
        selectedKinds,
        toggleKind,
        activeKind,
        setActiveKind,
        applyCanvasResult,
    };
}
```

- [ ] **Step 2: Verify types compile**

Run: `npm run types:check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add resources/js/hooks/use-canvases.ts
git commit -m "feat(design): add useCanvases state hook"
```

---

## PHASE 3 — Frontend wiring in design.tsx

> Read `resources/js/pages/design.tsx` fully before starting this phase. Each task below replaces specific named functions/JSX. After EACH task run `npm run types:check` and fix type errors before committing.

### Task 7: Replace single-canvas state with the hook

**Files:**
- Modify: `resources/js/pages/design.tsx` (the `DesignWorkspace` component, ~lines 156-213)

- [ ] **Step 1: Import the hook**

Near the other imports at the top of `design.tsx`, add:

```ts
import { useCanvases } from '@/hooks/use-canvases';
import type { CanvasState } from '@/types/design';
```

- [ ] **Step 2: Replace the single-canvas state declarations**

In `DesignWorkspace`, REMOVE these lines:

```ts
    const [kind, setKind] = useState<DesignKind>(
        current?.kind ?? 'landing-page',
    );
```
```ts
    const [html, setHtml] = useState(current?.html ?? '');
    const [messages, setMessages] = useState<DesignMessage[]>(
        current?.messages ?? [],
    );
```
```ts
    const [streamingHtml, setStreamingHtml] = useState('');
```

ADD in their place (right after the `model` state):

```ts
    const {
        canvases,
        setCanvases,
        selectedKinds,
        toggleKind,
        activeKind,
        setActiveKind,
        applyCanvasResult,
    } = useCanvases(current);

    // Per-canvas streaming HTML, keyed by kind. Empty object = nothing streaming.
    const [streaming, setStreaming] = useState<Partial<Record<DesignKind, string>>>({});

    // Active-canvas convenience reads (replace the old single `html`/`messages`).
    const activeCanvas: CanvasState = canvases[activeKind];
    const html = activeCanvas.html;
    const messages = activeCanvas.messages;
    const streamingHtml = streaming[activeKind] ?? '';
```

- [ ] **Step 3: Replace `setHtml`/`setMessages`/`setKind` usages**

Search the component for remaining `setHtml(`, `setMessages(`, `setKind(`, `setStreamingHtml(` calls. Replace their behavior to target the active canvas:
- `setHtml(x)` → `applyCanvasResult(activeKind, x, messages, activeCanvas.prompt ?? '')`
- `setMessages(m)` → handled together with html via `applyCanvasResult` (see Tasks 8–9; standalone `setMessages` should not remain).
- `setStreamingHtml(x)` → `setStreaming((s) => ({ ...s, [activeKind]: x }))`
- `onKindChange={setKind}` prop → handled in Task 11.

> Note: `handleSelectVersion` (line ~294) calls `setHtml(versions[index].html)`. Replace with:
> ```ts
> const handleSelectVersion = (index: number) => {
>     if (index >= 0 && index < versions.length) {
>         setCurrentVersionIndex(index);
>         applyCanvasResult(activeKind, versions[index].html, messages, activeCanvas.prompt ?? '');
>     }
> };
> ```

- [ ] **Step 4: Verify types compile**

Run: `npm run types:check`
Expected: errors only in `generate`/`persistDesign`/`commitHtml`/JSX props (fixed in later tasks). Note which remain — they are addressed next.

- [ ] **Step 5: Commit**

```bash
git add resources/js/pages/design.tsx resources/js/types/design.ts
git commit -m "refactor(design): hold per-canvas state via useCanvases"
```

---

### Task 8: Rewrite `persistDesign` to save all canvases

**Files:**
- Modify: `resources/js/pages/design.tsx` (the `persistDesign` function, ~lines 306-368)

- [ ] **Step 1: Replace the function signature and payload**

Replace the whole `persistDesign` function with:

```ts
    const persistDesign = async (
        canvasMap: Record<DesignKind, CanvasState>,
        isRegenerate: boolean = false,
    ) => {
        const id = currentIdRef.current;
        const promptToPersist = isRegenerate ? prompt : (initialPrompt || prompt);
        const activeData = canvasMap[activeKind];

        const canvasesPayload = selectedKinds.map((k) => ({
            kind: k,
            html: canvasMap[k]?.html || null,
            messages: canvasMap[k]?.messages ?? [],
            prompt: canvasMap[k]?.prompt ?? null,
        }));

        const payload = {
            title: deriveTitle(promptToPersist, activeKind),
            prompt: promptToPersist,
            kind: activeKind,
            model,
            html: activeData?.html || null,
            messages: activeData?.messages ?? [],
            canvases: canvasesPayload,
        };

        setIsSaving(true);

        try {
            const response = await fetch(
                id
                    ? DesignController.update.url(id)
                    : DesignController.store.url(),
                {
                    method: id ? 'PUT' : 'POST',
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': csrfToken(),
                    },
                    body: JSON.stringify(payload),
                },
            );

            if (!response.ok) {
                throw new Error('save failed');
            }

            const data = (await response.json()) as { design: Design };

            if (!id) {
                assignId(data.design.id);
                router.get(
                    DesignController.index.url({
                        query: { design: data.design.id },
                    }),
                    {},
                    {
                        preserveState: true,
                        preserveScroll: true,
                        replace: true,
                        only: ['history', 'current'],
                    },
                );
            } else {
                router.reload({ only: ['history'] });
            }
        } catch {
            toast.error('Design belum tersimpan. Hasil masih ada di layar.');
        } finally {
            setIsSaving(false);
        }
    };
```

- [ ] **Step 2: Verify types compile**

Run: `npm run types:check`
Expected: errors now only in `generate` and `commitHtml` (they still call the old `persistDesign(nextHtml, nextMessages, ...)` signature) — fixed next.

- [ ] **Step 3: Commit**

```bash
git add resources/js/pages/design.tsx
git commit -m "refactor(design): persist all canvases as one project"
```

---

### Task 9: Rewrite `generate` for parallel multi-canvas

**Files:**
- Modify: `resources/js/pages/design.tsx` (the `generate` function, ~lines 370-464)

- [ ] **Step 1: Replace the whole `generate` function**

```ts
    const generate = async (mode: 'generate' | 'refine') => {
        const instruction = prompt.trim();

        if (!instruction || isGenerating) {
            return;
        }

        // generate → all selected canvases in parallel; refine → active canvas only.
        const targetKinds = mode === 'refine' ? [activeKind] : selectedKinds;
        if (targetKinds.length === 0) {
            return;
        }

        setActiveMode(mode);
        setError(null);
        setEditMode(false);
        setSelected(null);
        setStreaming(Object.fromEntries(targetKinds.map((k) => [k, ''])));
        setIsGenerating(true);
        setViewMode('preview');
        setCurrentVersionIndex(null);

        const userMessage: DesignMessage = { role: 'user', content: instruction };
        const results: Partial<Record<DesignKind, { html: string; messages: DesignMessage[] }>> = {};

        try {
            await Promise.all(
                targetKinds.map(async (k) => {
                    const canvas = canvases[k];
                    const activeHtml = canvas?.html ?? '';
                    let finalHtml = '';

                    await streamDesign(
                        {
                            url: DesignStreamController.url(),
                            csrfToken: csrfToken(),
                            body: {
                                model,
                                mode,
                                kind: k,
                                prompt: instruction,
                                current_html: mode === 'refine' ? activeHtml : null,
                                image,
                            },
                        },
                        {
                            onChunk: (fullHtml) =>
                                setStreaming((s) => ({ ...s, [k]: cleanHtml(fullHtml) })),
                            onDone: (fullHtml) => {
                                finalHtml = cleanHtml(fullHtml);
                            },
                            onError: (message) => {
                                throw new Error(message);
                            },
                        },
                    );

                    if (!finalHtml.trim()) {
                        throw new Error(`Canvas ${k} tidak menghasilkan kode yang bisa dibaca.`);
                    }

                    const baseMessages = mode === 'refine' ? canvas?.messages ?? [] : [];
                    results[k] = {
                        html: finalHtml,
                        messages: [
                            ...baseMessages,
                            userMessage,
                            { role: 'assistant', content: finalHtml },
                        ],
                    };
                }),
            );

            // Build the next canvas map, apply it to state, then persist that map.
            const nextMap = { ...canvases };
            for (const k of targetKinds) {
                const r = results[k];
                if (r) {
                    nextMap[k] = {
                        ...(nextMap[k] ?? { kind: k, html: '', messages: [], prompt: '' }),
                        kind: k,
                        html: r.html,
                        messages: r.messages,
                        prompt: instruction,
                    };
                }
            }
            setCanvases(nextMap);

            if (mode === 'refine') {
                setPrompt('');
            } else {
                setInitialPrompt(prompt);
            }

            await persistDesign(nextMap, mode === 'generate');
        } catch (caughtError) {
            const message =
                caughtError instanceof Error
                    ? caughtError.message
                    : 'Design belum bisa dibuat. Coba lagi.';

            setError(
                message === 'Failed to fetch'
                    ? 'Server Laravel terputus. Jalankan ulang server lalu coba lagi.'
                    : message,
            );
        } finally {
            setIsGenerating(false);
            setStreaming({});
        }
    };
```

- [ ] **Step 2: Verify types compile**

Run: `npm run types:check`
Expected: errors now only in `commitHtml` and JSX props (selector/preview) — fixed next.

- [ ] **Step 3: Commit**

```bash
git add resources/js/pages/design.tsx
git commit -m "feat(design): generate all selected canvases in parallel"
```

---

### Task 10: Fix `commitHtml` (visual-edit save) for active canvas

**Files:**
- Modify: `resources/js/pages/design.tsx` (the `commitHtml` function, ~lines 466-481)

- [ ] **Step 1: Replace `commitHtml`**

```ts
    const commitHtml = (editedHtml: string, notice: string) => {
        let activeMessages = messages;
        if (currentVersionIndex !== null && currentVersionIndex < versions.length - 1) {
            const activeVersion = versions[currentVersionIndex];
            activeMessages = messages.slice(0, activeVersion.messageIndex + 1);
        }

        const nextMessages: DesignMessage[] = [
            ...activeMessages,
            { role: 'assistant', content: editedHtml },
        ];

        const nextMap = {
            ...canvases,
            [activeKind]: {
                ...activeCanvas,
                html: editedHtml,
                messages: nextMessages,
            },
        };
        setCanvases(nextMap);
        persistDesign(nextMap, false);
        toast.success(notice);
    };
```

- [ ] **Step 2: Also fix `handleShowCode`'s inline `setHtml`**

In `handleShowCode` (~line 501) replace `setHtml(editedHtml);` with:

```ts
                applyCanvasResult(activeKind, editedHtml, messages, activeCanvas.prompt ?? '');
```

- [ ] **Step 3: Fix `downloadHtml` title arg**

In `downloadHtml` (~line 512) replace `deriveTitle(prompt, kind)` with `deriveTitle(prompt, activeKind)`.

- [ ] **Step 4: Verify types compile**

Run: `npm run types:check`
Expected: only JSX prop errors remain (PromptPanel `kind`/`onKindChange`, PreviewPanel) — fixed in Tasks 11–12.

- [ ] **Step 5: Commit**

```bash
git add resources/js/pages/design.tsx
git commit -m "refactor(design): route visual-edit save to active canvas"
```

---

### Task 11: Multi-select page-type cards in `PromptPanel`

**Files:**
- Modify: `resources/js/pages/design.tsx` (`PromptPanel` props + the page-type selector JSX around line 815)

- [ ] **Step 1: Change the props PromptPanel receives (call site, ~lines 637-663)**

Replace `kind={kind}` and `onKindChange={setKind}` in the `<PromptPanel .../>` call with:

```tsx
                            selectedKinds={selectedKinds}
                            onToggleKind={toggleKind}
```

- [ ] **Step 2: Update `PromptPanel`'s parameter list and type**

In the `PromptPanel` function signature (~line 721) remove `kind,` and `onKindChange,` and add `selectedKinds,` and `onToggleKind,`. In its props type (the `{ ... }` block ~lines 746-770), remove:

```ts
    kind: DesignKind;
```
```ts
    onKindChange: (kind: DesignKind) => void;
```
and add:

```ts
    selectedKinds: DesignKind[];
    onToggleKind: (kind: DesignKind) => void;
```

- [ ] **Step 3: Replace the selector rendering**

Find the page-type card loop (~line 815) where `const isActive = item.value === kind;`. Replace `isActive` derivation and the card's `onClick` so each card toggles:

```tsx
                        const isActive = selectedKinds.includes(item.value);
```
and the card's click handler:

```tsx
                            onClick={() => onToggleKind(item.value)}
```

> The cards already render with an active style when `isActive` is true — multi-select now lights up every selected card. Add an `aria-pressed={isActive}` to the card button for accessibility.

- [ ] **Step 4: Replace any other `kind` reads inside PromptPanel**

`EXAMPLE_PROMPTS[kind]` (used ~lines 883 and 938 for the example-prompt button) must use a concrete kind. Use the first selected kind:

```tsx
                            : EXAMPLE_PROMPTS[selectedKinds[0]]
```
and for the onClick at ~938:

```tsx
                        onClick={() => onPromptChange(EXAMPLE_PROMPTS[selectedKinds[0]])}
```

- [ ] **Step 5: Verify types compile**

Run: `npm run types:check`
Expected: only PreviewPanel-related errors remain (Task 12).

- [ ] **Step 6: Commit**

```bash
git add resources/js/pages/design.tsx
git commit -m "feat(design): multi-select page-type cards"
```

---

### Task 12: Canvas tab bar in `PreviewPanel`

**Files:**
- Modify: `resources/js/pages/design.tsx` (`PreviewPanel` props + header, ~lines 1356-1640)

- [ ] **Step 1: Pass tab props to PreviewPanel (call site, ~lines 665-688)**

Add to the `<PreviewPanel .../>` call:

```tsx
                            selectedKinds={selectedKinds}
                            activeKind={activeKind}
                            onTabChange={setActiveKind}
                            streaming={streaming}
```

- [ ] **Step 2: Extend PreviewPanel's props type and params**

Add to the props type:

```ts
    selectedKinds: DesignKind[];
    activeKind: DesignKind;
    onTabChange: (kind: DesignKind) => void;
    streaming: Partial<Record<DesignKind, string>>;
```
and add `selectedKinds, activeKind, onTabChange, streaming,` to the destructured params.

- [ ] **Step 3: Render the tab bar**

Add a tab strip at the top of the PreviewPanel body (above the preview/code area), rendered only when more than one kind is selected:

```tsx
                {selectedKinds.length > 1 ? (
                    <div className="flex shrink-0 items-center gap-1 border-b border-border px-2 py-1.5">
                        {selectedKinds.map((k) => {
                            const labels: Record<DesignKind, string> = {
                                'landing-page': 'Landing',
                                dashboard: 'Dashboard',
                                'mobile-app': 'Mobile',
                            };
                            const isStreaming = typeof streaming[k] === 'string';
                            return (
                                <button
                                    key={k}
                                    type="button"
                                    onClick={() => onTabChange(k)}
                                    aria-pressed={k === activeKind}
                                    className={cn(
                                        'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition',
                                        k === activeKind
                                            ? 'bg-primary text-primary-foreground'
                                            : 'text-muted-foreground hover:bg-muted',
                                    )}
                                >
                                    {labels[k]}
                                    {isStreaming ? (
                                        <Loader2 className="size-3 animate-spin" />
                                    ) : null}
                                </button>
                            );
                        })}
                    </div>
                ) : null}
```

> Place this inside the PreviewPanel's outer container so it sits above the existing preview/code switch. The existing preview body already reads `html`/`streamingHtml`, which now reflect the active canvas (passed from the parent). No change needed to the iframe rendering itself.

- [ ] **Step 4: Confirm `Loader2` and `cn` are already imported**

They are used elsewhere in the file (e.g. line 627, 1733). No new import needed. If `DesignKind` is not imported in this file already, it is (used in props). Verify.

- [ ] **Step 5: Verify types compile**

Run: `npm run types:check`
Expected: PASS (zero errors).

- [ ] **Step 6: Lint + build**

Run: `npm run lint:check && npm run build`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add resources/js/pages/design.tsx
git commit -m "feat(design): add canvas tab bar to preview"
```

---

## PHASE 4 — Full verification

### Task 13: Whole-suite + manual verification

- [ ] **Step 1: Backend tests**

Run: `php artisan test`
Expected: PASS (all green).

- [ ] **Step 2: Frontend gates**

Run: `npm run types:check && npm run lint:check && npm run build`
Expected: all PASS.

- [ ] **Step 3: Manual verification (use the `verify` or `run` skill)**

Start the app, then in Design Studio:
1. Select 2–3 page types (cards light up; can't deselect the last one).
2. Type one product description, click Generate.
3. Confirm tabs appear and each tab builds its own canvas live (spinner per still-streaming tab).
4. Switch tabs — each shows its own HTML.
5. Refine on one tab — only that canvas changes; others untouched.
6. Reload from History — all canvases restored, tabs present.
7. Open a pre-existing (legacy) design — shows as a single canvas, still works.
8. Export — downloads the active canvas, filename includes the kind.

Expected: all behaviors hold.

- [ ] **Step 4: Final commit (if any tweaks)**

```bash
git add -A
git commit -m "test(design): verify multi-canvas studio end to end"
```

---

## Self-Review notes (for the implementer)

- **Spec coverage:** data model (Tasks 1–4), multi-select UI (Task 11), parallel generate (Task 9), tabs (Task 12), refine active-only (Task 9), per-canvas persist (Task 8), export active (Task 10 Step 3), back-compat (Tasks 1 & 4). All covered.
- **No JS unit tests** exist in this repo; frontend correctness is gated by `tsc`/`eslint`/`vite build` + the manual checklist in Task 13. Do not invent a test runner.
- **Type consistency:** `applyCanvasResult(kind, html, messages, prompt)`, `persistDesign(canvasMap, isRegenerate)`, `streaming` is `Partial<Record<DesignKind,string>>`, `canvases` is `Record<DesignKind,CanvasState>`. Keep these signatures identical across tasks.
