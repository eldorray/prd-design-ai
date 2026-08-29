import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    Check,
    ChevronsUpDown,
    Copy,
    Download,
    FileText,
    Lightbulb,
    Loader2,
    MessageCircle,
    PanelLeft,
    Pencil,
    Plus,
    RefreshCw,
    Send,
    Trash2,
    Wand2,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import PrdAssistantController from '@/actions/App/Http/Controllers/PrdAssistantController';
import PrdController from '@/actions/App/Http/Controllers/PrdController';
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
import { useClipboard } from '@/hooks/use-clipboard';
import { cn } from '@/lib/utils';
import type { Auth, Prd, PrdMessage, PrdSummary, User } from '@/types';

type Model = string;
type Mode = 'interview' | 'generate' | 'refine';
type Stage = 'idea' | 'interview' | 'prd';

const MODEL_LABELS: Record<string, string> = {
    'deepseek-v4-flash': 'DeepSeek V4 Flash',
    'deepseek-v4-pro': 'DeepSeek V4 Pro',
    'gemini-3.5-flash': 'Gemini 3.5 Flash',
    'gemini-3.1-pro-preview': 'Gemini 3.1 Pro',
    'MiniMax-M3': 'MiniMax M3',
};

const modelLabel = (model: string): string => MODEL_LABELS[model] ?? model;

type ChatMessage = {
    id: string;
    role: 'assistant' | 'user';
    content: string;
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
    aiModels?: string[];
    [key: string]: unknown;
};

type ParsedAssistantQuestion = {
    question: string;
    examples: string[];
    note: string;
};

type PrdSectionItem =
    | { kind: 'line'; text: string }
    | { kind: 'diagram'; code: string };

type ParsedPrdSection = {
    title: string;
    /** Ordered items — text lines and Mermaid diagrams interleaved. */
    content: PrdSectionItem[];
};

const RECOMMENDED_ANSWERS = 5;

const STEPS: { key: Stage; label: string; icon: typeof Lightbulb }[] = [
    { key: 'idea', label: 'Ide', icon: Lightbulb },
    { key: 'interview', label: 'Wawancara', icon: MessageCircle },
    { key: 'prd', label: 'PRD', icon: FileText },
];

function cleanAssistantText(content: string) {
    return content.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
}

function parseAssistantQuestion(content: string): ParsedAssistantQuestion {
    const cleanedContent = cleanAssistantText(content);
    const structuredQuestion = cleanedContent.match(
        /PERTANYAAN:\s*(.*?)(?=\s+CONTOH:|\s+KENAPA:|$)/i,
    );
    const structuredExamples = cleanedContent.match(
        /CONTOH:\s*(.*?)(?=\s+KENAPA:|$)/i,
    );
    const structuredNote = cleanedContent.match(/KENAPA:\s*(.*)$/i);

    if (structuredQuestion) {
        return {
            question: structuredQuestion[1].trim(),
            examples: parseExampleOptions(structuredExamples?.[1] ?? ''),
            note: structuredNote?.[1]?.trim() ?? '',
        };
    }

    const exampleMatch = cleanedContent.match(
        /\((?:contoh|misalnya)\s*:?\s*([^)]+)\)/i,
    );
    const textWithoutExamples = exampleMatch
        ? cleanedContent.replace(exampleMatch[0], '').trim()
        : cleanedContent;
    const question =
        textWithoutExamples.match(/:\s*([^?]+\?)/)?.[1]?.trim() ??
        textWithoutExamples.match(/([^.!?]*\?)/)?.[1]?.trim() ??
        textWithoutExamples.split(/[.!]/)[0]?.trim() ??
        textWithoutExamples;
    const note = textWithoutExamples
        .replace(/^.*?:\s*/, '')
        .replace(question, '')
        .replace(/^[\s.]+/, '')
        .trim();

    return {
        question,
        examples: parseExampleOptions(exampleMatch?.[1] ?? ''),
        note,
    };
}

function parseExampleOptions(rawExamples: string) {
    return rawExamples
        .split(/\||,/)
        .map((example) =>
            example
                .replace(/^atau\s+/i, '')
                .replace(/[?.]+$/g, '')
                .trim(),
        )
        .filter(Boolean)
        .slice(0, 6);
}

