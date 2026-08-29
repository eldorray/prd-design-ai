import { Head, router, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    Check,
    ChevronLeft,
    ChevronRight,
    Code2,
    Copy,
    Download,
    Eye,
    FileArchive,
    FileText,
    History,
    Layout,
    LayoutDashboard,
    Loader2,
    Monitor,
    MousePointerClick,
    PanelLeft,
    Pencil,
    Plus,
    Smartphone,
    Sparkles,
    Tablet,
    Trash2,
    Type,
    Square,
    Upload,
    Wand2,
    X,
} from 'lucide-react';
import {
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef,
    useState,
} from 'react';
import { toast } from 'sonner';

import DesignController from '@/actions/App/Http/Controllers/DesignController';
import DesignStreamController from '@/actions/App/Http/Controllers/DesignStreamController';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { UserInfo } from '@/components/user-info';
import { UserMenuContent } from '@/components/user-menu-content';
import { useAiModels } from '@/hooks/use-ai-models';
import type { AiModelOption } from '@/hooks/use-ai-models';
import { useCanvases } from '@/hooks/use-canvases';
import { exportDesign } from '@/lib/design-export';
import { streamDesign } from '@/lib/stream-design';
import { cn } from '@/lib/utils';
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

type Model = string;

const MODEL_LABELS: Record<string, string> = {
    'deepseek-v4-flash': 'DeepSeek V4 Flash',
    'deepseek-v4-pro': 'DeepSeek V4 Pro',
    'gemini-3.5-flash': 'Gemini 3.5 Flash',
    'gemini-3.1-pro-preview': 'Gemini 3.1 Pro',
    'MiniMax-M3': 'MiniMax M3',
};

const modelLabel = (model: string): string => MODEL_LABELS[model] ?? model;

type PageProps = {
    auth: Auth;
    history: DesignSummary[];
    current: Design | null;
    fromPrd?: { id: string; title: string; content: string } | null;
    aiModels?: string[];
    [key: string]: unknown;
};

