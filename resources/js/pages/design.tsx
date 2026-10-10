import { Head, router, usePage } from '@inertiajs/react';
import { History, Loader2, Plus } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import DesignController from '@/actions/App/Http/Controllers/DesignController';
import DesignStreamController from '@/actions/App/Http/Controllers/DesignStreamController';
import {
    HISTORY_DRAWER_ID,
    HistorySidebar,
} from '@/components/design/history-sidebar';
import { PreviewPanel } from '@/components/design/preview-panel';
import type { DesignPreviewHandle } from '@/components/design/preview-panel';
import { PromptPanel } from '@/components/design/prompt-panel';
import { StudioRail } from '@/components/design/studio-rail';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { UserMenu } from '@/components/workspace/user-menu';
import { useAiModels } from '@/hooks/use-ai-models';
import type { AiModelOption } from '@/hooks/use-ai-models';
import { useCanvases } from '@/hooks/use-canvases';
import { exportDesign } from '@/lib/design-export';
import { cleanHtml, deriveTitle, MAX_SAVED_MESSAGES } from '@/lib/design-html';
import type { Model } from '@/lib/models';
import { streamSse } from '@/lib/stream-sse';
import type {
    Auth,
    Design,
    DesignKind,
    DesignMessage,
    DesignSummary,
    SelectedElement,
    User,
} from '@/types';
import type { CanvasState } from '@/types/design';

type PageProps = {
    auth: Auth;
    history: DesignSummary[];
    current: Design | null;
    fromPrd?: { id: string; title: string; content: string } | null;
    aiModels?: string[];
    [key: string]: unknown;
};

export default function DesignStudio() {
    const { auth, history, current, fromPrd, aiModels } =
        usePage<PageProps>().props;
    const {
        models: availableModels,
        isLoading: areModelsLoading,
        error: modelError,
    } = useAiModels(aiModels ?? []);

    return (
        <DesignWorkspace
            key={current?.id ?? 'new'}
            user={auth.user}
            history={history}
            current={current}
            fromPrd={fromPrd}
            aiModels={availableModels}
            areModelsLoading={areModelsLoading}
            modelError={modelError}
        />
    );
}

