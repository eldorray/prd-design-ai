import { Head, router, usePage } from '@inertiajs/react';
import { FileText, Loader2, PanelLeft, Plus } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import PrdAssistantController from '@/actions/App/Http/Controllers/PrdAssistantController';
import PrdController from '@/actions/App/Http/Controllers/PrdController';
import { HistorySidebar } from '@/components/prd/history-sidebar';
import { IdeaStage } from '@/components/prd/idea-stage';
import { InterviewStage } from '@/components/prd/interview-stage';
import { PrdStage } from '@/components/prd/prd-stage';
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
import type { Model } from '@/lib/models';
import {
    deriveTitle,
    hydrateMessages,
    isPrdContent,
    newId,
} from '@/lib/prd-parser';
import type { ChatMessage } from '@/lib/prd-parser';
import { cn } from '@/lib/utils';
import type { Auth, Prd, PrdSummary, User } from '@/types';

type Mode = 'interview' | 'generate' | 'refine';

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
    aiModels?: string[];
    [key: string]: unknown;
};

export default function Dashboard() {
    const { auth, history, current, aiModels } = usePage<PageProps>().props;
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
    aiModels,
    areModelsLoading,
    modelError,
}: {
    user: User;
    history: PrdSummary[];
    current: Prd | null;
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

    const answeredQuestions = useMemo(
        () => messages.filter((message) => message.role === 'user').length,
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

    useEffect(() => {
        if (stage === 'interview') {
            transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isLoading, stage]);

    const csrfToken = () =>
        document
            .querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
            ?.getAttribute('content') ?? '';

    const persistPrd = async (
        nextMessages: ChatMessage[],
        nextContent: string,
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

            if (!id) {
                assignPrdId(data.prd.id);
                router.get(
                    PrdController.index.url({ query: { prd: data.prd.id } }),
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
            toast.error('PRD belum tersimpan. Perubahan masih ada di layar.');
        } finally {
            setIsSaving(false);
        }
    };

    const askAssistant = async (
        mode: Mode,
        content: string,
        displayContent = content,
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
                body: JSON.stringify({
                    model,
                    mode,
                    idea,
                    draft: prd,
                    messages: requestMessages.map(({ role, content }) => ({
                        role,
                        content,
                    })),
                }),
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

            const producesPrd = mode === 'generate' || mode === 'refine';
            const nextContent = producesPrd ? assistantMessage : prd;

            if (producesPrd) {
                setPrd(assistantMessage);
                setStage('prd');
            }

            setLastUsage(
                (data as AssistantResponse).usage?.total_tokens ?? null,
            );

            if (producesPrd || currentPrdIdRef.current) {
                await persistPrd(finalMessages, nextContent);
            }

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

        const succeeded = await askAssistant(
            'interview',
            `Pertanyaan AI: ${activeQuestion.content}\nJawaban user: ${combinedAnswer}`,
            combinedAnswer,
        );

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

            <div className="m3 m3-workspace bg-background text-foreground flex min-h-screen flex-col">
                <a className="m3-skip-link" href="#workspace-content">
                    Lewati ke workspace
                </a>
                <div className="flex flex-1">
                    <HistorySidebar
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
                        onOpenChange={(open) =>
                            !open && setPendingDeleteId(null)
                        }
                    >
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Hapus PRD?</DialogTitle>
                                <DialogDescription>
                                    Tindakan ini tidak bisa dibatalkan. PRD
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
                        <header className="m3-workspace-appbar sticky top-0 z-20 flex min-h-16 shrink-0 items-center">
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
                                    <div className="m3-product-mark flex size-10 items-center justify-center">
                                        <FileText className="size-5" />
                                    </div>
                                    <div>
                                        <h1 className="text-sm font-medium tracking-tight">
                                            PRD Workspace
                                        </h1>
                                        <p className="text-xs text-[var(--m3-on-surface-var)]">
                                            Rancang bersama AI, {user.name}
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
                                    <div className="hidden md:block">
                                        <Stepper stage={stage} />
                                    </div>
                                    <UserMenu
                                        user={user}
                                        showChevron
                                        dataTest="user-menu-button"
                                    />
                                </div>
                            </div>
                        </header>

                        <main
                            id="workspace-content"
                            className={cn(
                                'm3-workspace-canvas mx-auto w-full flex-1 px-4 py-6 md:px-8 md:py-10',
                                stage === 'prd' ? 'max-w-5xl' : 'max-w-4xl',
                            )}
                        >
                            <div className="mb-6 md:hidden">
                                <Stepper stage={stage} />
                            </div>
                            {error ? (
                                <div className="border-destructive/30 bg-destructive/10 text-destructive mb-6 rounded-lg border px-4 py-3 text-sm">
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
                                    models={aiModels}
                                    areModelsLoading={areModelsLoading}
                                    modelError={modelError}
                                    answer={answer}
                                    selectedExamples={selectedExamples}
                                    messages={interviewMessages}
                                    activeQuestionId={
                                        activeQuestion?.id ?? null
                                    }
                                    isLoading={isLoading}
                                    answeredQuestions={answeredQuestions}
                                    canGenerate={canGenerate}
                                    hasPrd={Boolean(prd.trim())}
                                    transcriptEndRef={transcriptEndRef}
                                    onModelChange={setSelectedModel}
                                    onAnswerChange={setAnswer}
                                    onToggleExample={toggleExample}
                                    onSubmitAnswer={submitAnswer}
                                    onGenerate={generatePrd}
                                    onBackToPrd={() => setStage('prd')}
                                />
                            ) : null}

                            {stage === 'prd' ? (
                                <PrdStage
                                    prd={prd}
                                    revision={revision}
                                    isLoading={isLoading}
                                    lastUsage={lastUsage}
                                    prdId={currentPrdId}
                                    onRevisionChange={setRevision}
                                    onRequestRevision={requestRevision}
                                    onRegenerate={generatePrd}
                                    onCopy={copyPrd}
                                    onExport={exportMarkdown}
                                    onBackToInterview={() =>
                                        setStage('interview')
                                    }
                                />
                            ) : null}
                        </main>
                    </div>
                </div>

                {/* Pixel-style FAB: start a new PRD from anywhere in the workspace */}
                {stage !== 'idea' ? (
                    <button
                        type="button"
                        className="m3-fab"
                        onClick={startNewPrd}
                        aria-label="Buat PRD baru"
                    >
                        <Plus className="size-5" />
                        <span className="hidden sm:inline">PRD baru</span>
                    </button>
                ) : null}
            </div>
        </>
    );
}
