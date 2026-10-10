import { Head, router, usePage } from '@inertiajs/react';
import { Loader2, PanelLeft, Plus } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import PrdAssistantController from '@/actions/App/Http/Controllers/PrdAssistantController';
import PrdController from '@/actions/App/Http/Controllers/PrdController';
import PrdStreamController from '@/actions/App/Http/Controllers/PrdStreamController';
import { HistorySidebar } from '@/components/prd/history-sidebar';
import { IdeaStage } from '@/components/prd/idea-stage';
import {
    InterviewPanel,
    InterviewProgressBar,
    InterviewStage,
    interviewReadiness,
} from '@/components/prd/interview-stage';
import { PrdActions, PrdPanel, PrdStage } from '@/components/prd/prd-stage';
import type { TokenQuota } from '@/components/prd/quota-meter';
import { Stepper } from '@/components/prd/stepper';
import type { Stage } from '@/components/prd/stepper';
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
import { useClipboard } from '@/hooks/use-clipboard';
import { buildAgentPrompt } from '@/lib/agent-prompt';
import type { Model } from '@/lib/models';
import {
    checkPrdCompleteness,
    mergePrdSections,
    restoreTruncatedTail,
    sectionsToComplete,
} from '@/lib/prd-completeness';
import {
    deriveTitle,
    hydrateMessages,
    isPrdContent,
    newId,
} from '@/lib/prd-parser';
import type { ChatMessage } from '@/lib/prd-parser';
import { streamSse } from '@/lib/stream-sse';
import { cn } from '@/lib/utils';
import type { Auth, Prd, PrdSummary, PrdVersionSummary, User } from '@/types';

type Mode = 'interview' | 'generate' | 'refine' | 'complete';

type StreamOptions = {
    /** Extra request fields, e.g. the sections "complete" should write. */
    extra?: Record<string, unknown>;
    /** Turns the streamed text into the document to show and save. */
    transform?: (text: string) => string;
};

type AssistantResponse = {
    message: string;
    model: string;
    usage?: {
        total_tokens?: number;
    };
};

type PageProps = {
    auth: Auth;
    history: PrdSummary[];
    current: Prd | null;
    versions: PrdVersionSummary[];
    quota: TokenQuota;
    /** Required `##` sections, from App\Support\PrdTemplate. */
    prdSections: string[];
    aiModels?: string[];
    [key: string]: unknown;
};

export default function Dashboard() {
    const { auth, history, current, versions, quota, prdSections, aiModels } =
        usePage<PageProps>().props;
    const {
        models: availableModels,
        isLoading: areModelsLoading,
        error: modelError,
    } = useAiModels(aiModels ?? []);

    // Remount the workspace whenever a different PRD is loaded so its state is
    // initialised cleanly from the server props (no effect-based hydration).
    return (
        <PrdWorkspace
            key={current?.id ?? 'new'}
            user={auth.user}
            history={history}
            current={current}
            versions={versions ?? []}
            quota={quota}
            prdSections={prdSections ?? []}
            aiModels={availableModels}
            areModelsLoading={areModelsLoading}
            modelError={modelError}
        />
    );
}