function DesignWorkspace({
    user,
    history,
    current,
    fromPrd: initialFromPrd,
    aiModels,
    areModelsLoading,
    modelError,
}: {
    user: User;
    history: DesignSummary[];
    current: Design | null;
    fromPrd?: { id: string; title: string; content: string } | null;
    aiModels: AiModelOption[];
    areModelsLoading: boolean;
    modelError: string | null;
}) {
    const currentIdRef = useRef<string | null>(current?.id ?? null);
    const [currentId, setCurrentId] = useState<string | null>(
        current?.id ?? null,
    );

    const [fromPrd, setFromPrd] = useState(initialFromPrd);

    const onClearPrdContext = () => {
        setFromPrd(null);

        if (prompt.includes(initialFromPrd?.content ?? '')) {
            setPrompt('');
        }
    };

    const [selectedModel, setSelectedModel] = useState<Model>(
        (current?.model as Model) ?? 'deepseek-v4-flash',
    );
    // Derived: the effective model always belongs to the current provider
    // set — if the admin removed it, fall back to the first available.
    const modelIds = aiModels.map((option) => option.id);
    const model = modelIds.includes(selectedModel)
        ? selectedModel
        : (modelIds[0] ?? selectedModel);
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
    const [streaming, setStreaming] = useState<
        Partial<Record<DesignKind, string>>
    >({});

    // Active-canvas convenience reads (replace the old single `html`/`messages`).
    const activeCanvas: CanvasState = canvases[activeKind] ?? {
        kind: activeKind,
        html: '',
        messages: [],
        prompt: '',
    };
    const html = activeCanvas.html;
    const messages = activeCanvas.messages;
    const streamingHtml = streaming[activeKind] ?? '';
    const [prompt, setPrompt] = useState(() => {
        if (initialFromPrd && !current) {
            return `Buat mockup halaman berdasarkan dokumen PRD "${initialFromPrd.title}" berikut:\n\n${initialFromPrd.content}`;
        }

        return '';
    });
    const [initialPrompt, setInitialPrompt] = useState(current?.prompt ?? '');
    const [image, setImage] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [activeMode, setActiveMode] = useState<'generate' | 'refine'>(
        'generate',
    );
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editMode, setEditMode] = useState(false);
    const [selected, setSelected] = useState<SelectedElement | null>(null);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
    const [copied, setCopied] = useState(false);

    const previewRef = useRef<DesignPreviewHandle>(null);
    const streamAbortRef = useRef<AbortController | null>(null);

    // Leaving the workspace (navigation, design switch) must cancel any live
    // SSE streams: otherwise they keep burning tokens and may still persist
    // results into the old design after the user has moved on.
    useEffect(() => {
        return () => {
            streamAbortRef.current?.abort();
        };
    }, []);

    const stopGeneration = () => {
        streamAbortRef.current?.abort();
    };

    const hasDesign = Boolean(html.trim());

    // Context inherited by not-yet-generated canvases: reuse the prompt from the
    // first canvas that already produced HTML, falling back to the saved prompt.
    const inheritedContext = useMemo(() => {
        for (const k of selectedKinds) {
            const canvas = canvases[k];

            if (canvas?.html?.trim() && canvas.prompt?.trim()) {
                return canvas.prompt;
            }
        }

        return initialPrompt ?? '';
    }, [canvases, selectedKinds, initialPrompt]);

    // Switching to an empty canvas pre-fills the prompt with the inherited
    // context so dashboard/mobile-app start from the same brief as the landing
    // page. Never overwrites a generated canvas or text the user already typed.
    useEffect(() => {
        if (canvases[activeKind]?.html?.trim()) {
            return;
        }

        if (!inheritedContext.trim()) {
            return;
        }

        setPrompt((prev) => (prev.trim() ? prev : inheritedContext));
    }, [activeKind, canvases, inheritedContext]);

    const assignId = (id: string | null) => {
        currentIdRef.current = id;
        setCurrentId(id);
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(html);
        setCopied(true);
        toast.success('Kode HTML berhasil disalin ke clipboard!');
        setTimeout(() => setCopied(false), 2000);
    };

    // Derive the build step from what the AI has streamed so far, so the
    // checklist reflects real progress instead of a fixed timer.
    const activeStep = useMemo(() => {
        const lower = streamingHtml.toLowerCase();

        if (lower.includes('<footer') || lower.includes('</html>')) {
            return 4;
        }

        if (lower.includes('<section') || lower.includes('<main')) {
            return 3;
        }

        if (lower.includes('</style>') || lower.includes('<body')) {
            return 2;
        }

        if (lower.includes('<style')) {
            return 1;
        }

        return 0;
    }, [streamingHtml]);

    // Derive the list of versions from messages array.
    const versions = useMemo(() => {
        const list: {
            index: number;
            messageIndex: number;
            description: string;
            html: string;
        }[] = [];

        messages.forEach((msg, idx) => {
            if (msg.role === 'assistant') {
                const prevMsg = idx > 0 ? messages[idx - 1] : null;
                const description =
                    prevMsg && prevMsg.role === 'user'
                        ? prevMsg.content
                        : 'Edit Visual';
                list.push({
                    index: list.length,
                    messageIndex: idx,
                    description,
                    html: msg.content,
                });
            }
        });

        return list;
    }, [messages]);

    const [currentVersionIndex, setCurrentVersionIndex] = useState<
        number | null
    >(null);

    // Jump to the newest version whenever the canvas changes or history grows.
    // Adjusted during render rather than in an effect: an effect would render
    // one frame pointing at a stale version, then cascade a second render.
    // https://react.dev/learn/you-might-not-need-an-effect
    const [prevVersionsLength, setPrevVersionsLength] = useState(
        versions.length,
    );
    const [prevActiveKind, setPrevActiveKind] = useState(activeKind);

    if (
        prevActiveKind !== activeKind ||
        prevVersionsLength !== versions.length
    ) {
        setPrevActiveKind(activeKind);
        setPrevVersionsLength(versions.length);
        setCurrentVersionIndex(
            versions.length > 0 ? versions.length - 1 : null,
        );
    } else if (currentVersionIndex === null && versions.length > 0) {
        setCurrentVersionIndex(versions.length - 1);
    }

    const handleSelectVersion = (index: number) => {
        if (index >= 0 && index < versions.length) {
            setCurrentVersionIndex(index);
            applyCanvasResult(
                activeKind,
                versions[index].html,
                messages,
                activeCanvas.prompt ?? '',
            );
        }
    };

    const csrfToken = () =>
        document
            .querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
            ?.getAttribute('content') ?? '';

    const persistDesign = async (
        canvasMap: Record<DesignKind, CanvasState>,
        isRegenerate: boolean = false,
    ) => {
        const id = currentIdRef.current;
        const promptToPersist = isRegenerate ? prompt : initialPrompt || prompt;
        const activeData = canvasMap[activeKind];

        const canvasesPayload = selectedKinds.map((k) => ({
            kind: k,
            html: canvasMap[k]?.html || null,
            // Every version is a whole HTML document; the newest ones are
            // what a long refine session needs, and all of them did not fit.
            messages: (canvasMap[k]?.messages ?? []).slice(-MAX_SAVED_MESSAGES),
            prompt: canvasMap[k]?.prompt ?? null,
        }));

        const payload = {
            title: deriveTitle(promptToPersist, activeKind),
            prompt: promptToPersist,
            kind: activeKind,
            model,
            html: activeData?.html || null,
            // Legacy column, read only for designs saved before canvases:
            // the active canvas already carries these messages.
            messages: [],
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
                let detail = `HTTP ${response.status}`;

                try {
                    const errBody = (await response.json()) as {
                        message?: string;
                        errors?: Record<string, string[]>;
                    };

                    if (errBody.errors) {
                        detail = Object.values(errBody.errors).flat().join(' ');
                    } else if (errBody.message) {
                        detail = errBody.message;
                    }
                } catch {
                    // Response body wasn't JSON; keep the status code as the detail.
                }

                throw new Error(detail);
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
        } catch (saveError) {
            const reason =
                saveError instanceof Error
                    ? saveError.message
                    : 'Penyebab tidak diketahui';
            toast.error(
                `Design belum tersimpan (${reason}). Hasil masih ada di layar.`,
            );
        } finally {
            setIsSaving(false);
        }
    };

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

        const userMessage: DesignMessage = {
            role: 'user',
            content: instruction,
        };
        const results: Partial<
            Record<DesignKind, { html: string; messages: DesignMessage[] }>
        > = {};
        const errorMessages: string[] = [];
        const truncatedKinds: DesignKind[] = [];
        let abortedByUser = false;

        try {
            await Promise.allSettled(
                targetKinds.map(async (k) => {
                    const canvas = canvases[k];
                    const activeHtml = canvas?.html ?? '';
                    let finalHtml = '';
                    let truncated = false;

                    try {
                        // Share one AbortController across all parallel canvas streams
                        // so a single "Stop" click cancels them all.
                        const controller =
                            streamAbortRef.current ?? new AbortController();
                        streamAbortRef.current = controller;

                        try {
                            await streamSse(
                                {
                                    url: DesignStreamController.url(),
                                    csrfToken: csrfToken(),
                                    failureMessage:
                                        'Design belum bisa dibuat. Coba lagi.',
                                    body: {
                                        model,
                                        mode,
                                        kind: k,
                                        prompt: instruction,
                                        current_html:
                                            mode === 'refine'
                                                ? activeHtml
                                                : null,
                                        image,
                                    },
                                    signal: controller.signal,
                                },
                                {
                                    onChunk: (fullHtml) =>
                                        setStreaming((s) => ({
                                            ...s,
                                            [k]: cleanHtml(fullHtml),
                                        })),
                                    onDone: (fullHtml, meta) => {
                                        finalHtml = cleanHtml(fullHtml);
                                        truncated = meta.truncated;
                                    },
                                    onError: (message) => {
                                        throw new Error(message);
                                    },
                                },
                            );
                        } catch (taskError) {
                            // AbortError dari klik "Berhenti" — perlakukan
                            // sebagai pembatalan yang tenang, BUKAN kegagalan.
                            if (
                                taskError instanceof DOMException &&
                                taskError.name === 'AbortError'
                            ) {
                                abortedByUser = true;

                                return;
                            }

                            throw taskError;
                        }

                        if (!finalHtml.trim()) {
                            throw new Error(
                                `Canvas ${k} tidak menghasilkan kode yang bisa dibaca.`,
                            );
                        }

                        // A cut-off refine would replace a working page with a
                        // broken one; a cut-off first draft still beats nothing.
                        if (truncated && mode === 'refine') {
                            throw new Error(
                                `Canvas ${k} terpotong di batas output model, jadi versi sebelumnya dipertahankan. Coba instruksi yang lebih spesifik atau model lain.`,
                            );
                        }

                        if (truncated) {
                            truncatedKinds.push(k);
                        }

                        // Refining an older version must branch from THAT point,
                        // not from the tail of the full history — otherwise the
                        // versions this UI promises to discard would survive.
                        let baseMessages: DesignMessage[] = [];

                        if (mode === 'refine') {
                            const canvasMessages = canvas?.messages ?? [];

                            if (
                                currentVersionIndex !== null &&
                                currentVersionIndex < versions.length - 1
                            ) {
                                const activeVersion =
                                    versions[currentVersionIndex];
                                baseMessages = canvasMessages.slice(
                                    0,
                                    activeVersion.messageIndex + 1,
                                );
                            } else {
                                baseMessages = canvasMessages;
                            }
                        }

                        results[k] = {
                            html: finalHtml,
                            messages: [
                                ...baseMessages,
                                userMessage,
                                { role: 'assistant', content: finalHtml },
                            ],
                        };
                    } catch (taskError) {
                        const message =
                            taskError instanceof Error
                                ? taskError.message
                                : 'Design belum bisa dibuat. Coba lagi.';
                        errorMessages.push(message);

                        // Rethrow so this kind settles as rejected (its result stays absent).
                        throw taskError;
                    }
                }),
            );

            // Build the next canvas map, fill ONLY the kinds that succeeded.
            const nextMap = { ...canvases };

            for (const k of targetKinds) {
                const r = results[k];

                if (r) {
                    nextMap[k] = {
                        ...(nextMap[k] ?? {
                            kind: k,
                            html: '',
                            messages: [],
                            prompt: '',
                        }),
                        kind: k,
                        html: r.html,
                        messages: r.messages,
                        prompt: instruction,
                    };
                }
            }

            const succeeded = Object.keys(results).length > 0;

            if (succeeded) {
                setCanvases(nextMap);

                if (mode === 'refine') {
                    setPrompt('');
                } else {
                    setInitialPrompt(prompt);
                }

                await persistDesign(nextMap, mode === 'generate');
            }

            if (truncatedKinds.length) {
                toast.warning(
                    `Canvas ${truncatedKinds.join(', ')} terpotong di batas output model. Periksa bagian akhir halaman.`,
                );
            }

            const failed = targetKinds.filter((k) => !results[k]);

            if (abortedByUser) {
                // Deliberate cancellation is not a failure — keep whatever
                // streamed in so far out of the error banner entirely.
                return;
            }

            if (failed.length) {
                if (succeeded) {
                    setError(
                        `Sebagian canvas gagal dibuat: ${failed.join(', ')}. Canvas lain berhasil disimpan.`,
                    );
                } else {
                    // Nothing succeeded — surface a general failure, keeping the
                    // "Failed to fetch" friendly message when relevant.
                    const message =
                        errorMessages[0] ??
                        'Design belum bisa dibuat. Coba lagi.';
                    setError(
                        message === 'Failed to fetch'
                            ? 'Server Laravel terputus. Jalankan ulang server lalu coba lagi.'
                            : message,
                    );
                }
            }
        } finally {
            streamAbortRef.current = null;
            setIsGenerating(false);
            setStreaming({});
        }
    };

    const commitHtml = (editedHtml: string, notice: string) => {
        let activeMessages = messages;

        if (
            currentVersionIndex !== null &&
            currentVersionIndex < versions.length - 1
        ) {
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

    const toggleEditMode = () => {
        setEditMode((value) => {
            const next = !value;

            if (!next) {
                setSelected(null);
            }

            return next;
        });
    };

    const saveEdits = () => {
        previewRef.current?.requestHtml((editedHtml) => {
            commitHtml(editedHtml, 'Perubahan design disimpan.');
        });
    };

    const handleShowCode = () => {
        if (editMode) {
            previewRef.current?.requestHtml((editedHtml) => {
                // Route through commitHtml so visual edits enter the version
                // history AND persist — silently swapping state here used to
                // lose edits on the next version switch or reload.
                commitHtml(editedHtml, 'Perubahan design disimpan.');
                setViewMode('code');
            });
        } else {
            setViewMode('code');
        }
    };

    const downloadHtml = () => {
        const name = deriveTitle(prompt, activeKind);
        exportDesign(html, name, 'html');
        toast.success('Design diunduh sebagai HTML.');
    };

    const openDesign = (id: string) => {
        setHistoryOpen(false);

        if (id === currentIdRef.current) {
            return;
        }

        router.get(
            DesignController.index.url({ query: { design: id } }),
            {},
            { preserveScroll: true },
        );
    };

    const startNew = () => {
        setHistoryOpen(false);
        router.get(DesignController.index.url(), {}, { preserveScroll: true });
    };

    const deleteDesign = (id: string) => {
        setPendingDeleteId(id);
    };

    const confirmDelete = () => {
        if (pendingDeleteId !== null) {
            router.delete(DesignController.destroy.url(pendingDeleteId), {
                preserveScroll: true,
            });
            setPendingDeleteId(null);
        }
    };

    const promptPanel = (
        <PromptPanel
            selectedKinds={selectedKinds}
            onToggleKind={toggleKind}
            model={model}
            models={aiModels}
            areModelsLoading={areModelsLoading}
            modelError={modelError}
            prompt={prompt}
            initialPrompt={initialPrompt}
            hasDesign={hasDesign}
            isGenerating={isGenerating}
            activeStep={activeStep}
            error={error}
            editMode={editMode}
            selected={selected}
            image={image}
            fromPrd={fromPrd}
            onModelChange={setSelectedModel}
            onPromptChange={setPrompt}
            onImageChange={setImage}
            onGenerate={() => generate('generate')}
            onRefine={() => generate('refine')}
            onStop={stopGeneration}
            onUpdateSelected={(patch) =>
                previewRef.current?.updateSelected(patch)
            }
            onClearPrdContext={onClearPrdContext}
            versions={versions}
            currentVersionIndex={currentVersionIndex}
            onSelectVersion={handleSelectVersion}
        />
    );

    return (
        <>
            <Head title="Design Studio" />

            {/* lg+: 64px rail · 360px prompt panel · canvas, locked to the
                viewport. Below lg header, prompt and canvas stack and the page
                scrolls. Grid (not flex) at every size: the canvas must be a
                stretched grid item so the h-full preview frame resolves. */}
            <div className="grid min-h-dvh grid-cols-1 grid-rows-[auto_auto_1fr] bg-background text-foreground lg:h-dvh lg:grid-cols-[64px_360px_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] lg:overflow-hidden">
                <StudioRail
                    user={user}
                    historyOpen={historyOpen}
                    onToggleHistory={() => setHistoryOpen((open) => !open)}
                />

                <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-4 md:px-6 lg:hidden">
                    <div className="flex min-w-0 items-center gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="shrink-0"
                            aria-label="Buka riwayat"
                            aria-expanded={historyOpen}
                            aria-controls={HISTORY_DRAWER_ID}
                            onClick={() => setHistoryOpen(true)}
                        >
                            <History className="size-5" strokeWidth={1.75} />
                        </Button>
                        <div className="flex min-w-0 flex-col gap-1">
                            <h1 className="font-serif text-2xl leading-none whitespace-nowrap">
                                Design Studio
                            </h1>
                            <p className="truncate label-mono">
                                Workspace {user.name}
                            </p>
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                        {isSaving ? (
                            <span className="hidden items-center gap-1.5 label-mono sm:flex">
                                <Loader2 className="size-3 animate-spin" />
                                Menyimpan
                            </span>
                        ) : null}
                        {hasDesign || currentId ? (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-9 bg-card"
                                onClick={startNew}
                                aria-label="Buat design baru"
                            >
                                <Plus className="size-4" />
                                <span className="hidden sm:inline">
                                    Design baru
                                </span>
                            </Button>
                        ) : null}
                        {/* Phones only have room for the avatar. */}
                        <UserMenu user={user} nameClassName="max-sm:hidden" />
                    </div>
                </header>

                <section
                    aria-label="Panel prompt"
                    className="flex flex-col border-b border-border lg:min-h-0 lg:border-r lg:border-b-0"
                >
                    <div className="hidden h-[72px] shrink-0 items-center justify-between gap-4 border-b border-border px-6 lg:flex">
                        <h1 className="shrink-0 font-serif text-[30px] leading-none whitespace-nowrap">
                            Design Studio
                        </h1>
                        <span
                            aria-live="polite"
                            className="flex min-w-0 items-center gap-1.5 label-mono"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="size-3 shrink-0 animate-spin" />
                                    Menyimpan
                                </>
                            ) : (
                                <span className="truncate">
                                    Workspace {user.name}
                                </span>
                            )}
                        </span>
                    </div>

                    {promptPanel}
                </section>

                <PreviewPanel
                    ref={previewRef}
                    html={html}
                    streamingHtml={streamingHtml}
                    selectedKinds={selectedKinds}
                    activeKind={activeKind}
                    onTabChange={setActiveKind}
                    streaming={streaming}
                    hasDesign={hasDesign}
                    isGenerating={isGenerating}
                    activeMode={activeMode}
                    editMode={editMode}
                    designId={currentId}
                    viewMode={viewMode}
                    copied={copied}
                    versions={versions}
                    currentVersionIndex={currentVersionIndex}
                    onSelectVersion={handleSelectVersion}
                    onViewModeChange={(mode) => {
                        if (mode === 'code') {
                            handleShowCode();
                        } else {
                            setViewMode('preview');
                        }
                    }}
                    onToggleEdit={toggleEditMode}
                    onDownloadHtml={downloadHtml}
                    onSelect={setSelected}
                    onSave={saveEdits}
                    onCopyCode={copyToClipboard}
                    onStop={stopGeneration}
                />
            </div>

            <HistorySidebar
                history={history}
                currentId={currentId}
                open={historyOpen}
                onClose={() => setHistoryOpen(false)}
                onNew={startNew}
                onOpen={openDesign}
                onDelete={deleteDesign}
            />

            <Dialog
                open={pendingDeleteId !== null}
                onOpenChange={(open) => !open && setPendingDeleteId(null)}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Hapus Design?</DialogTitle>
                        <DialogDescription>
                            Tindakan ini tidak bisa dibatalkan. Design beserta
                            seluruh isinya akan dihapus permanen.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setPendingDeleteId(null)}
                        >
                            Batal
                        </Button>
                        <Button variant="destructive" onClick={confirmDelete}>
                            Hapus
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