const KINDS: { value: DesignKind; label: string; icon: typeof Layout }[] = [
    { value: 'landing-page', label: 'Landing page', icon: Layout },
    { value: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { value: 'mobile-app', label: 'Mobile app mockup', icon: Smartphone },
];

const GENERATE_STEPS = [
    'Menganalisis permintaan',
    'Menyusun struktur layout',
    'Menata komponen & konten',
    'Menerapkan styling & warna',
    'Merapikan & finalisasi',
];

const EXAMPLE_PROMPTS: Record<DesignKind, string> = {
    'landing-page':
        'Landing page untuk aplikasi kebugaran dengan hero gelap, tombol CTA hijau, daftar fitur, dan testimoni.',
    dashboard:
        'Dashboard admin penjualan dengan sidebar, 4 kartu statistik, tabel transaksi terbaru, dan grafik sederhana.',
    'mobile-app':
        'Aplikasi e-wallet dengan layar Beranda (saldo & riwayat), layar Statistik (kategori pengeluaran), layar Transfer (input nominal & penerima), dan Profil akun.',
};

function deriveTitle(prompt: string, kind: DesignKind) {
    const clean = prompt.replace(/\s+/g, ' ').trim();

    if (clean) {
        return clean.slice(0, 80);
    }

    if (kind === 'dashboard') {
        return 'Dashboard tanpa judul';
    }

    if (kind === 'mobile-app') {
        return 'Mobile app tanpa judul';
    }

    return 'Landing tanpa judul';
}

function cleanHtml(rawHtml: string): string {
    let cleaned = rawHtml.trim();

    if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```[a-zA-Z]*\s*/, '');
    }

    if (cleaned.endsWith('```')) {
        cleaned = cleaned.replace(/\s*```$/, '');
    }

    // Strip any leaked chain-of-thought the model may have emitted.
    cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '');

    // Hard-cut anything that still precedes the document so the canvas never
    // shows preamble text from a reasoning-style model.
    const doctypeIdx = cleaned.toLowerCase().indexOf('<!doctype');

    if (doctypeIdx > 0) {
        cleaned = cleaned.slice(doctypeIdx);
    } else {
        const htmlIdx = cleaned.toLowerCase().indexOf('<html');

        if (htmlIdx > 0) {
            cleaned = cleaned.slice(htmlIdx);
        }
    }

    return cleaned.trim();
}

/**
 * Remove the injected editor bridge from a document. Older saved designs can
 * already carry one (or several) copies; injecting another on top would stack
 * duplicate click handlers inside the preview.
 */
function stripEditBridge(rawHtml: string): string {
    return rawHtml.replace(
        /<script\b[^>]*data-design-edit-bridge[^>]*>[\s\S]*?<\/script>/gi,
        '',
    );
}

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
        let abortedByUser = false;

        try {
            await Promise.allSettled(
                targetKinds.map(async (k) => {
                    const canvas = canvases[k];
                    const activeHtml = canvas?.html ?? '';
                    let finalHtml = '';

                    try {
                        // Share one AbortController across all parallel canvas streams
                        // so a single "Stop" click cancels them all.
                        const controller =
                            streamAbortRef.current ?? new AbortController();
                        streamAbortRef.current = controller;

                        try {
                            await streamDesign(
                                {
                                    url: DesignStreamController.url(),
                                    csrfToken: csrfToken(),
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
                                    onDone: (fullHtml) => {
                                        finalHtml = cleanHtml(fullHtml);
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

    return (
        <>
            <Head title="Design Studio" />

            <div className="m3 bg-background text-foreground flex min-h-screen flex-col">
                <div className="flex flex-1">
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
                        onOpenChange={(open) =>
                            !open && setPendingDeleteId(null)
                        }
                    >
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Hapus Design?</DialogTitle>
                                <DialogDescription>
                                    Tindakan ini tidak bisa dibatalkan. Design
                                    beserta seluruh isinya akan dihapus
                                    permanen.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    onClick={() => setPendingDeleteId(null)}
                                >
                                    Batal
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={confirmDelete}
                                >
                                    Hapus
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <div className="flex min-w-0 flex-1 flex-col">
                        <header className="border-border/60 sticky top-0 z-20 flex h-16 shrink-0 items-center border-b bg-[var(--m3-surface-1)]">
                            <div className="flex w-full items-center justify-between gap-3 px-4 md:px-6">
                                <div className="flex items-center gap-2">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className={cn(
                                            'transition-all',
                                            historyOpen ? 'hidden' : 'flex',
                                        )}
                                        aria-label="Buka riwayat"
                                        onClick={() => setHistoryOpen(true)}
                                    >
                                        <PanelLeft className="size-4" />
                                    </Button>
                                    <div className="flex size-9 items-center justify-center rounded-full bg-[var(--m3-tertiary-container)] text-[var(--m3-on-tertiary-container)]">
                                        <Layout className="size-4" />
                                    </div>
                                    <div>
                                        <h1 className="text-sm font-medium tracking-tight">
                                            Design Studio
                                        </h1>
                                        <p className="text-xs text-[var(--m3-on-surface-var)]">
                                            Workspace {user.name}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    {isSaving ? (
                                        <span className="text-muted-foreground hidden items-center gap-1.5 text-xs sm:flex">
                                            <Loader2 className="size-3 animate-spin" />
                                            Menyimpan
                                        </span>
                                    ) : null}
                                    <UserMenu user={user} />
                                </div>
                            </div>
                        </header>

                        <div className="grid flex-1 grid-cols-1 lg:grid-cols-[380px_minmax(0,1fr)]">
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
                    </div>
                </div>

                {/* Global workspace action: create a fresh design. Generate stays
                    in the prompt panel because it depends on that local input. */}
                {hasDesign || currentId ? (
                    <button
                        type="button"
                        className="m3-fab"
                        onClick={startNew}
                        aria-label="Buat design baru"
                    >
                        <Plus className="size-5" />
                        <span className="hidden sm:inline">Design baru</span>
                    </button>
                ) : null}
            </div>
        </>
    );
}

function UserMenu({ user }: { user: User }) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 gap-2 px-1.5"
                    aria-label="Menu pengguna"
                >
                    <UserInfo user={user} />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                className="w-56 rounded-lg"
                align="end"
                sideOffset={8}
            >
                <UserMenuContent user={user} />
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function PromptPanel({
    selectedKinds,
    onToggleKind,
    model,
    models,
    areModelsLoading,
    modelError,
    prompt,
    initialPrompt,
    hasDesign,
    isGenerating,
    activeStep,
    error,
    editMode,
    selected,
    image,
    fromPrd,
    onModelChange,
    onPromptChange,
    onImageChange,
    onGenerate,
    onRefine,
    onStop,
    onUpdateSelected,
    onClearPrdContext,
    versions,
    currentVersionIndex,
    onSelectVersion,
}: {
    selectedKinds: DesignKind[];
    onToggleKind: (kind: DesignKind) => void;
    model: Model;
    models: AiModelOption[];
    areModelsLoading: boolean;
    modelError: string | null;
    prompt: string;
    initialPrompt: string;
    hasDesign: boolean;
    isGenerating: boolean;
    activeStep: number;
    error: string | null;
    editMode: boolean;
    selected: SelectedElement | null;
    image: string | null;
    fromPrd?: { id: string; title: string; content: string } | null;
    onModelChange: (model: Model) => void;
    onPromptChange: (prompt: string) => void;
    onImageChange: (image: string | null) => void;
    onGenerate: () => void;
    onRefine: () => void;
    onStop: () => void;
    onUpdateSelected: (patch: Partial<SelectedElement>) => void;
    onClearPrdContext: () => void;
    versions: {
        index: number;
        messageIndex: number;
        description: string;
        html: string;
    }[];
    currentVersionIndex: number | null;
    onSelectVersion: (index: number) => void;
}) {
    // When editing, the left panel becomes the property inspector.
    if (editMode && hasDesign && !isGenerating) {
        return (
            <aside className="border-border/60 flex flex-col gap-5 border-b bg-[var(--m3-surface-1)] p-4 md:p-6 lg:border-b-0 lg:border-r">
                <Inspector selected={selected} onUpdate={onUpdateSelected} />
            </aside>
        );
    }

    const handlePaste = (e: React.ClipboardEvent) => {
        const file = e.clipboardData?.files?.[0];

        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = () => {
                onImageChange(reader.result as string);
            };
            reader.readAsDataURL(file);
            toast.success('Screenshot berhasil ditempel!');
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];

        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                onImageChange(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <aside className="border-border/60 flex flex-col gap-5 border-b bg-[var(--m3-surface-1)] p-4 md:p-6 lg:border-b-0 lg:border-r">
            <div>
                <p className="mb-2 text-sm font-medium">Jenis halaman</p>
                <div className="grid grid-cols-2 gap-2">
                    {KINDS.map((item) => {
                        const isActive = selectedKinds.includes(item.value);

                        return (
                            <button
                                key={item.value}
                                type="button"
                                onClick={() => onToggleKind(item.value)}
                                aria-pressed={isActive}
                                disabled={isGenerating}
                                className={cn(
                                    'flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition disabled:opacity-50',
                                    isActive
                                        ? 'border-transparent bg-[var(--m3-secondary-container)] text-[var(--m3-on-secondary-container)]'
                                        : 'border-[var(--m3-outline-var)] text-[var(--m3-on-surface-var)] hover:bg-[var(--m3-secondary-container)]',
                                )}
                            >
                                <item.icon className="size-4" />
                                {item.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {hasDesign && initialPrompt ? (
                <div className="border-border bg-muted/40 rounded-lg border p-3 text-xs">
                    <p className="text-muted-foreground font-semibold">
                        Prompt awal:
                    </p>
                    <p
                        className="text-foreground mt-1 line-clamp-3"
                        title={initialPrompt}
                    >
                        {initialPrompt}
                    </p>
                </div>
            ) : null}

            {fromPrd && !hasDesign ? (
                <div className="border-primary/20 bg-primary/5 flex items-center justify-between gap-3 rounded-lg border p-3 text-xs">
                    <div className="flex min-w-0 items-center gap-2">
                        <FileText className="text-primary size-4 shrink-0" />
                        <div className="min-w-0">
                            <p className="text-primary font-semibold">
                                Konteks PRD terhubung:
                            </p>
                            <p
                                className="text-muted-foreground mt-0.5 truncate"
                                title={fromPrd.title}
                            >
                                {fromPrd.title}
                            </p>
                        </div>
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-foreground h-6 w-6 shrink-0"
                        onClick={onClearPrdContext}
                    >
                        <X className="size-3.5" />
                    </Button>
                </div>
            ) : null}

            <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                    <Sparkles className="text-primary size-4" />
                    {hasDesign
                        ? 'Minta revisi atau tambahan fitur'
                        : 'Deskripsi design'}
                </div>
                <textarea
                    value={prompt}
                    onChange={(event) => onPromptChange(event.target.value)}
                    onPaste={handlePaste}
                    placeholder={
                        hasDesign
                            ? 'Contoh: ganti warna utama jadi biru, tambah bagian harga, atau buat header lebih modern...'
                            : EXAMPLE_PROMPTS[selectedKinds[0]]
                    }
                    disabled={isGenerating}
                    className="border-input bg-background focus:border-ring focus:ring-ring/30 min-h-40 w-full resize-none rounded-lg border p-3 text-sm leading-6 outline-none transition focus:ring-2 disabled:opacity-60"
                />

                {image ? (
                    <div className="border-border bg-background relative mt-2 flex items-center justify-between rounded-lg border p-2 pr-10">
                        <div className="flex min-w-0 items-center gap-2">
                            <img
                                src={image}
                                alt="Screenshot preview"
                                className="border-border size-12 shrink-0 rounded border object-cover"
                            />
                            <div className="min-w-0">
                                <p className="text-foreground truncate text-xs font-medium">
                                    Screenshot terlampir
                                </p>
                                <p className="text-muted-foreground text-[10px]">
                                    Siap dikirim ke AI
                                </p>
                            </div>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="hover:bg-destructive/10 hover:text-destructive absolute right-2 top-1/2 size-7 -translate-y-1/2 rounded-md"
                            onClick={() => onImageChange(null)}
                            aria-label="Hapus gambar"
                        >
                            <X className="size-3.5" />
                        </Button>
                    </div>
                ) : (
                    <div className="mt-2">
                        <label className="border-border text-muted-foreground hover:border-primary/50 hover:bg-accent flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed py-2.5 text-xs transition">
                            <Upload className="size-3.5" />
                            <span>
                                Unggah screenshot (opsional) / Tempel gambar
                            </span>
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={isGenerating}
                                onChange={handleImageUpload}
                            />
                        </label>
                    </div>
                )}

                {!hasDesign && (
                    <button
                        type="button"
                        onClick={() =>
                            onPromptChange(EXAMPLE_PROMPTS[selectedKinds[0]])
                        }
                        disabled={isGenerating}
                        className="text-muted-foreground hover:text-foreground mt-2 text-xs underline-offset-2 hover:underline disabled:opacity-50"
                    >
                        Gunakan contoh prompt
                    </button>
                )}
            </div>

            <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground text-xs">Model</span>
                <Select
                    value={model}
                    onValueChange={(value) => onModelChange(value as Model)}
                    disabled={isGenerating || models.length === 0}
                >
                    <SelectTrigger
                        className="h-9 w-[180px] text-xs"
                        aria-label="Pilih model AI"
                    >
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {models.map((option) => (
                            <SelectItem key={option.id} value={option.id}>
                                {modelLabel(option.id)} · {option.provider_name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {areModelsLoading ? (
                <p className="text-muted-foreground text-xs">
                    Memuat model dari Base URL provider...
                </p>
            ) : modelError ? (
                <div className="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-xs">
                    {modelError}
                </div>
            ) : null}

            {image &&
            (model.startsWith('deepseek') || model === 'MiniMax-M3') ? (
                <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400">
                    <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-500" />
                    <span>
                        Model DeepSeek tidak mendukung input gambar. Silakan
                        ganti ke model Gemini (misal:{' '}
                        <strong>gemini-3.5-flash</strong>) agar AI dapat melihat
                        screenshot Anda.
                    </span>
                </div>
            ) : null}

            <div className="flex flex-col gap-2">
                {hasDesign ? (
                    <>
                        <Button
                            type="button"
                            size="lg"
                            disabled={!prompt.trim() || isGenerating}
                            onClick={onRefine}
                            className="w-full"
                        >
                            {isGenerating ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : (
                                <Pencil className="size-4" />
                            )}
                            Terapkan revisi
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="lg"
                            disabled={!prompt.trim() || isGenerating}
                            onClick={onGenerate}
                            className="w-full"
                        >
                            <Wand2 className="size-4" />
                            Buat ulang dari awal
                        </Button>
                        {isGenerating ? (
                            <Button
                                type="button"
                                variant="destructive"
                                size="lg"
                                onClick={onStop}
                                className="w-full"
                            >
                                <Square className="size-4 fill-current" />
                                Berhenti
                            </Button>
                        ) : null}
                    </>
                ) : (
                    <>
                        <Button
                            type="button"
                            size="lg"
                            disabled={!prompt.trim() || isGenerating}
                            onClick={onGenerate}
                            className="w-full"
                        >
                            {isGenerating ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : (
                                <Wand2 className="size-4" />
                            )}
                            Generate design
                        </Button>
                        {isGenerating ? (
                            <Button
                                type="button"
                                variant="destructive"
                                size="lg"
                                onClick={onStop}
                                className="w-full"
                            >
                                <Square className="size-4 fill-current" />
                                Berhenti
                            </Button>
                        ) : null}
                    </>
                )}
            </div>

            {hasDesign && versions.length > 0 && (
                <div className="border-border bg-card/60 space-y-3 rounded-xl border p-4 shadow-sm backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                        <div className="text-muted-foreground flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
                            <History className="text-primary size-3.5" />
                            Riwayat Revisi ({versions.length})
                        </div>
                        <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px] font-medium">
                            v
                            {currentVersionIndex !== null
                                ? currentVersionIndex + 1
                                : 1}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="animate-in fade-in h-9 w-9 shrink-0 duration-200"
                            disabled={
                                currentVersionIndex === null ||
                                currentVersionIndex === 0 ||
                                isGenerating
                            }
                            onClick={() =>
                                onSelectVersion(currentVersionIndex! - 1)
                            }
                            aria-label="Versi sebelumnya"
                        >
                            <ChevronLeft className="size-4" />
                        </Button>

                        <div className="min-w-0 flex-1">
                            <Select
                                value={
                                    currentVersionIndex !== null
                                        ? String(currentVersionIndex)
                                        : undefined
                                }
                                onValueChange={(val) =>
                                    onSelectVersion(Number(val))
                                }
                                disabled={isGenerating || versions.length <= 1}
                            >
                                <SelectTrigger className="h-9 w-full text-xs">
                                    <SelectValue placeholder="Pilih Versi" />
                                </SelectTrigger>
                                <SelectContent className="max-h-60">
                                    {versions.map((v) => (
                                        <SelectItem
                                            key={v.index}
                                            value={String(v.index)}
                                        >
                                            <span className="mr-1 font-semibold">
                                                v{v.index + 1}:
                                            </span>
                                            <span className="inline-block max-w-[200px] truncate align-bottom">
                                                {v.description}
                                            </span>
                                            {v.index ===
                                                versions.length - 1 && (
                                                <span className="text-muted-foreground ml-1 text-[10px] font-normal">
                                                    (Terbaru)
                                                </span>
                                            )}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="animate-in fade-in h-9 w-9 shrink-0 duration-200"
                            disabled={
                                currentVersionIndex === null ||
                                currentVersionIndex === versions.length - 1 ||
                                isGenerating
                            }
                            onClick={() =>
                                onSelectVersion(currentVersionIndex! + 1)
                            }
                            aria-label="Versi berikutnya"
                        >
                            <ChevronRight className="size-4" />
                        </Button>
                    </div>

                    {currentVersionIndex !== null &&
                        currentVersionIndex < versions.length - 1 && (
                            <div className="animate-in fade-in slide-in-from-top-1 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-600 duration-200 dark:text-amber-400">
                                <div className="flex gap-2">
                                    <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-500" />
                                    <div className="space-y-1">
                                        <p className="font-semibold text-amber-700 dark:text-amber-300">
                                            Melihat Versi Lama
                                        </p>
                                        <p className="text-muted-foreground text-[11px] leading-relaxed">
                                            Membuat revisi atau menyimpan visual
                                            dari sini akan memulai cabang baru.
                                            Versi setelah ini akan dihapus.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                </div>
            )}

            {isGenerating ? <BuildSteps activeStep={activeStep} /> : null}

            {error ? (
                <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border px-4 py-3 text-sm">
                    {error}
                </div>
            ) : null}
        </aside>
    );
}

function BuildSteps({ activeStep }: { activeStep: number }) {
    return (
        <div className="border-border bg-background rounded-xl border p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
                <Loader2 className="text-primary size-4 animate-spin" />
                AI sedang membangun design
            </div>
            <ol className="mt-4 space-y-2.5">
                {GENERATE_STEPS.map((step, index) => {
                    const isDone = index < activeStep;
                    const isActive = index === activeStep;

                    return (
                        <li
                            key={step}
                            className="flex items-center gap-3 text-sm"
                        >
                            <span
                                className={cn(
                                    'flex size-6 shrink-0 items-center justify-center rounded-full border text-xs transition',
                                    isDone &&
                                        'border-primary bg-primary text-primary-foreground',
                                    isActive &&
                                        'border-primary bg-primary/10 text-primary',
                                    !isDone &&
                                        !isActive &&
                                        'border-border text-muted-foreground',
                                )}
                            >
                                {isDone ? (
                                    <Check className="size-3" />
                                ) : isActive ? (
                                    <Loader2 className="size-3 animate-spin" />
                                ) : (
                                    index + 1
                                )}
                            </span>
                            <span
                                className={cn(
                                    isDone || isActive
                                        ? 'text-foreground'
                                        : 'text-muted-foreground',
                                )}
                            >
                                {step}
                            </span>
                        </li>
                    );
                })}
            </ol>
        </div>
    );
}

function Inspector({
    selected,
    onUpdate,
}: {
    selected: SelectedElement | null;
    onUpdate: (patch: Partial<SelectedElement>) => void;
}) {
    return (
        <div>
            <div className="flex items-center gap-2 text-sm font-medium">
                <MousePointerClick className="text-primary size-4" />
                Editor komponen
            </div>

            {!selected ? (
                <p className="border-border bg-background text-muted-foreground mt-4 rounded-lg border border-dashed p-4 text-sm">
                    Klik elemen apa pun di preview untuk mengeditnya. Teks,
                    warna, dan font bisa diubah di sini.
                </p>
            ) : (
                <div className="mt-4 space-y-5">
                    <div className="border-border bg-background text-muted-foreground rounded-lg border px-3 py-2 text-xs">
                        Elemen terpilih:{' '}
                        <span className="text-foreground font-medium">
                            {selected.tag}
                        </span>
                    </div>

                    {selected.text !== null ? (
                        <Field label="Teks" icon={Type}>
                            <textarea
                                value={selected.text}
                                onChange={(event) =>
                                    onUpdate({ text: event.target.value })
                                }
                                className="border-input bg-background focus:border-ring focus:ring-ring/30 min-h-20 w-full resize-none rounded-lg border p-2.5 text-sm leading-6 outline-none focus:ring-2"
                            />
                        </Field>
                    ) : null}

                    <ColorField
                        label="Warna teks"
                        value={selected.color}
                        onChange={(value) => onUpdate({ color: value })}
                    />

                    <ColorField
                        label="Warna latar"
                        value={selected.backgroundColor}
                        onChange={(value) =>
                            onUpdate({ backgroundColor: value })
                        }
                    />

                    <Field label={`Ukuran font · ${selected.fontSize}px`}>
                        <input
                            type="range"
                            min={10}
                            max={80}
                            value={selected.fontSize}
                            onChange={(event) =>
                                onUpdate({
                                    fontSize: Number(event.target.value),
                                })
                            }
                            className="accent-primary w-full"
                        />
                    </Field>

                    <Field label="Ketebalan font">
                        <Select
                            value={String(selected.fontWeight)}
                            onValueChange={(value) =>
                                onUpdate({ fontWeight: Number(value) })
                            }
                        >
                            <SelectTrigger className="h-9 w-full text-sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="400">Normal</SelectItem>
                                <SelectItem value="500">Medium</SelectItem>
                                <SelectItem value="600">Semibold</SelectItem>
                                <SelectItem value="700">Bold</SelectItem>
                                <SelectItem value="800">Extra bold</SelectItem>
                            </SelectContent>
                        </Select>
                    </Field>

                    <Field label="Rata teks">
                        <div className="grid grid-cols-3 gap-2">
                            {(['left', 'center', 'right'] as const).map(
                                (align) => (
                                    <button
                                        key={align}
                                        type="button"
                                        onClick={() =>
                                            onUpdate({ textAlign: align })
                                        }
                                        aria-pressed={
                                            selected.textAlign === align
                                        }
                                        className={cn(
                                            'rounded-lg border px-2 py-1.5 text-xs capitalize transition',
                                            selected.textAlign === align
                                                ? 'border-primary bg-primary/10 text-foreground'
                                                : 'border-border text-muted-foreground hover:bg-accent',
                                        )}
                                    >
                                        {align}
                                    </button>
                                ),
                            )}
                        </div>
                    </Field>
                </div>
            )}
        </div>
    );
}

function Field({
    label,
    icon: Icon,
    children,
}: {
    label: string;
    icon?: typeof Type;
    children: React.ReactNode;
}) {
    return (
        <div>
            <label className="text-muted-foreground mb-1.5 flex items-center gap-1.5 text-xs font-medium">
                {Icon ? <Icon className="size-3.5" /> : null}
                {label}
            </label>
            {children}
        </div>
    );
}

function ColorField({
    label,
    value,
    onChange,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <Field label={label}>
            <div className="flex items-center gap-2">
                <input
                    type="color"
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    className="border-input bg-background size-9 shrink-0 cursor-pointer rounded-md border"
                    aria-label={label}
                />
                <input
                    type="text"
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    className="border-input bg-background focus:border-ring focus:ring-ring/30 h-9 w-full rounded-lg border px-2.5 text-sm outline-none focus:ring-2"
                />
            </div>
        </Field>
    );
}

type DesignPreviewHandle = {
    requestHtml: (callback: (html: string) => void) => void;
    updateSelected: (patch: Partial<SelectedElement>) => void;
};

const PreviewPanel = (() => {
    const Component = ({
        html,
        streamingHtml,
        selectedKinds,
        activeKind,
        onTabChange,
        streaming,
        hasDesign,
        isGenerating,
        activeMode,
        editMode,
        designId,
        viewMode,
        copied,
        onViewModeChange,
        onToggleEdit,
        onDownloadHtml,
        onSelect,
        onSave,
        onCopyCode,
        onStop,
        ref,
    }: {
        html: string;
        streamingHtml: string;
        selectedKinds: DesignKind[];
        activeKind: DesignKind;
        onTabChange: (kind: DesignKind) => void;
        streaming: Partial<Record<DesignKind, string>>;
        hasDesign: boolean;
        isGenerating: boolean;
        activeMode: 'generate' | 'refine';
        editMode: boolean;
        designId: string | null;
        viewMode: 'preview' | 'code';
        copied: boolean;
        onViewModeChange: (mode: 'preview' | 'code') => void;
        onToggleEdit: () => void;
        onDownloadHtml: () => void;
        onSelect: (selected: SelectedElement | null) => void;
        onSave: () => void;
        onCopyCode: () => void;
        onStop: () => void;
        ref: React.Ref<DesignPreviewHandle>;
    }) => {
        const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>(
            'desktop',
        );

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

        return (
            <section className="flex min-h-[60vh] flex-col bg-[var(--m3-surface-2)]">
                {selectedKinds.length > 1 ? (
                    <div className="border-border flex shrink-0 items-center gap-1 border-b px-2 py-1.5">
                        {selectedKinds.map((k) => {
                            const labels: Record<DesignKind, string> = {
                                'landing-page': 'Landing',
                                dashboard: 'Dashboard',
                                'mobile-app': 'Mobile',
                            };
                            const isStreaming =
                                typeof streaming[k] === 'string';

                            return (
                                <button
                                    key={k}
                                    type="button"
                                    onClick={() => onTabChange(k)}
                                    aria-pressed={k === activeKind}
                                    className={cn(
                                        'flex min-h-10 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition',
                                        k === activeKind
                                            ? 'bg-[var(--m3-secondary-container)] text-[var(--m3-on-secondary-container)]'
                                            : 'text-[var(--m3-on-surface-var)] hover:bg-[var(--m3-surface-3)]',
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
                <div className="border-border bg-background/60 flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 md:px-5">
                    <div className="flex items-center gap-2 text-sm font-medium">
                        {isGenerating ? (
                            <div className="flex items-center gap-3">
                                <span className="flex items-center gap-2">
                                    <span className="relative flex size-2">
                                        <span className="bg-primary/60 absolute inline-flex size-full animate-ping rounded-full" />
                                        <span className="bg-primary relative inline-flex size-2 rounded-full" />
                                    </span>
                                    AI sedang mendesain langsung
                                </span>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={onStop}
                                    className="h-7 gap-1.5 px-2.5 text-xs"
                                >
                                    <Square className="size-3 fill-current" />
                                    Berhenti
                                </Button>
                            </div>
                        ) : hasDesign ? (
                            <div className="border-border bg-muted/50 flex items-center gap-1 rounded-lg border p-0.5">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className={cn(
                                        'h-7 gap-1.5 rounded-md px-3 text-xs',
                                        viewMode === 'preview'
                                            ? 'bg-background text-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground',
                                    )}
                                    onClick={() => onViewModeChange('preview')}
                                    aria-label="Tampilkan pratinjau"
                                >
                                    <Eye className="size-3.5" />
                                    Preview
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className={cn(
                                        'h-7 gap-1.5 rounded-md px-3 text-xs',
                                        viewMode === 'code'
                                            ? 'bg-background text-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground',
                                    )}
                                    onClick={() => onViewModeChange('code')}
                                    aria-label="Tampilkan kode HTML"
                                >
                                    <Code2 className="size-3.5" />
                                    Code
                                </Button>
                            </div>
                        ) : (
                            <>
                                <Eye className="text-primary size-4" />
                                Live preview
                            </>
                        )}
                    </div>

                    {hasDesign && viewMode === 'preview' && (
                        <div className="border-border bg-muted/50 flex items-center gap-1 rounded-lg border p-0.5">
                            {[
                                {
                                    id: 'desktop',
                                    label: 'Desktop',
                                    icon: Monitor,
                                },
                                { id: 'tablet', label: 'Tablet', icon: Tablet },
                                {
                                    id: 'mobile',
                                    label: 'Mobile',
                                    icon: Smartphone,
                                },
                            ].map((d) => {
                                const Icon = d.icon;
                                const isActive = device === d.id;

                                return (
                                    <Button
                                        key={d.id}
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className={cn(
                                            'h-7 w-7 rounded-md p-0',
                                            isActive
                                                ? 'bg-background text-foreground shadow-sm'
                                                : 'text-muted-foreground hover:text-foreground hover:bg-transparent',
                                        )}
                                        onClick={() => setDevice(d.id as any)}
                                        aria-label={d.label}
                                    >
                                        <Icon className="size-4" />
                                    </Button>
                                );
                            })}
                        </div>
                    )}

                    {hasDesign && !isGenerating ? (
                        <div className="flex flex-wrap items-center gap-2">
                            {viewMode === 'preview' ? (
                                <>
                                    <Button
                                        type="button"
                                        variant={
                                            editMode ? 'default' : 'outline'
                                        }
                                        size="sm"
                                        onClick={onToggleEdit}
                                    >
                                        <Pencil className="size-4" />
                                        {editMode
                                            ? 'Selesai edit'
                                            : 'Edit visual'}
                                    </Button>
                                    {editMode && (
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={onSave}
                                        >
                                            <Check className="size-4" />
                                            Simpan
                                        </Button>
                                    )}
                                </>
                            ) : (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={onCopyCode}
                                    className="gap-1.5"
                                >
                                    {copied ? (
                                        <>
                                            <Check className="size-3.5 text-green-500" />
                                            Tersalin
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="size-3.5" />
                                            Salin Kode
                                        </>
                                    )}
                                </Button>
                            )}
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={onDownloadHtml}
                            >
                                <Download className="size-4" />
                                HTML
                            </Button>
                            {designId && viewMode === 'preview' && (
                                <Button type="button" size="sm" asChild>
                                    <a href={`/designs/${designId}/export`}>
                                        <FileArchive className="size-4" />
                                        ZIP
                                    </a>
                                </Button>
                            )}
                        </div>
                    ) : null}
                </div>

                {editMode && hasDesign && !isGenerating ? (
                    <div className="border-primary/20 bg-primary/10 text-foreground flex items-center gap-2 border-b px-4 py-2 text-xs md:px-5">
                        <Code2 className="text-primary size-3.5" />
                        Klik elemen di preview, lalu ubah lewat panel kiri.
                        Tekan Simpan saat selesai.
                    </div>
                ) : null}

                <div
                    className="relative flex flex-1 items-center justify-center overflow-auto bg-neutral-50 p-6 text-neutral-200 dark:bg-neutral-900/10 dark:text-neutral-800"
                    style={{
                        backgroundImage:
                            'radial-gradient(circle, currentColor 1.5px, transparent 1.5px)',
                        backgroundSize: '24px 24px',
                    }}
                >
                    {viewMode === 'code' ? (
                        <div className="border-border size-full max-w-6xl select-text overflow-auto rounded-xl border bg-neutral-950 p-6 font-mono text-xs leading-5 text-neutral-200 shadow-2xl">
                            <pre className="selection:bg-primary selection:text-primary-foreground whitespace-pre-wrap break-all">
                                <code
                                    dangerouslySetInnerHTML={{
                                        __html: highlightHtml(html),
                                    }}
                                />
                            </pre>
                        </div>
                    ) : (
                        <div
                            className={cn(
                                'relative transition-all duration-300 ease-in-out',
                                device === 'desktop' &&
                                    'h-full w-full max-w-full',
                                device === 'tablet' &&
                                    'h-[900px] max-h-full w-[768px] overflow-hidden rounded-[28px] border-[12px] border-neutral-950 bg-white shadow-2xl dark:border-neutral-800',
                                device === 'mobile' &&
                                    'h-[680px] max-h-full w-[375px] overflow-hidden rounded-[28px] border-[12px] border-neutral-950 bg-white shadow-2xl dark:border-neutral-800',
                                !hasDesign &&
                                    'h-full w-full border-0 bg-transparent shadow-none',
                            )}
                        >
                            {/* Mobile/Tablet Speaker and Camera Mockup */}
                            {hasDesign && device !== 'desktop' && (
                                <div className="absolute left-1/2 top-1.5 z-10 flex h-4 w-20 -translate-x-1/2 items-center justify-center gap-1.5 rounded-full border border-neutral-900/50 bg-neutral-950 dark:bg-neutral-800">
                                    <div className="h-1 w-8 rounded-full bg-neutral-800" />
                                    <div className="h-1.5 w-1.5 rounded-full border border-neutral-800 bg-neutral-900" />
                                </div>
                            )}

                            <div
                                className={cn(
                                    'relative h-full w-full',
                                    hasDesign &&
                                        device !== 'desktop' &&
                                        'overflow-hidden rounded-[16px]',
                                )}
                            >
                                {isGenerating && activeMode === 'generate' ? (
                                    <LivePreviewFrame
                                        streamingHtml={streamingHtml}
                                        device={device}
                                    />
                                ) : hasDesign ? (
                                    <>
                                        <PreviewFrame
                                            ref={ref}
                                            html={html}
                                            editMode={editMode}
                                            onSelect={onSelect}
                                            device={device}
                                        />
                                        {isGenerating &&
                                        activeMode === 'refine' ? (
                                            <div className="bg-background/60 absolute inset-0 z-30 flex flex-col items-center justify-center backdrop-blur-sm transition-all duration-300">
                                                <div className="border-border bg-background/90 flex max-w-sm flex-col items-center gap-3 rounded-2xl border p-6 text-center shadow-xl">
                                                    <Loader2 className="text-primary size-8 animate-spin" />
                                                    <div>
                                                        <p className="text-sm font-semibold">
                                                            Memperbarui
                                                            desain...
                                                        </p>
                                                        <p className="text-muted-foreground mt-1 text-xs">
                                                            AI sedang menerapkan
                                                            revisi Anda secara
                                                            presisi. Mohon
                                                            tunggu sebentar.
                                                        </p>
                                                    </div>
                                                    <div className="bg-muted mt-2 h-1 w-full overflow-hidden rounded-full">
                                                        <div
                                                            className="bg-primary h-full transition-all duration-500"
                                                            style={{
                                                                width: `${(activeStep + 1) * 20}%`,
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ) : null}
                                    </>
                                ) : (
                                    <EmptyPreview isGenerating={isGenerating} />
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </section>
        );
    };

    Component.displayName = 'PreviewPanel';

    return Component;
})();

function LivePreviewFrame({
    streamingHtml,
    device,
}: {
    streamingHtml: string;
    device: 'desktop' | 'tablet' | 'mobile';
}) {
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Render the partial HTML as it streams. Browsers render malformed/partial
    // markup fine, so the page visibly builds top-to-bottom.
    useEffect(() => {
        const doc = iframeRef.current?.contentDocument;

        if (!doc) {
            return;
        }

        doc.open();
        doc.write(
            streamingHtml ||
                '<!doctype html><html><body style="margin:0"></body></html>',
        );
        doc.close();

        // Keep the newest content in view as the page grows.
        const win = iframeRef.current?.contentWindow;
        win?.scrollTo({ top: doc.body?.scrollHeight ?? 0, behavior: 'smooth' });
    }, [streamingHtml]);

    return (
        <div
            className={cn(
                'relative h-full overflow-hidden bg-white transition-all duration-300 dark:bg-neutral-950',
                device === 'desktop'
                    ? 'border-primary/30 ring-primary/20 rounded-xl border shadow-sm ring-2'
                    : '',
            )}
        >
            <iframe
                ref={iframeRef}
                title="Live building preview"
                sandbox="allow-same-origin"
                className="size-full"
            />
            {!streamingHtml ? (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80">
                    <div className="text-muted-foreground flex items-center gap-2 text-sm">
                        <Loader2 className="text-primary size-4 animate-spin" />
                        Menyiapkan kanvas...
                    </div>
                </div>
            ) : null}
        </div>
    );
}

function EmptyPreview({ isGenerating }: { isGenerating: boolean }) {
    return (
        <div className="flex h-full items-center justify-center">
            <div className="max-w-sm text-center">
                <div className="bg-primary/10 text-primary mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl">
                    {isGenerating ? (
                        <Loader2 className="size-6 animate-spin" />
                    ) : (
                        <Layout className="size-6" />
                    )}
                </div>
                <h2 className="text-lg font-semibold">
                    {isGenerating
                        ? 'AI sedang membangun design...'
                        : 'Preview muncul di sini'}
                </h2>
                <p className="text-muted-foreground mt-2 text-sm">
                    {isGenerating
                        ? 'Ikuti langkahnya di panel kiri. Sebentar lagi selesai.'
                        : 'Tulis deskripsi design di panel kiri, lalu klik Generate. Hasilnya tampil langsung di sini.'}
                </p>
            </div>
        </div>
    );
}

const EDIT_BRIDGE = `<script data-design-edit-bridge>(function(){
  var editable = false;
  var selectedEl = null;

  function clearOutline(el){ if(el){ el.style.removeProperty('outline'); el.style.removeProperty('outline-offset'); } }

  function setEditable(on){
    editable = on;
    if(!on){
      clearOutline(selectedEl);
      selectedEl = null;
    }
    document.body.style.cursor = on ? 'default' : '';
  }

  function describe(el){
    var cs = getComputedStyle(el);
    var hasText = el.children.length === 0 && el.textContent.trim().length > 0;
    return {
      tag: el.tagName.toLowerCase(),
      text: hasText ? el.textContent : null,
      color: rgbToHex(cs.color),
      backgroundColor: rgbToHex(cs.backgroundColor),
      fontSize: Math.round(parseFloat(cs.fontSize)) || 16,
      fontWeight: parseInt(cs.fontWeight, 10) || 400,
      textAlign: ['left','center','right'].indexOf(cs.textAlign) >= 0 ? cs.textAlign : 'left'
    };
  }

  function rgbToHex(rgb){
    var m = rgb && rgb.match(/\\d+/g);
    if(!m || m.length < 3) return '#000000';
    return '#' + m.slice(0,3).map(function(n){
      var h = parseInt(n,10).toString(16);
      return h.length === 1 ? '0'+h : h;
    }).join('');
  }

  document.addEventListener('click', function(e){
    if(!editable) {
      var link = e.target.closest('a');
      if(link){
        var href = link.getAttribute('href') || '';
        var isAnchor = href.indexOf('#') === 0;

        if (isAnchor) {
          if (href === '#' || href === '#/') {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } else {
            try {
              var targetEl = document.querySelector(href);
              if (targetEl) {
                e.preventDefault();
                targetEl.scrollIntoView({ behavior: 'smooth' });
              } else {
                e.preventDefault();
                var text = link.textContent.trim() || link.innerText.trim() || 'Tautan';
                parent.postMessage({ type: 'link-clicked', href: href, text: text }, '*');
              }
            } catch(err) {
              e.preventDefault();
              var text = link.textContent.trim() || link.innerText.trim() || 'Tautan';
              parent.postMessage({ type: 'link-clicked', href: href, text: text }, '*');
            }
          }
        } else {
          e.preventDefault();
          e.stopPropagation();
          var text = link.textContent.trim() || link.innerText.trim() || 'Tautan';
          parent.postMessage({ type: 'link-clicked', href: href, text: text }, '*');
        }
      }
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    var el = e.target;
    if(!el || el === document.body || el === document.documentElement) return;
    clearOutline(selectedEl);
    selectedEl = el;
    el.style.setProperty('outline', '2px solid rgba(99,102,241,0.9)');
    el.style.setProperty('outline-offset', '1px');
    parent.postMessage({ type: 'element-selected', payload: describe(el) }, '*');
  }, true);

  document.addEventListener('submit', function(e){
    e.preventDefault();
    parent.postMessage({ type: 'form-submitted' }, '*');
  }, true);

  window.addEventListener('message', function(e){
    if(!e.data || typeof e.data !== 'object') return;
    var t = e.data.type;
    if(t === 'set-edit'){ setEditable(!!e.data.value); }
    else if(t === 'set-theme'){
      var isDark = e.data.value === 'dark' || e.data.value === true;
      document.documentElement.classList.toggle('dark', isDark);
      document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
    }
    else if(t === 'update-selected' && selectedEl){
      var p = e.data.payload || {};
      if(p.text !== undefined && p.text !== null) selectedEl.textContent = p.text;
      if(p.color !== undefined) selectedEl.style.color = p.color;
      if(p.backgroundColor !== undefined) selectedEl.style.backgroundColor = p.backgroundColor;
      if(p.fontSize !== undefined) selectedEl.style.fontSize = p.fontSize + 'px';
      if(p.fontWeight !== undefined) selectedEl.style.fontWeight = p.fontWeight;
      if(p.textAlign !== undefined) selectedEl.style.textAlign = p.textAlign;
    }
    else if(t === 'request-html'){
      var wasEditable = editable;
      clearOutline(selectedEl);
      var sel = selectedEl;
      // Never hand the injected editor script back to the parent: saved/exported
      // documents must stay free of it, otherwise it accumulates on every save
      // and blocks links/forms when the exported file is opened raw.
      var clone = document.documentElement.cloneNode(true);
      var bridgeScripts = clone.querySelectorAll('script[data-design-edit-bridge]');
      for(var i = 0; i < bridgeScripts.length; i++){ bridgeScripts[i].parentNode.removeChild(bridgeScripts[i]); }
      var doc = '<!doctype html>\\n' + clone.outerHTML;
      parent.postMessage({ type: 'html-result', html: doc }, '*');
      if(wasEditable && sel){
        sel.style.setProperty('outline', '2px solid rgba(99,102,241,0.9)');
        sel.style.setProperty('outline-offset', '1px');
      }
    }
  });

  parent.postMessage({ type: 'iframe-ready' }, '*');
})();</script>`;

const PreviewFrame = (() => {
    const Component = ({
        html,
        editMode,
        onSelect,
        device,
        ref,
    }: {
        html: string;
        editMode: boolean;
        onSelect: (selected: SelectedElement | null) => void;
        device: 'desktop' | 'tablet' | 'mobile';
        ref: React.Ref<DesignPreviewHandle>;
    }) => {
        const iframeRef = useRef<HTMLIFrameElement>(null);
        const htmlCallbackRef = useRef<((html: string) => void) | null>(null);
        // Mirrors the editMode prop for the message listener, which must not
        // re-register on every toggle just to see the current value.
        const editModeRef = useRef(editMode);

        useEffect(() => {
            editModeRef.current = editMode;
        }, [editMode]);

        const srcDoc = useMemo(() => {
            // Never stack a second bridge on top of one already baked into a
            // saved document — always start from a clean copy.
            const base = stripEditBridge(html);
            const bodyEndIndex = base.toLowerCase().lastIndexOf('</body>');

            if (bodyEndIndex !== -1) {
                return (
                    base.substring(0, bodyEndIndex) +
                    EDIT_BRIDGE +
                    base.substring(bodyEndIndex)
                );
            }

            return base + EDIT_BRIDGE;
        }, [html]);

        useImperativeHandle(ref, () => ({
            requestHtml: (callback) => {
                htmlCallbackRef.current = callback;
                iframeRef.current?.contentWindow?.postMessage(
                    { type: 'request-html' },
                    '*',
                );
            },
            updateSelected: (patch) => {
                iframeRef.current?.contentWindow?.postMessage(
                    { type: 'update-selected', payload: patch },
                    '*',
                );
            },
        }));

        useEffect(() => {
            const handler = (event: MessageEvent) => {
                // Only trust messages from this specific preview iframe —
                // any other window/tab embedding the page must not be able to
                // inject designs, selections, or saved HTML.
                if (event.source !== iframeRef.current?.contentWindow) {
                    return;
                }

                const data = event.data as {
                    type?: string;
                    html?: string;
                    payload?: SelectedElement;
                    text?: string;
                    href?: string;
                };

                if (
                    data?.type === 'html-result' &&
                    typeof data.html === 'string'
                ) {
                    htmlCallbackRef.current?.(data.html);
                    htmlCallbackRef.current = null;
                }

                if (data?.type === 'element-selected' && data.payload) {
                    onSelect(data.payload);
                }

                if (data?.type === 'iframe-ready') {
                    const isDark =
                        document.documentElement.classList.contains('dark');
                    iframeRef.current?.contentWindow?.postMessage(
                        { type: 'set-theme', value: isDark ? 'dark' : 'light' },
                        '*',
                    );

                    // The iframe was just (re)built: any set-edit sent while it
                    // was loading was dropped. Re-sync the current mode so
                    // visual editing keeps working after saves/version switches.
                    iframeRef.current?.contentWindow?.postMessage(
                        { type: 'set-edit', value: editModeRef.current },
                        '*',
                    );
                }

                if (data?.type === 'link-clicked') {
                    const isAnchor = data.href?.indexOf('#') === 0;

                    if (isAnchor && data.href !== '#' && data.href !== '#/') {
                        toast.info(
                            `Bagian "${data.href}" tidak ditemukan pada pratinjau ini.`,
                        );
                    } else {
                        toast.info(
                            `Halaman "${data.text || 'Menu'}" (${data.href || '#'}) belum dibuat (Simulasi).`,
                        );
                    }
                }

                if (data?.type === 'form-submitted') {
                    toast.info('Pengiriman formulir hanya simulasi pratinjau.');
                }
            };

            window.addEventListener('message', handler);

            return () => window.removeEventListener('message', handler);
        }, [onSelect]);

        useEffect(() => {
            iframeRef.current?.contentWindow?.postMessage(
                { type: 'set-edit', value: editMode },
                '*',
            );
        }, [editMode, srcDoc]);

        useEffect(() => {
            const syncTheme = () => {
                const isDark =
                    document.documentElement.classList.contains('dark');
                iframeRef.current?.contentWindow?.postMessage(
                    { type: 'set-theme', value: isDark ? 'dark' : 'light' },
                    '*',
                );
            };

            const observer = new MutationObserver(syncTheme);
            observer.observe(document.documentElement, {
                attributes: true,
                attributeFilter: ['class'],
            });

            // Initial sync
            syncTheme();

            return () => observer.disconnect();
        }, [srcDoc]);

        // Keep selection highlight in sync when edit mode toggles off.
        useEffect(() => {
            if (!editMode) {
                onSelect(null);
            }
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [editMode]);

        return (
            <div
                className={cn(
                    'h-full overflow-hidden bg-white transition dark:bg-neutral-950',
                    device === 'desktop'
                        ? cn(
                              'rounded-xl border shadow-sm',
                              editMode
                                  ? 'border-primary/40 ring-primary/20 ring-2'
                                  : 'border-border',
                          )
                        : 'rounded-none border-0 shadow-none ring-0',
                )}
            >
                <iframe
                    key={html}
                    ref={iframeRef}
                    title="Live preview"
                    srcDoc={srcDoc}
                    sandbox="allow-scripts"
                    className="size-full"
                />
            </div>
        );
    };

    Component.displayName = 'PreviewFrame';

    return Component;
})();

function HistorySidebar({
    history,
    currentId,
    open,
    onClose,
    onNew,
    onOpen,
    onDelete,
}: {
    history: DesignSummary[];
    currentId: string | null;
    open: boolean;
    onClose: () => void;
    onNew: () => void;
    onOpen: (id: string) => void;
    onDelete: (id: string) => void;
}) {
    return (
        <>
            {open ? (
                <button
                    type="button"
                    aria-label="Tutup riwayat"
                    className="fixed inset-0 z-30 bg-black/40 lg:hidden"
                    onClick={onClose}
                />
            ) : null}

            <aside
                className={cn(
                    'border-border bg-card fixed inset-y-0 left-0 z-40 flex flex-col border-r transition-all duration-300 ease-in-out lg:static lg:z-auto',
                    open
                        ? 'w-72 translate-x-0'
                        : 'w-72 -translate-x-full lg:w-0 lg:translate-x-0 lg:overflow-hidden lg:border-transparent',
                )}
            >
                <div className="flex h-full w-72 shrink-0 flex-col">
                    <div className="border-border flex h-16 shrink-0 items-center justify-between border-b px-4">
                        <span className="text-sm font-semibold">
                            Riwayat design
                        </span>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Tutup riwayat"
                            onClick={onClose}
                        >
                            <PanelLeft className="size-4" />
                        </Button>
                    </div>

                    <div className="p-3">
                        <Button
                            type="button"
                            variant="outline"
                            className="w-full justify-start"
                            onClick={onNew}
                        >
                            <Plus className="size-4" />
                            Design baru
                        </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-3 pb-4">
                        {history.length === 0 ? (
                            <p className="text-muted-foreground px-1 py-6 text-center text-xs">
                                Belum ada design tersimpan.
                            </p>
                        ) : (
                            <ul className="space-y-1">
                                {history.map((item) => {
                                    const isActive = item.id === currentId;

                                    return (
                                        <li
                                            key={item.id}
                                            className="group relative"
                                        >
                                            <button
                                                type="button"
                                                onClick={() => onOpen(item.id)}
                                                className={cn(
                                                    'w-full rounded-lg border px-3 py-2 pr-9 text-left transition',
                                                    isActive
                                                        ? 'border-primary/40 bg-primary/10'
                                                        : 'hover:bg-accent border-transparent',
                                                )}
                                            >
                                                <p className="truncate text-sm font-medium">
                                                    {item.title}
                                                </p>
                                                <p className="text-muted-foreground mt-0.5 text-xs capitalize">
                                                    {item.kind.replace(
                                                        '-',
                                                        ' ',
                                                    )}
                                                </p>
                                            </button>
                                            <button
                                                type="button"
                                                aria-label={`Hapus ${item.title}`}
                                                onClick={() =>
                                                    onDelete(item.id)
                                                }
                                                className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive absolute right-2 top-2.5 rounded-md p-1 opacity-0 transition focus-visible:opacity-100 group-hover:opacity-100"
                                            >
                                                <Trash2 className="size-3.5" />
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </div>
            </aside>
        </>
    );
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function highlightTag(tag: string): string {
    const isCloseTag = tag.startsWith('</');
    const isDoctype = tag.toUpperCase().startsWith('<!DOCTYPE');

    if (isDoctype) {
        return `<span class="text-sky-400 font-semibold">${escapeHtml(tag)}</span>`;
    }

    if (isCloseTag) {
        const tagName = tag.substring(2, tag.length - 1);

        return `<span class="text-pink-500">&lt;/</span><span class="text-pink-500 font-semibold">${escapeHtml(tagName)}</span><span class="text-pink-500">&gt;</span>`;
    }

    const match = tag.match(/^<([a-zA-Z0-9:-]+)([\s\S]*?)(\/?>)$/);

    if (!match) {
        return escapeHtml(tag);
    }

    const tagName = match[1];
    const attributesPart = match[2];
    const closure = match[3];

    const highlightedAttributes = attributesPart.replace(
        /([a-zA-Z0-9:-]+)(=(?:(["'])([\s\S]*?)\3|([^\s>]+)))?/g,
        (m, name, equalsAndValue, quote, quotedVal, unquotedVal) => {
            let res = `<span class="text-amber-400">${name}</span>`;

            if (equalsAndValue) {
                res += '=';
                const val = quote
                    ? `${quote}${quotedVal}${quote}`
                    : unquotedVal;
                res += `<span class="text-emerald-400">${escapeHtml(val)}</span>`;
            }

            return res;
        },
    );

    return `<span class="text-pink-500">&lt;</span><span class="text-pink-500 font-semibold">${tagName}</span>${highlightedAttributes}<span class="text-pink-500">${closure}</span>`;
}

function highlightHtml(code: string): string {
    if (!code) {
        return '';
    }

    const parts = code.split(/(<!--[\s\S]*?-->|<[^>]+>)/g);

    return parts
        .map((part) => {
            if (part.startsWith('<!--') && part.endsWith('-->')) {
                return `<span class="text-neutral-500 italic">${escapeHtml(part)}</span>`;
            } else if (part.startsWith('<') && part.endsWith('>')) {
                return highlightTag(part);
            } else {
                return escapeHtml(part);
            }
        })
        .join('');
}