function parsePrdSections(content: string): ParsedPrdSection[] {
    const sections: ParsedPrdSection[] = [];
    const lines = content.split('\n');
    let currentSection: ParsedPrdSection | null = null;
    let inFence = false;
    let fenceBuffer: string[] = [];

    const ensureSection = () => {
        if (!currentSection) {
            currentSection = {
                title: 'Ringkasan',
                content: [],
            };
            sections.push(currentSection);
        }

        return currentSection;
    };

    lines.forEach((line) => {
        const trimmedLine = line.trim();

        // Fenced code blocks (e.g. Mermaid ERD) are captured verbatim —
        // including their content — instead of being dropped, so diagrams
        // survive into the section view at their original position.
        if (trimmedLine.startsWith('```')) {
            if (!inFence) {
                inFence = true;
                fenceBuffer = [trimmedLine];

                return;
            }

            inFence = false;
            fenceBuffer.push(trimmedLine);
            ensureSection().content.push({
                kind: 'diagram',
                code: fenceBuffer.join('\n'),
            });

            return;
        }

        if (inFence) {
            fenceBuffer.push(trimmedLine);

            return;
        }

        if (!trimmedLine) {
            return;
        }

        if (/^---+$/.test(trimmedLine)) {
            return;
        }

        if (/^#{1,2}\s+/.test(trimmedLine)) {
            currentSection = {
                title: trimmedLine.replace(/^#+\s*/, ''),
                content: [],
            };
            sections.push(currentSection);

            return;
        }

        ensureSection().content.push({ kind: 'line', text: trimmedLine });
    });

    return sections;
}

function cleanPrdText(content: string) {
    return content
        .replace(/\*\*/g, '')
        .replace(/`([^`]+)`/g, '$1')
        .trim();
}

function isPrdContent(content: string) {
    // A PRD always carries at least one section heading (## ...) somewhere in
    // the document; checking the first character misses documents that open
    // with a code fence or a short preamble.
    return /^#{1,2}\s+\S/m.test(content.trim());
}

function deriveTitle(content: string, idea: string) {
    const fromContent = content
        .split('\n')
        .find((line) => line.startsWith('# '))
        ?.replace('# ', '')
        .trim();

    if (fromContent) {
        return fromContent.slice(0, 120);
    }

    const fromIdea = idea.replace(/\s+/g, ' ').trim();

    return fromIdea ? fromIdea.slice(0, 80) : 'PRD tanpa judul';
}

function hydrateMessages(messages: PrdMessage[]): ChatMessage[] {
    return messages.map((message) => ({
        id: newId(),
        role: message.role,
        content: message.content,
    }));
}

/**
 * crypto.randomUUID() only exists in secure contexts (HTTPS / localhost);
 * fall back for LAN dev over plain http:// where the workspace would
 * otherwise crash on load.
 */
function newId(): string {
    if (
        typeof crypto !== 'undefined' &&
        typeof crypto.randomUUID === 'function'
    ) {
        return crypto.randomUUID();
    }

    return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

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
                throw new Error(
                    (data as { message?: string } | null)?.message ??
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
                                    <UserMenu user={user} />
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

function HistorySidebar({
    history,
    currentPrdId,
    open,
    onClose,
    onNew,
    onOpen,
    onDelete,
}: {
    history: PrdSummary[];
    currentPrdId: string | null;
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
                    'm3-history-drawer fixed inset-y-0 left-0 z-40 flex flex-col transition-all duration-300 ease-in-out lg:static lg:z-auto',
                    open
                        ? 'w-72 translate-x-0'
                        : 'w-72 -translate-x-full lg:w-0 lg:translate-x-0 lg:overflow-hidden lg:border-transparent',
                )}
            >
                <div className="flex h-full w-72 shrink-0 flex-col">
                    <div className="flex h-16 shrink-0 items-center justify-between px-4">
                        <div>
                            <span className="text-sm font-medium">Dokumen</span>
                            <p className="text-muted-foreground text-xs">
                                Riwayat PRD
                            </p>
                        </div>
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
                            className="m3-new-document h-12 w-full justify-start"
                            onClick={onNew}
                        >
                            <Plus className="size-4" />
                            PRD baru
                        </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-3 pb-4">
                        {history.length === 0 ? (
                            <p className="text-muted-foreground px-1 py-6 text-center text-xs">
                                Belum ada PRD tersimpan. Buat yang pertama.
                            </p>
                        ) : (
                            <ul className="space-y-1">
                                {history.map((item) => {
                                    const isActive = item.id === currentPrdId;

                                    return (
                                        <li
                                            key={item.id}
                                            className="group relative"
                                        >
                                            <button
                                                type="button"
                                                onClick={() => onOpen(item.id)}
                                                className={cn(
                                                    'm3-history-item min-h-14 w-full px-3 py-2 pr-11 text-left transition',
                                                    isActive ? 'is-active' : '',
                                                )}
                                            >
                                                <p className="truncate text-sm font-medium">
                                                    {item.title}
                                                </p>
                                                <p className="text-muted-foreground mt-0.5 text-xs">
                                                    {formatTimestamp(
                                                        item.updated_at,
                                                    )}
                                                </p>
                                            </button>
                                            <button
                                                type="button"
                                                aria-label={`Hapus ${item.title}`}
                                                onClick={() =>
                                                    onDelete(item.id)
                                                }
                                                className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive absolute right-1 top-1.5 flex size-11 items-center justify-center rounded-full opacity-0 transition focus-visible:opacity-100 group-hover:opacity-100"
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

function formatTimestamp(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return '';
    }

    return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
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
                    data-test="user-menu-button"
                >
                    <UserInfo user={user} />
                    <ChevronsUpDown className="text-muted-foreground size-4" />
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

function Stepper({ stage }: { stage: Stage }) {
    const currentIndex = STEPS.findIndex((step) => step.key === stage);

    return (
        <ol
            className="m3-progress-path flex items-center"
            aria-label="Tahap pembuatan PRD"
        >
            {STEPS.map((step, index) => {
                const isCurrent = index === currentIndex;
                const isDone = index < currentIndex;
                const StepIcon = step.icon;

                return (
                    <li
                        key={step.key}
                        className="flex min-w-0 flex-1 items-center last:flex-none"
                    >
                        <div
                            aria-current={isCurrent ? 'step' : undefined}
                            className={cn(
                                'm3-progress-step flex min-h-10 items-center gap-2 px-3 text-xs font-medium',
                                isCurrent && 'is-current',
                                isDone && 'is-done',
                            )}
                        >
                            <span className="m3-progress-icon flex size-6 items-center justify-center">
                                {isDone ? (
                                    <Check className="size-3.5" />
                                ) : (
                                    <StepIcon className="size-3.5" />
                                )}
                            </span>
                            <span>{step.label}</span>
                        </div>
                        {index < STEPS.length - 1 ? (
                            <span
                                className={cn(
                                    'm3-progress-connector mx-1 h-0.5 min-w-3 flex-1',
                                    isDone && 'is-done',
                                )}
                            />
                        ) : null}
                    </li>
                );
            })}
        </ol>
    );
}

function ModelSelect({
    model,
    models,
    onModelChange,
    className,
}: {
    model: Model;
    models: AiModelOption[];
    onModelChange: (model: Model) => void;
    className?: string;
}) {
    return (
        <Select
            value={model}
            onValueChange={(value) => onModelChange(value as Model)}
            disabled={models.length === 0}
        >
            <SelectTrigger
                className={cn('h-9 w-[190px] text-xs', className)}
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
    );
}

function IdeaStage({
    idea,
    model,
    models,
    areModelsLoading,
    modelError,
    isLoading,
    onIdeaChange,
    onModelChange,
    onStart,
}: {
    idea: string;
    model: Model;
    models: AiModelOption[];
    areModelsLoading: boolean;
    modelError: string | null;
    isLoading: boolean;
    onIdeaChange: (idea: string) => void;
    onModelChange: (model: Model) => void;
    onStart: () => void;
}) {
    return (
        <div className="mx-auto max-w-3xl">
            <div className="m3-stage-heading mb-7">
                <div className="m3-stage-icon flex size-14 items-center justify-center">
                    <Lightbulb className="size-7" />
                </div>
                <div>
                    <p className="m3-stage-label">Tahap pertama</p>
                    <h2 className="mt-1 text-3xl font-medium tracking-tight md:text-4xl">
                        Mulai dari ide produkmu
                    </h2>
                    <p className="text-muted-foreground mt-3 max-w-2xl text-sm leading-6 md:text-base">
                        Ceritakan masalah yang ingin diselesaikan. Workspace
                        akan mengajukan pertanyaan penting sebelum menyusun PRD.
                    </p>
                </div>
            </div>

            <div className="m3-idea-container p-5 md:p-7">
                <label
                    htmlFor="idea"
                    className="mb-2 block text-sm font-medium"
                >
                    Ide produk
                </label>
                <textarea
                    id="idea"
                    value={idea}
                    onChange={(event) => onIdeaChange(event.target.value)}
                    placeholder="Contoh: webapp untuk membantu founder mengubah ide mentah menjadi PRD yang siap diberikan ke developer..."
                    className="min-h-44 w-full resize-y p-4 text-base leading-7"
                />

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-xs font-medium">
                            Model
                        </span>
                        <ModelSelect
                            model={model}
                            models={models}
                            onModelChange={onModelChange}
                        />
                    </div>
                    {areModelsLoading ? (
                        <p className="text-muted-foreground mt-2 text-xs">
                            Memuat model dari Base URL provider...
                        </p>
                    ) : modelError ? (
                        <p className="text-destructive mt-2 max-w-md text-xs">
                            {modelError}
                        </p>
                    ) : null}
                    <Button
                        type="button"
                        size="lg"
                        disabled={!idea.trim() || isLoading}
                        onClick={onStart}
                    >
                        {isLoading ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : (
                            <MessageCircle className="size-4" />
                        )}
                        Mulai wawancara
                    </Button>
                </div>
            </div>

            <ol className="m3-process-strip mt-6 grid gap-0 sm:grid-cols-3">
                {[
                    {
                        icon: MessageCircle,
                        title: 'Wawancara',
                        body: 'Jawab pertanyaan AI satu per satu.',
                    },
                    {
                        icon: Wand2,
                        title: 'Generate',
                        body: 'AI menyusun PRD lengkap otomatis.',
                    },
                    {
                        icon: Download,
                        title: 'Export',
                        body: 'Salin atau unduh sebagai Markdown.',
                    },
                ].map((step) => (
                    <li key={step.title} className="m3-process-item p-4">
                        <step.icon className="text-muted-foreground size-4" />
                        <p className="mt-2 text-sm font-medium">{step.title}</p>
                        <p className="text-muted-foreground text-xs">
                            {step.body}
                        </p>
                    </li>
                ))}
            </ol>
        </div>
    );
}

function InterviewStage({
    idea,
    model,
    models,
    areModelsLoading,
    modelError,
    answer,
    selectedExamples,
    messages,
    activeQuestionId,
    isLoading,
    answeredQuestions,
    canGenerate,
    hasPrd,
    transcriptEndRef,
    onModelChange,
    onAnswerChange,
    onToggleExample,
    onSubmitAnswer,
    onGenerate,
    onBackToPrd,
}: {
    idea: string;
    model: Model;
    models: AiModelOption[];
    areModelsLoading: boolean;
    modelError: string | null;
    answer: string;
    selectedExamples: string[];
    messages: ChatMessage[];
    activeQuestionId: string | null;
    isLoading: boolean;
    answeredQuestions: number;
    canGenerate: boolean;
    hasPrd: boolean;
    transcriptEndRef: React.RefObject<HTMLDivElement | null>;
    onModelChange: (model: Model) => void;
    onAnswerChange: (answer: string) => void;
    onToggleExample: (example: string) => void;
    onSubmitAnswer: () => void;
    onGenerate: () => void;
    onBackToPrd: () => void;
}) {
    const progress = Math.min(answeredQuestions / RECOMMENDED_ANSWERS, 1);
    const remaining = Math.max(RECOMMENDED_ANSWERS - answeredQuestions, 0);

    return (
        <div className="space-y-6">
            <div className="m3-interview-summary p-5 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="m3-stage-label">Ide produk</p>
                        <p className="text-foreground mt-1 line-clamp-2 text-sm">
                            {idea}
                        </p>
                    </div>
                    <ModelSelect
                        model={model}
                        models={models}
                        onModelChange={onModelChange}
                    />
                </div>
                {areModelsLoading ? (
                    <p className="text-muted-foreground mt-2 text-xs">
                        Memuat model dari Base URL provider...
                    </p>
                ) : modelError ? (
                    <p className="text-destructive mt-2 text-xs">
                        {modelError}
                    </p>
                ) : null}

                <div className="mt-4">
                    <div className="text-muted-foreground mb-1.5 flex items-center justify-between text-xs">
                        <span>Progress wawancara</span>
                        <span>
                            {answeredQuestions} / {RECOMMENDED_ANSWERS} jawaban
                        </span>
                    </div>
                    <div className="m3-linear-track h-1.5 w-full overflow-hidden">
                        <div
                            className="m3-linear-indicator h-full transition-all"
                            style={{ width: `${progress * 100}%` }}
                        />
                    </div>
                </div>

                {hasPrd ? (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground mt-3"
                        onClick={onBackToPrd}
                    >
                        <ArrowLeft className="size-4" />
                        Kembali ke PRD
                    </Button>
                ) : null}
            </div>

            <div className="space-y-4">
                {messages.map((message) => {
                    if (message.role === 'user') {
                        return (
                            <div key={message.id} className="flex justify-end">
                                <div className="m3-chat-user max-w-[85%] px-4 py-3 text-sm leading-6">
                                    {message.content}
                                </div>
                            </div>
                        );
                    }

                    if (message.id === activeQuestionId) {
                        return (
                            <QuestionCard
                                key={message.id}
                                question={parseAssistantQuestion(
                                    message.content,
                                )}
                                answer={answer}
                                selectedExamples={selectedExamples}
                                isLoading={isLoading}
                                onAnswerChange={onAnswerChange}
                                onToggleExample={onToggleExample}
                                onSubmit={onSubmitAnswer}
                                canSubmit={
                                    answer.trim() !== '' ||
                                    selectedExamples.length > 0
                                }
                            />
                        );
                    }

                    return (
                        <div key={message.id} className="flex justify-start">
                            <div className="m3-chat-assistant max-w-[85%] px-4 py-3 text-sm leading-6">
                                {parseAssistantQuestion(message.content)
                                    .question ||
                                    cleanAssistantText(message.content)}
                            </div>
                        </div>
                    );
                })}

                {isLoading ? (
                    <div className="text-muted-foreground flex items-center gap-2 px-1 text-sm">
                        <Loader2 className="text-primary size-4 animate-spin" />
                        {MODEL_LABELS[model]} sedang menulis...
                    </div>
                ) : null}

                <div ref={transcriptEndRef} />
            </div>

            <div className="m3-interview-action sticky bottom-4 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-muted-foreground text-xs">
                        {canGenerate
                            ? remaining > 0
                                ? `Sudah cukup untuk membuat PRD. Tambah ${remaining} jawaban lagi untuk hasil lebih lengkap.`
                                : 'Wawancara lengkap. Saatnya membuat PRD.'
                            : 'Jawab minimal 2 pertanyaan sebelum membuat PRD.'}
                    </p>
                    <Button
                        type="button"
                        disabled={!canGenerate || isLoading}
                        onClick={onGenerate}
                    >
                        {isLoading ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : (
                            <Wand2 className="size-4" />
                        )}
                        {hasPrd ? 'Buat ulang PRD' : 'Buat PRD sekarang'}
                    </Button>
                </div>
            </div>
        </div>
    );
}

function QuestionCard({
    question,
    answer,
    selectedExamples,
    isLoading,
    onAnswerChange,
    onToggleExample,
    onSubmit,
    canSubmit,
}: {
    question: ParsedAssistantQuestion;
    answer: string;
    selectedExamples: string[];
    isLoading: boolean;
    onAnswerChange: (answer: string) => void;
    onToggleExample: (example: string) => void;
    onSubmit: () => void;
    canSubmit: boolean;
}) {
    return (
        <div className="m3-question-container p-5 md:p-7">
            <div className="flex items-center gap-2 text-sm font-medium text-[var(--m3-on-primary-container)]">
                <MessageCircle className="size-4" />
                Pertanyaan berikutnya
            </div>
            <p className="mt-3 text-xl font-medium leading-8 md:text-2xl">
                {question.question}
            </p>

            {question.examples.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                    {question.examples.map((example) => {
                        const isSelected = selectedExamples.includes(example);

                        return (
                            <button
                                key={example}
                                type="button"
                                onClick={() => onToggleExample(example)}
                                aria-pressed={isSelected}
                                className={cn(
                                    'm3-filter-chip min-h-11 border px-4 py-2 text-sm transition',
                                    isSelected ? 'is-selected' : '',
                                )}
                            >
                                {example}
                            </button>
                        );
                    })}
                </div>
            ) : null}

            {question.note ? (
                <p className="m3-question-note mt-4 p-3 text-sm leading-6">
                    {question.note}
                </p>
            ) : null}

            <div className="mt-4 space-y-3">
                <textarea
                    value={answer}
                    onChange={(event) => onAnswerChange(event.target.value)}
                    onKeyDown={(event) => {
                        if (
                            (event.metaKey || event.ctrlKey) &&
                            event.key === 'Enter'
                        ) {
                            event.preventDefault();
                            onSubmit();
                        }
                    }}
                    placeholder="Tulis jawabanmu di sini, atau pilih dari opsi di atas..."
                    className="min-h-32 w-full resize-y p-4 text-sm leading-6"
                />
                <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-xs">
                        ⌘/Ctrl + Enter untuk kirim
                    </span>
                    <Button
                        type="button"
                        disabled={isLoading || !canSubmit}
                        onClick={onSubmit}
                    >
                        {isLoading ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : (
                            <Send className="size-4" />
                        )}
                        Kirim jawaban
                    </Button>
                </div>
            </div>
        </div>
    );
}

function PrdStage({
    prd,
    revision,
    isLoading,
    lastUsage,
    prdId,
    onRevisionChange,
    onRequestRevision,
    onRegenerate,
    onCopy,
    onExport,
    onBackToInterview,
}: {
    prd: string;
    revision: string;
    isLoading: boolean;
    lastUsage: number | null;
    prdId: string | null;
    onRevisionChange: (revision: string) => void;
    onRequestRevision: () => void;
    onRegenerate: () => void;
    onCopy: () => void;
    onExport: () => void;
    onBackToInterview: () => void;
}) {
    const sections = parsePrdSections(prd);
    const title = sections[0]?.title ?? 'PRD';
    const documentSections =
        sections.length > 1 ? sections.slice(1) : sections.slice(0);

    return (
        <div className="space-y-5">
            <div className="m3-document-toolbar p-5 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="m3-stage-icon flex size-11 items-center justify-center">
                            <FileText className="size-5" />
                        </div>
                        <div>
                            <p className="m3-stage-label">Dokumen PRD</p>
                            <h2 className="text-lg font-semibold tracking-tight">
                                {title}
                            </h2>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {prdId && (
                            <Button
                                asChild
                                variant="outline"
                                size="sm"
                                className="m3-design-action"
                            >
                                <Link href={`/design?prd_id=${prdId}`}>
                                    <Wand2 className="size-4" />
                                    Generate UI Mockup
                                </Link>
                            </Button>
                        )}
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={onCopy}
                        >
                            <Copy className="size-4" />
                            Salin
                        </Button>
                        <Button type="button" size="sm" onClick={onExport}>
                            <Download className="size-4" />
                            Unduh Markdown
                        </Button>
                    </div>
                </div>

                {lastUsage ? (
                    <p className="text-muted-foreground mt-3 text-xs">
                        {lastUsage.toLocaleString()} token digunakan
                    </p>
                ) : null}
            </div>

            <article className="m3-document-paper">
                {documentSections.map((section, index) => (
                    <section
                        key={`${section.title}-${index}`}
                        className="m3-document-section p-5 md:p-7"
                    >
                        <div className="flex gap-4">
                            <div className="m3-section-index flex size-8 shrink-0 items-center justify-center text-sm font-medium">
                                {String(index + 1).padStart(2, '0')}
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 className="text-base font-semibold">
                                    {section.title}
                                </h3>
                                <PrdSectionContent items={section.content} />
                            </div>
                        </div>
                    </section>
                ))}
            </article>

            <div className="m3-revision-panel p-5 md:p-6">
                <div className="flex items-center gap-2">
                    <Pencil className="text-muted-foreground size-4" />
                    <p className="text-sm font-medium">Minta revisi</p>
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                    Jelaskan bagian yang ingin diubah, AI akan memperbarui PRD
                    tanpa menghilangkan isi penting.
                </p>
                <textarea
                    value={revision}
                    onChange={(event) => onRevisionChange(event.target.value)}
                    placeholder="Contoh: tambahkan bagian metrik keberhasilan dan perjelas scope MVP..."
                    className="mt-3 min-h-28 w-full resize-y p-4 text-sm leading-6"
                />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={onBackToInterview}
                            className="text-muted-foreground"
                        >
                            <ArrowLeft className="size-4" />
                            Lanjut wawancara
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isLoading}
                            onClick={onRegenerate}
                        >
                            {isLoading ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : (
                                <RefreshCw className="size-4" />
                            )}
                            Buat ulang
                        </Button>
                    </div>
                    <Button
                        type="button"
                        disabled={isLoading || !revision.trim()}
                        onClick={onRequestRevision}
                    >
                        {isLoading ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : (
                            <Wand2 className="size-4" />
                        )}
                        Terapkan revisi
                    </Button>
                </div>
            </div>
        </div>
    );
}

/**
 * Group consecutive lines into renderable blocks: markdown tables, task
 * checklists, or plain text runs. Diagrams are handled separately.
 */
function parsePrdBlocks(
    lines: string[],
): Array<
    | { type: 'table'; rows: string[][] }
    | { type: 'checklist'; items: string[] }
    | { type: 'text'; lines: string[] }
> {
    const blocks: Array<
        | { type: 'table'; rows: string[][] }
        | { type: 'checklist'; items: string[] }
        | { type: 'text'; lines: string[] }
    > = [];

    const splitRow = (row: string): string[] =>
        row
            .replace(/^\|/, '')
            .replace(/\|$/, '')
            .split('|')
            .map((cell) => cell.trim());

    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        // Markdown table: header row + separator row.
        if (
            line.startsWith('|') &&
            i + 1 < lines.length &&
            /^\|?[\s:-]+\|/.test(lines[i + 1]) &&
            /^[\s|:-]+$/.test(lines[i + 1])
        ) {
            const rows: string[][] = [splitRow(line)];
            i += 2; // skip separator

            while (i < lines.length && lines[i].startsWith('|')) {
                rows.push(splitRow(lines[i]));
                i += 1;
            }

            blocks.push({ type: 'table', rows });

            continue;
        }

        // Task checklist item (- [ ] ... / - [x] ...).
        if (/^[-*]\s+\[[ xX]\]\s+/.test(line)) {
            const items: string[] = [];

            while (i < lines.length && /^[-*]\s+\[[ xX]\]\s+/.test(lines[i])) {
                items.push(lines[i].replace(/^[-*]\s+\[[ xX]\]\s+/, ''));
                i += 1;
            }

            blocks.push({ type: 'checklist', items });

            continue;
        }

        const text: string[] = [];

        while (
            i < lines.length &&
            !lines[i].startsWith('|') &&
            !/^[-*]\s+\[[ xX]\]\s+/.test(lines[i])
        ) {
            text.push(lines[i]);
            i += 1;
        }

        blocks.push({ type: 'text', lines: text });
    }

    return blocks;
}

function PrdTable({ rows }: { rows: string[][] }) {
    const [header, ...body] = rows;

    return (
        <div className="border-border overflow-x-auto rounded-lg border">
            <table className="w-full text-left text-sm">
                <thead className="bg-muted/50">
                    <tr>
                        {header.map((cell, index) => (
                            <th
                                key={index}
                                className="whitespace-nowrap px-3 py-2 font-medium"
                            >
                                {cleanPrdText(cell)}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {body.map((row, rowIndex) => (
                        <tr
                            key={rowIndex}
                            className="border-border/60 border-t"
                        >
                            {row.map((cell, cellIndex) => (
                                <td
                                    key={cellIndex}
                                    className="text-muted-foreground px-3 py-2"
                                >
                                    {cleanPrdText(cell)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function PrdChecklist({ items }: { items: string[] }) {
    return (
        <ul className="space-y-1.5">
            {items.map((item, index) => (
                <li
                    key={index}
                    className="text-muted-foreground flex items-start gap-2.5 text-sm leading-6"
                >
                    <span className="border-border bg-background mt-1.5 size-3.5 shrink-0 rounded border" />
                    <span>{cleanPrdText(item)}</span>
                </li>
            ))}
        </ul>
    );
}

function PrdDiagram({ code, index }: { code: string; index: number }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        const succeeded = await navigator.clipboard.writeText(code).then(
            () => true,
            () => false,
        );

        if (succeeded) {
            setCopied(true);
            toast.success(
                'Kode diagram disalin. Tempel di mermaid.live untuk melihat visualnya.',
            );

            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="border-border bg-muted/30 rounded-lg border">
            <div className="border-border/60 flex items-center justify-between border-b px-3 py-1.5">
                <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                    Diagram {index + 1} · Mermaid
                </span>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                    className="h-7 px-2 text-xs"
                >
                    {copied ? (
                        <Check className="size-3.5" />
                    ) : (
                        <Copy className="size-3.5" />
                    )}
                    {copied ? 'Tersalin' : 'Salin'}
                </Button>
            </div>
            <pre className="text-foreground overflow-x-auto p-3 text-xs leading-5">
                <code>{code}</code>
            </pre>
        </div>
    );
}

function PrdSectionContent({ items }: { items: PrdSectionItem[] }) {
    // Pre-compute each item's diagram ordinal so render stays pure (the
    // React compiler forbids mutating counters during render).
    const diagramOrdinals = useMemo(() => {
        const ordinals: number[] = [];
        let next = 0;

        for (const item of items) {
            if (item.kind === 'diagram') {
                ordinals.push(next);
                next += 1;
            } else {
                ordinals.push(-1);
            }
        }

        return ordinals;
    }, [items]);

    return (
        <div className="mt-3 space-y-2">
            {items.map((item, index) => {
                if (item.kind === 'diagram') {
                    return (
                        <PrdDiagram
                            key={index}
                            code={item.code}
                            index={diagramOrdinals[index]}
                        />
                    );
                }

                // Only render a text run at its first line; the run collects
                // every consecutive line item in one block group.
                if (items[index - 1]?.kind !== 'line') {
                    const run: string[] = [];
                    let cursor = index;

                    while (
                        cursor < items.length &&
                        items[cursor].kind === 'line'
                    ) {
                        run.push(
                            (items[cursor] as { kind: 'line'; text: string })
                                .text,
                        );
                        cursor += 1;
                    }

                    return <PrdTextBlock key={index} lines={run} />;
                }

                return null;
            })}
        </div>
    );
}

function PrdTextBlock({ lines }: { lines: string[] }) {
    const blocks = parsePrdBlocks(lines);

    return (
        <div className="space-y-2">
            {blocks.map((block, index) => {
                if (block.type === 'table') {
                    return <PrdTable key={index} rows={block.rows} />;
                }

                if (block.type === 'checklist') {
                    return <PrdChecklist key={index} items={block.items} />;
                }

                return (
                    <div key={index} className="space-y-2">
                        {block.lines.map((line, lineIndex) => (
                            <PrdLine key={lineIndex} line={line} />
                        ))}
                    </div>
                );
            })}
        </div>
    );
}

function PrdLine({ line }: { line: string }) {
    const cleanLine = cleanPrdText(line);

    if (/^#{3,}\s+/.test(line)) {
        return (
            <h4 className="pt-2 text-sm font-semibold">
                {cleanPrdText(line.replace(/^#{3,}\s+/, ''))}
            </h4>
        );
    }

    if (
        !/^[-*]\s+/.test(line) &&
        !/^\d+\.\s+/.test(line) &&
        /^.{2,60}:$/.test(cleanLine)
    ) {
        return (
            <h4 className="pt-2 text-sm font-semibold">
                {cleanLine.replace(/:$/, '')}
            </h4>
        );
    }

    if (/^[-*]\s+/.test(line)) {
        return (
            <div className="text-muted-foreground flex gap-2 text-sm leading-6">
                <span className="bg-primary mt-2 size-1.5 shrink-0 rounded-full" />
                <span>{cleanPrdText(line.replace(/^[-*]\s+/, ''))}</span>
            </div>
        );
    }

    if (/^\d+\.\s+/.test(line)) {
        return (
            <p className="text-muted-foreground text-sm leading-6">
                {cleanPrdText(line.replace(/^\d+\.\s+/, ''))}
            </p>
        );
    }

    return (
        <p className="text-muted-foreground text-sm leading-6">{cleanLine}</p>
    );
}