function PrdWorkspace({
    user,
    history,
    current,
    versions,
    quota,
    prdSections,
    aiModels,
    areModelsLoading,
    modelError,
}: {
    user: User;
    history: PrdSummary[];
    current: Prd | null;
    versions: PrdVersionSummary[];
    quota: TokenQuota;
    prdSections: string[];
    aiModels: AiModelOption[];
    areModelsLoading: boolean;
    modelError: string | null;
}) {
    const transcriptEndRef = useRef<HTMLDivElement>(null);
    const currentPrdIdRef = useRef<string | null>(current?.id ?? null);
    const [, copy] = useClipboard();

    const [stage, setStage] = useState<Stage>(() => {
        if (current?.content) {
            return 'prd';
        }

        return current ? 'interview' : 'idea';
    });
    const [selectedModel, setSelectedModel] = useState<Model>(
        (current?.model as Model) ?? 'deepseek-v4-flash',
    );
    // Derived: the effective model always belongs to the current provider
    // set — if the admin removed it, fall back to the first available.
    const modelIds = aiModels.map((option) => option.id);
    const model = modelIds.includes(selectedModel)
        ? selectedModel
        : (modelIds[0] ?? selectedModel);
    const [idea, setIdea] = useState(current?.idea ?? '');
    const [answer, setAnswer] = useState('');
    // Chip selections live separately from free text: joining them into one
    // comma-separated string used to corrupt answers that themselves
    // contained commas.
    const [selectedExamples, setSelectedExamples] = useState<string[]>([]);
    const [revision, setRevision] = useState('');
    const [prd, setPrd] = useState(current?.content ?? '');
    // The document as it streams in; null when no generation is running.
    const [streamingPrd, setStreamingPrd] = useState<string | null>(null);
    const streamAbortRef = useRef<AbortController | null>(null);
    // The provider cut the last generation off at its output limit.
    const [lastTruncated, setLastTruncated] = useState(false);
    const completeness = useMemo(
        () => checkPrdCompleteness(prd, prdSections, lastTruncated),
        [prd, prdSections, lastTruncated],
    );
    const [messages, setMessages] = useState<ChatMessage[]>(() =>
        current ? hydrateMessages(current.messages ?? []) : [],
    );
    const [currentPrdId, setCurrentPrdId] = useState<string | null>(
        current?.id ?? null,
    );
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastUsage, setLastUsage] = useState<number | null>(null);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

    const assignPrdId = (id: string | null) => {
        currentPrdIdRef.current = id;
        setCurrentPrdId(id);
    };

    // The first user message is the idea itself, not an answer.
    const answeredQuestions = useMemo(
        () =>
            Math.max(
                messages.filter((message) => message.role === 'user').length -
                    1,
                0,
            ),
        [messages],
    );

    const interviewMessages = useMemo(
        () => messages.filter((message) => !isPrdContent(message.content)),
        [messages],
    );

    const lastMessage = messages[messages.length - 1];
    const activeQuestion =
        !isLoading &&
        lastMessage?.role === 'assistant' &&
        !isPrdContent(lastMessage.content)
            ? lastMessage
            : null;

    const canGenerate = answeredQuestions >= 2;
    const readiness = interviewReadiness({
        answeredQuestions,
        canGenerate,
        activeQuestionContent: activeQuestion?.content ?? null,
    });

    useEffect(() => {
        if (stage === 'interview') {
            // Align the end of the stage (the answer composer) with the
            // bottom of the viewport, not its top: below xl the session
            // panel follows the stage and would otherwise scroll into view.
            transcriptEndRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'end',
            });
        }
    }, [messages, isLoading, stage]);

    // Leaving the workspace (another PRD, a new one) ends a running stream.
    useEffect(() => () => streamAbortRef.current?.abort(), []);

    const csrfToken = () =>
        document
            .querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
            ?.getAttribute('content') ?? '';

    // Every AI call debits the monthly token quota shown in the panel.
    const refreshQuota = () => router.reload({ only: ['quota'] });

    /**
     * Save the PRD. The first save creates it and, by default, navigates to
     * its URL — which remounts the workspace, so `navigate: false` is used
     * while a stream is about to run and must not be interrupted.
     */
    const persistPrd = async (
        nextMessages: ChatMessage[],
        nextContent: string,
        { navigate = true }: { navigate?: boolean } = {},
    ) => {
        const id = currentPrdIdRef.current;
        const payload = {
            title: deriveTitle(nextContent, idea),
            idea,
            model,
            content: nextContent || null,
            messages: nextMessages.map(({ role, content }) => ({
                role,
                content,
            })),
        };

        setIsSaving(true);

        try {
            const response = await fetch(
                id ? PrdController.update.url(id) : PrdController.store.url(),
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

            const data = (await response.json()) as { prd: Prd };

            if (!id && !navigate) {
                assignPrdId(data.prd.id);
                router.reload({ only: ['history', 'quota'] });
            } else if (!id) {
                assignPrdId(data.prd.id);
                router.get(
                    PrdController.index.url({ query: { prd: data.prd.id } }),
                    {},
                    {
                        preserveState: true,
                        preserveScroll: true,
                        replace: true,
                        only: ['history', 'current', 'versions', 'quota'],
                    },
                );
            } else {
                router.reload({ only: ['history', 'versions', 'quota'] });
            }
        } catch {
            toast.error('PRD belum tersimpan. Perubahan masih ada di layar.');
        } finally {
            setIsSaving(false);
        }
    };

    const askAssistant = async (
        mode: Mode,
        content: string,
        displayContent = content,
        streamOptions: StreamOptions = {},
    ): Promise<boolean> => {
        const trimmedContent = content.trim();
        const trimmedDisplayContent = displayContent.trim();

        if (!trimmedContent || isLoading) {
            return false;
        }

        setError(null);
        setIsLoading(true);

        const userMessage: ChatMessage = {
            id: newId(),
            role: 'user',
            content: trimmedDisplayContent || trimmedContent,
        };
        const requestMessage: ChatMessage = {
            ...userMessage,
            content: trimmedContent,
        };
        const previousMessages = messages;
        const displayMessages = [...messages, userMessage];
        const requestMessages = [...messages, requestMessage];
        setMessages(displayMessages);

        const requestBody = {
            model,
            mode,
            idea,
            // The interview never reads the draft; sending it only costs bytes.
            draft: mode === 'interview' ? null : prd,
            // The request accepts at most 30 messages.
            messages: requestMessages.slice(-30).map(({ role, content }) => ({
                role,
                content,
            })),
            ...streamOptions.extra,
        };

        if (mode !== 'interview') {
            return streamPrd(
                requestBody,
                previousMessages,
                streamOptions.transform,
            );
        }

        try {
            // No retry here: the server already retries transient provider
            // failures once. A browser retry on top of it — especially after a
            // proxy 504 while the server is still generating — paid for the
            // same answer several times over.
            const response = await fetch(PrdAssistantController.url(), {
                method: PrdAssistantController.definition.methods[0],
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken(),
                },
                body: JSON.stringify(requestBody),
            });

            // Error pages (500/502) come back as HTML — parse defensively so
            // the user sees the server's message, not a JSON syntax error.
            let data: AssistantResponse | { message?: string } | null = null;

            try {
                data = (await response.json()) as
                    | AssistantResponse
                    | { message?: string };
            } catch {
                data = null;
            }

            if (!response.ok) {
                const statusFallbacks: Record<number, string> = {
                    419: 'Sesi Anda sudah kedaluwarsa. Muat ulang halaman lalu kirim lagi.',
                    429: 'Terlalu banyak permintaan dalam waktu singkat. Tunggu sekitar satu menit lalu coba lagi.',
                    502: 'Server AI sedang tidak stabil. Permintaan Anda sudah dicoba ulang otomatis — coba kirim lagi.',
                    503: 'Layanan AI belum siap (API key belum diatur atau provider sedang down). Hubungi admin.',
                    504: 'Penyedia AI kehabisan waktu. Coba kirim lagi atau pilih model lain di dropdown.',
                };

                throw new Error(
                    (data as { message?: string } | null)?.message ??
                        statusFallbacks[response.status] ??
                        'Assistant belum bisa merespons. Coba lagi.',
                );
            }

            const assistantMessage = (data as AssistantResponse).message;
            const assistantReply: ChatMessage = {
                id: newId(),
                role: 'assistant',
                content: assistantMessage,
            };
            const finalMessages = [...displayMessages, assistantReply];

            setMessages(finalMessages);
            setLastUsage(
                (data as AssistantResponse).usage?.total_tokens ?? null,
            );

            // Only interviews come through here (generate/refine stream), so
            // an answer changes the transcript but never the document. Save
            // after every reply: the first one creates the draft, so the
            // interview is in the history and survives a crash or a failed
            // generation. Saving reloads the quota too.
            await persistPrd(finalMessages, prd);

            return true;
        } catch (caughtError) {
            setMessages(previousMessages);
            const errorMessage =
                caughtError instanceof Error
                    ? caughtError.message
                    : 'Assistant belum bisa merespons. Coba lagi.';

            setError(
                errorMessage === 'Failed to fetch'
                    ? 'Server Laravel terputus. Jalankan ulang server lalu coba lagi.'
                    : errorMessage,
            );

            return false;
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Generate / refine over SSE so the document appears while it is written.
     * The previous PRD stays in state until the new one has fully arrived.
     */
    const streamPrd = async (
        requestBody: Record<string, unknown>,
        previousMessages: ChatMessage[],
        transform: (text: string) => string = (text) => text,
    ): Promise<boolean> => {
        // Make sure the draft exists before spending tokens on it, so a crash
        // or a failed stream leaves something in the history to resume.
        if (!currentPrdIdRef.current) {
            await persistPrd(previousMessages, prd, { navigate: false });
        }

        const controller = new AbortController();
        streamAbortRef.current = controller;
        const previousStage = stage;
        let finalText = '';
        let truncated = false;
        let failure: string | null = null;

        setStage('prd');
        setStreamingPrd('');
        setLastUsage(null);

        try {
            await streamSse(
                {
                    url: PrdStreamController.url(),
                    csrfToken: csrfToken(),
                    body: requestBody,
                    signal: controller.signal,
                    failureMessage: 'PRD belum bisa dibuat. Coba lagi.',
                },
                {
                    onChunk: (fullText) => setStreamingPrd(transform(fullText)),
                    onDone: (fullText, meta) => {
                        finalText = transform(fullText).trim();
                        truncated = meta.truncated;
                    },
                    onError: (message) => {
                        failure = message;
                    },
                },
            );
        } catch (caughtError) {
            if (
                caughtError instanceof DOMException &&
                caughtError.name === 'AbortError'
            ) {
                return false;
            }

            failure = 'Koneksi ke server terputus saat menulis PRD. Coba lagi.';
        } finally {
            streamAbortRef.current = null;
            setStreamingPrd(null);
            setIsLoading(false);
        }

        if (failure !== null || !finalText) {
            // A stream that died mid-flight keeps its quota reservation.
            refreshQuota();
            setMessages(previousMessages);
            setStage(prd.trim() ? 'prd' : previousStage);
            setError(failure ?? 'AI tidak mengembalikan PRD. Coba lagi.');

            return false;
        }

        // A refine the output limit cut off would drop the draft's tail; the
        // previous draft still has it, so take it from there for free.
        const restoredTail =
            truncated && requestBody.mode === 'refine' && prd.trim() !== '';

        if (restoredTail) {
            finalText = restoreTruncatedTail(finalText, prd, prdSections);
            toast.warning(
                'Jawaban AI terpotong. Bagian akhir PRD diambil dari versi sebelumnya.',
            );
        }

        // The document lives in `content` (and its versions), not in the
        // transcript: copying it there pushed a long PRD past the 12,000
        // character limit per message, so saving it failed.
        setMessages(previousMessages);
        setPrd(finalText);
        setLastTruncated(truncated && !restoredTail);
        await persistPrd(previousMessages, finalText);

        return true;
    };

    /**
     * Ask only for the sections the document lacks (or the cut-off tail) and
     * slot them into place. Works even when the provider's output limit is
     * too small for a whole PRD in one answer.
     */
    const completePrd = () => {
        const sections = sectionsToComplete(completeness, prdSections);

        if (sections.length === 0) {
            return;
        }

        const draft = prd;
        const replace = completeness.incomplete
            ? [completeness.incomplete]
            : [];

        askAssistant(
            'complete',
            `Lengkapi section PRD yang belum ada: ${sections.join(', ')}.`,
            undefined,
            {
                extra: { missing_sections: sections },
                transform: (text) =>
                    mergePrdSections(draft, text, prdSections, replace),
            },
        );
    };

    const restoreVersion = async (versionId: string) => {
        if (!currentPrdId || isLoading) {
            return;
        }

        try {
            const response = await fetch(
                PrdController.restoreVersion.url({
                    prd: currentPrdId,
                    version: versionId,
                }),
                {
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        'X-CSRF-TOKEN': csrfToken(),
                    },
                },
            );

            if (!response.ok) {
                throw new Error('restore failed');
            }

            const data = (await response.json()) as { prd: Prd };

            setPrd(data.prd.content ?? '');
            router.reload({ only: ['history', 'versions'] });
            toast.success('Versi sebelumnya dipulihkan.');
        } catch {
            toast.error('Versi gagal dipulihkan. Coba lagi.');
        }
    };

    const printPrd = () => {
        // Print in the light theme with the PRD title as the suggested file
        // name, then put both back once the dialog closes.
        const root = document.documentElement;
        const wasDark = root.classList.contains('dark');
        const previousTitle = document.title;

        root.classList.remove('dark');
        document.title = deriveTitle(prd, idea);

        window.addEventListener(
            'afterprint',
            () => {
                document.title = previousTitle;

                if (wasDark) {
                    root.classList.add('dark');
                }
            },
            { once: true },
        );

        window.print();
    };

    const startInterview = async () => {
        if (!idea.trim() || isLoading) {
            return;
        }

        setStage('interview');
        await askAssistant('interview', `Ide produk saya: ${idea}`);
    };

    const submitAnswer = async () => {
        const trimmedAnswer = answer.trim();
        const combinedAnswer = [
            ...selectedExamples,
            ...(trimmedAnswer ? [trimmedAnswer] : []),
        ].join(', ');

        if (!combinedAnswer || !activeQuestion) {
            return;
        }

        // The question is already the previous assistant message.
        const succeeded = await askAssistant('interview', combinedAnswer);

        if (succeeded) {
            setAnswer('');
            setSelectedExamples([]);
        }
    };

    const toggleExample = (example: string) => {
        setSelectedExamples((current) =>
            current.includes(example)
                ? current.filter((value) => value !== example)
                : [...current, example],
        );
    };

    const generatePrd = () => {
        askAssistant(
            'generate',
            'Generate PRD Markdown lengkap berdasarkan interview dan ide produk ini.',
        );
    };

    const requestRevision = async () => {
        const trimmedRevision = revision.trim();

        if (!trimmedRevision) {
            return;
        }

        const succeeded = await askAssistant('refine', trimmedRevision);

        if (succeeded) {
            setRevision('');
        }
    };

    const openPrd = (id: string) => {
        setHistoryOpen(false);

        if (id === currentPrdId) {
            return;
        }

        router.get(
            PrdController.index.url({ query: { prd: id } }),
            {},
            { preserveScroll: true },
        );
    };

    const startNewPrd = () => {
        setHistoryOpen(false);
        router.get(PrdController.index.url(), {}, { preserveScroll: true });
    };

    const deletePrd = (id: string) => {
        setPendingDeleteId(id);
    };

    const confirmDelete = () => {
        if (pendingDeleteId !== null) {
            router.delete(PrdController.destroy.url(pendingDeleteId), {
                preserveScroll: true,
            });
            setPendingDeleteId(null);
        }
    };

    const copyPrd = async () => {
        const succeeded = await copy(prd);

        if (succeeded) {
            toast.success('PRD disalin ke clipboard.');
        } else {
            toast.error('Gagal menyalin PRD.');
        }
    };

    const copyAgentPrompt = async () => {
        const succeeded = await copy(buildAgentPrompt(prd));

        if (!succeeded) {
            toast.error('Gagal menyalin prompt.');
        } else if (completeness.missing.length > 0) {
            // The agent works from Task Breakdown and Acceptance Criteria, so
            // a gap there shows up as unbuilt work.
            toast.warning(
                `Prompt disalin, tapi PRD belum lengkap (${completeness.missing.length} section belum ada). Pertimbangkan "Lengkapi" dulu.`,
            );
        } else {
            toast.success('Prompt disalin. Tempel ke coding agent Anda.');
        }
    };

    const exportMarkdown = () => {
        const productName =
            deriveTitle(prd, idea)
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '') || 'prd';
        const blob = new Blob([prd], {
            type: 'text/markdown;charset=utf-8',
        });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');

        anchor.href = url;
        anchor.download = `${productName}.md`;
        anchor.click();
        URL.revokeObjectURL(url);
        toast.success('PRD diunduh sebagai Markdown.');
    };

    return (
        <>
            <Head title="Workspace" />

            <div className="min-h-screen bg-background text-foreground">
                <a
                    className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-foreground focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-background print:hidden"
                    href="#workspace-content"
                >
                    Lewati ke workspace
                </a>

                <HistorySidebar
                    user={user}
                    open={historyOpen}
                    history={history}
                    currentPrdId={currentPrdId}
                    onClose={() => setHistoryOpen(false)}
                    onNew={startNewPrd}
                    onOpen={openPrd}
                    onDelete={deletePrd}
                />

                <Dialog
                    open={pendingDeleteId !== null}
                    onOpenChange={(open) => !open && setPendingDeleteId(null)}
                >
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="font-serif text-2xl font-normal">
                                Hapus PRD?
                            </DialogTitle>
                            <DialogDescription>
                                Tindakan ini tidak bisa dibatalkan. PRD beserta
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
                            <Button
                                variant="destructive"
                                onClick={confirmDelete}
                            >
                                Hapus
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Rail on the left from lg; the stage's side panel is fixed
                    on the right from xl and follows the stage below it. */}
                <div
                    className={cn(
                        'flex min-h-screen min-w-0 flex-col lg:pl-[248px] print:p-0',
                        stage === 'interview' && 'xl:pr-[368px]',
                        stage === 'prd' && 'xl:pr-[320px]',
                    )}
                >
                    <header className="sticky top-0 z-20 flex shrink-0 flex-col border-b bg-background print:hidden">
                        <div className="flex h-14 items-center gap-2 px-2 sm:gap-3 md:px-6 lg:h-16 xl:px-8 2xl:px-10">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    'lg:hidden',
                                    historyOpen && 'hidden',
                                )}
                                aria-label="Buka riwayat"
                                onClick={() => setHistoryOpen(true)}
                            >
                                <PanelLeft className="size-4" />
                            </Button>
                            <h1 className="sr-only">PRD Workspace</h1>

                            <div className="min-w-0 flex-1">
                                <Stepper
                                    stage={stage}
                                    showChecks={stage !== 'prd'}
                                    className="hidden md:flex"
                                />
                                <Stepper
                                    stage={stage}
                                    compact
                                    className="md:hidden"
                                />
                            </div>

                            <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
                                {isSaving ? (
                                    <span className="hidden items-center gap-1.5 text-[13px] text-muted-foreground sm:flex">
                                        <Loader2 className="size-3 animate-spin" />
                                        Menyimpan
                                    </span>
                                ) : stage === 'interview' && currentPrdId ? (
                                    <span className="hidden items-center gap-2 text-[13px] text-muted-foreground sm:flex">
                                        <span
                                            aria-hidden="true"
                                            className="size-1.5 rounded-full bg-lime-700 dark:bg-lime-500"
                                        />
                                        Tersimpan otomatis
                                    </span>
                                ) : null}
                                {stage === 'prd' ? (
                                    <PrdActions
                                        compact
                                        prdId={currentPrdId}
                                        isStreaming={streamingPrd !== null}
                                        onCopy={copyPrd}
                                        onCopyPrompt={copyAgentPrompt}
                                        onExport={exportMarkdown}
                                        onPrint={printPrd}
                                        className="hidden xl:flex"
                                    />
                                ) : null}
                                {/* The rail's "PRD baru" is one tap away only from lg. */}
                                {stage !== 'idea' ? (
                                    <Button
                                        type="button"
                                        size="icon"
                                        className="lg:hidden"
                                        aria-label="Buat PRD baru"
                                        onClick={startNewPrd}
                                    >
                                        <Plus className="size-4" />
                                    </Button>
                                ) : null}
                                <UserMenu
                                    user={user}
                                    className="lg:hidden max-sm:[&>div]:hidden"
                                />
                            </div>
                        </div>
                        {stage === 'interview' ? (
                            <InterviewProgressBar
                                answeredQuestions={answeredQuestions}
                                className="px-4 pb-3 md:px-6 xl:hidden"
                            />
                        ) : null}
                    </header>

                    <main
                        id="workspace-content"
                        className="flex flex-1 flex-col px-4 md:px-8 xl:px-10 2xl:px-16 print:p-0"
                    >
                        {error ? (
                            <div
                                role="alert"
                                className="mx-auto mt-6 w-full max-w-[760px] rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive print:hidden"
                            >
                                {error}
                            </div>
                        ) : null}

                        {stage === 'idea' ? (
                            <IdeaStage
                                idea={idea}
                                model={model}
                                models={aiModels}
                                areModelsLoading={areModelsLoading}
                                modelError={modelError}
                                isLoading={isLoading}
                                onIdeaChange={setIdea}
                                onModelChange={setSelectedModel}
                                onStart={startInterview}
                            />
                        ) : null}

                        {stage === 'interview' ? (
                            <InterviewStage
                                idea={idea}
                                model={model}
                                answer={answer}
                                selectedExamples={selectedExamples}
                                messages={interviewMessages}
                                activeQuestionId={activeQuestion?.id ?? null}
                                isLoading={isLoading}
                                readiness={readiness}
                                hasPrd={Boolean(prd.trim())}
                                transcriptEndRef={transcriptEndRef}
                                onAnswerChange={setAnswer}
                                onToggleExample={toggleExample}
                                onSubmitAnswer={submitAnswer}
                                onGenerate={generatePrd}
                                onBackToPrd={() => setStage('prd')}
                            />
                        ) : null}

                        {stage === 'prd' ? (
                            <PrdStage
                                prd={streamingPrd ?? prd}
                                isStreaming={streamingPrd !== null}
                                isLoading={isLoading}
                                lastUsage={lastUsage}
                                prdId={currentPrdId}
                                updatedAt={
                                    history.find(
                                        (item) => item.id === currentPrdId,
                                    )?.updated_at ??
                                    current?.updated_at ??
                                    null
                                }
                                versions={versions}
                                completeness={completeness}
                                onRestoreVersion={restoreVersion}
                                onComplete={completePrd}
                                onCopy={copyPrd}
                                onCopyPrompt={copyAgentPrompt}
                                onExport={exportMarkdown}
                                onPrint={printPrd}
                            />
                        ) : null}
                    </main>

                    {stage === 'interview' ? (
                        <InterviewPanel
                            model={model}
                            models={aiModels}
                            areModelsLoading={areModelsLoading}
                            modelError={modelError}
                            quota={quota}
                            answeredQuestions={answeredQuestions}
                            readiness={readiness}
                            hasPrd={Boolean(prd.trim())}
                            isLoading={isLoading}
                            onModelChange={setSelectedModel}
                            onGenerate={generatePrd}
                        />
                    ) : null}

                    {stage === 'prd' ? (
                        <PrdPanel
                            prd={streamingPrd ?? prd}
                            isStreaming={streamingPrd !== null}
                            isLoading={isLoading}
                            revision={revision}
                            onRevisionChange={setRevision}
                            onRequestRevision={requestRevision}
                            onRegenerate={generatePrd}
                            onBackToInterview={() => setStage('interview')}
                        />
                    ) : null}
                </div>
            </div>
        </>
    );
}
