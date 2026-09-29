import { ArrowLeft, ArrowRight, Check, Loader2, Wand2 } from 'lucide-react';
import { useId } from 'react';

import { ModelSelect } from '@/components/prd/model-select';
import { QuotaMeter } from '@/components/prd/quota-meter';
import type { TokenQuota } from '@/components/prd/quota-meter';
import { Button } from '@/components/ui/button';
import type { AiModelOption } from '@/hooks/use-ai-models';
import { modelLabel } from '@/lib/models';
import type { Model } from '@/lib/models';
import {
    cleanAssistantText,
    isReadyToGenerate,
    parseAssistantQuestion,
} from '@/lib/prd-parser';
import type { ChatMessage, ParsedAssistantQuestion } from '@/lib/prd-parser';
import { cn } from '@/lib/utils';

const RECOMMENDED_ANSWERS = 5;

/**
 * The section list the generate prompt requires, in its order — keep in sync
 * with prdSystemPrompt() in app/Concerns/BuildsPrdPrompt.php.
 */
const PRD_SECTIONS = [
    'Ringkasan',
    'Masalah',
    'Target User',
    'Tujuan Produk',
    'Metrik Keberhasilan',
    'Scope MVP',
    'Non-Scope MVP',
    'Fitur Utama',
    'Halaman dan Navigasi',
    'User Flow',
    'Struktur Data',
    'Diagram ERD',
    'API Endpoints',
    'Non-Functional Requirements',
    'Rekomendasi Tech Stack',
    'Task Breakdown',
    'Acceptance Criteria',
    'Risiko dan Pertanyaan Terbuka',
];

const pad = (value: number) => String(value).padStart(2, '0');

export type InterviewReadiness = {
    /** The model emitted [SIAP_GENERATE]: it has heard enough. */
    aiReady: boolean;
    generateEnabled: boolean;
    hint: string;
};

export function interviewReadiness({
    answeredQuestions,
    canGenerate,
    activeQuestionContent,
}: {
    answeredQuestions: number;
    canGenerate: boolean;
    activeQuestionContent: string | null;
}): InterviewReadiness {
    const remaining = Math.max(RECOMMENDED_ANSWERS - answeredQuestions, 0);
    const aiReady = activeQuestionContent
        ? isReadyToGenerate(activeQuestionContent)
        : false;

    return {
        aiReady,
        generateEnabled: canGenerate || aiReady,
        hint: aiReady
            ? 'AI menilai informasinya sudah cukup. Buat PRD sekarang, atau tetap jawab untuk menambah detail.'
            : canGenerate
              ? remaining > 0
                  ? `Sudah cukup untuk membuat PRD. Tambah ${remaining} jawaban lagi untuk hasil lebih lengkap.`
                  : 'Wawancara lengkap. Saatnya membuat PRD.'
              : 'Jawab minimal 2 pertanyaan sebelum membuat PRD.',
    };
}

type TranscriptEntry = {
    id: string;
    /** Question number; null for a message that answered no question. */
    number: number | null;
    question: string | null;
    answer: string;
};

/**
 * Pair each asked question with the reply that followed it, numbering the
 * questions in the order the model asked them.
 */
function buildTranscript(
    messages: ChatMessage[],
    activeQuestionId: string | null,
) {
    const entries: TranscriptEntry[] = [];
    let questionCount = 0;
    let activeNumber = 0;
    let pending: TranscriptEntry | null = null;

    for (let index = 0; index < messages.length; index += 1) {
        const message = messages[index];

        if (message.role === 'assistant') {
            questionCount += 1;
            pending = null;

            if (message.id === activeQuestionId) {
                activeNumber = questionCount;

                continue;
            }

            const parsed = parseAssistantQuestion(message.content);
            pending = {
                id: message.id,
                number: questionCount,
                question:
                    parsed.question || cleanAssistantText(message.content),
                answer: '',
            };
            entries.push(pending);

            continue;
        }

        if (pending) {
            pending.answer = message.content;
            pending = null;

            continue;
        }

        // Replies that answered no question (the opening idea is shown as
        // its own quote, so it is skipped): generate and revise requests.
        if (index > 0) {
            entries.push({
                id: message.id,
                number: null,
                question: null,
                answer: message.content,
            });
        }
    }

    return { entries, activeNumber };
}

/** Five-segment bar: answered in ink, the current one in brand. */
export function InterviewProgressBar({
    answeredQuestions,
    decorative = false,
    className,
}: {
    answeredQuestions: number;
    /** Set when the count is already printed next to the bar. */
    decorative?: boolean;
    className?: string;
}) {
    return (
        <div
            {...(decorative
                ? { 'aria-hidden': true }
                : {
                      role: 'progressbar',
                      'aria-label': 'Progress wawancara',
                      'aria-valuemin': 0,
                      'aria-valuemax': RECOMMENDED_ANSWERS,
                      'aria-valuenow': Math.min(
                          answeredQuestions,
                          RECOMMENDED_ANSWERS,
                      ),
                      'aria-valuetext': `${answeredQuestions} / ${RECOMMENDED_ANSWERS} jawaban`,
                  })}
            className={cn('grid grid-cols-5 gap-[3px] xl:gap-1', className)}
        >
            {Array.from({ length: RECOMMENDED_ANSWERS }, (_, index) => (
                <span
                    key={index}
                    className={cn(
                        'h-[3px] xl:h-1',
                        index < answeredQuestions
                            ? 'bg-foreground'
                            : index === answeredQuestions
                              ? 'bg-brand'
                              : 'bg-border',
                    )}
                />
            ))}
        </div>
    );
}

function GenerateButton({
    variant,
    readiness,
    hasPrd,
    isLoading,
    onGenerate,
    className,
}: {
    variant: 'brand' | 'outline';
    readiness: InterviewReadiness;
    hasPrd: boolean;
    isLoading: boolean;
    onGenerate: () => void;
    className?: string;
}) {
    return (
        <Button
            type="button"
            variant={variant}
            disabled={!readiness.generateEnabled || isLoading}
            onClick={onGenerate}
            className={cn(
                variant === 'outline' &&
                    'border-brand bg-transparent text-brand hover:bg-brand/10 hover:text-brand',
                className,
            )}
        >
            {isLoading ? (
                <Loader2 className="size-4 animate-spin" />
            ) : (
                <Wand2 className="size-4" />
            )}
            {hasPrd ? 'Buat ulang PRD' : 'Buat PRD sekarang'}
        </Button>
    );
}

export function InterviewStage({
    idea,
    model,
    answer,
    selectedExamples,
    messages,
    activeQuestionId,
    isLoading,
    readiness,
    hasPrd,
    transcriptEndRef,
    onAnswerChange,
    onToggleExample,
    onSubmitAnswer,
    onGenerate,
    onBackToPrd,
}: {
    idea: string;
    model: Model;
    answer: string;
    selectedExamples: string[];
    messages: ChatMessage[];
    activeQuestionId: string | null;
    isLoading: boolean;
    readiness: InterviewReadiness;
    hasPrd: boolean;
    transcriptEndRef: React.RefObject<HTMLDivElement | null>;
    onAnswerChange: (answer: string) => void;
    onToggleExample: (example: string) => void;
    onSubmitAnswer: () => void;
    onGenerate: () => void;
    onBackToPrd: () => void;
}) {
    const activeMessage = messages.find(
        (message) => message.id === activeQuestionId,
    );
    const { entries, activeNumber } = buildTranscript(
        messages,
        activeQuestionId,
    );
    const canSubmit = answer.trim() !== '' || selectedExamples.length > 0;

    return (
        <div className="mx-auto flex w-full max-w-[760px] flex-1 flex-col gap-7 pt-6 xl:pt-9">
            {hasPrd ? (
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="-mb-3 -ml-2.5 self-start text-muted-foreground"
                    onClick={onBackToPrd}
                >
                    <ArrowLeft className="size-4" />
                    Kembali ke PRD
                </Button>
            ) : null}

            <figure className="flex flex-col gap-2.5">
                <figcaption className="label-mono">Ide produk</figcaption>
                <blockquote className="line-clamp-3 font-serif text-xl leading-[1.3] text-pretty italic md:text-2xl">
                    “{idea}”
                </blockquote>
            </figure>

            {entries.length > 0 ? (
                <ol
                    aria-label="Jawaban sebelumnya"
                    className="flex flex-col border-t"
                >
                    {entries.map((entry) => (
                        <li
                            key={entry.id}
                            className="grid grid-cols-[32px_minmax(0,1fr)] gap-x-3 border-b py-3.5 md:grid-cols-[48px_minmax(0,1fr)] md:gap-x-4"
                        >
                            <span className="pt-0.5 font-mono text-xs text-muted-foreground">
                                {entry.number !== null
                                    ? pad(entry.number)
                                    : null}
                            </span>
                            <div className="flex min-w-0 flex-col gap-1">
                                {entry.question ? (
                                    <span className="text-sm leading-normal text-muted-foreground">
                                        {entry.question}
                                    </span>
                                ) : null}
                                {entry.answer ? (
                                    <span className="text-base leading-normal break-words">
                                        {entry.answer}
                                    </span>
                                ) : null}
                            </div>
                        </li>
                    ))}
                </ol>
            ) : null}

            <div className="flex flex-1 flex-col gap-[18px]">
                {activeMessage ? (
                    <QuestionSection
                        question={parseAssistantQuestion(activeMessage.content)}
                        number={activeNumber}
                        ready={readiness.aiReady}
                        selectedExamples={selectedExamples}
                        onToggleExample={onToggleExample}
                    />
                ) : null}

                {isLoading ? (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="size-4 animate-spin text-brand" />
                        {modelLabel(model)} sedang menulis...
                    </p>
                ) : null}

                {/* Below xl the composer is the sticky bottom bar and also
                    carries the generate action; from xl it is an inline
                    card and generating lives in the session panel. */}
                <div className="flex-1 xl:hidden" />
                <div
                    className={cn(
                        'sticky bottom-0 z-10 -mx-4 flex flex-col gap-2.5 border-t bg-card px-4 pt-3 pb-5 md:-mx-8 md:px-8 xl:static xl:mx-0 xl:gap-0 xl:rounded-lg xl:border xl:border-input xl:p-0 xl:focus-within:border-foreground/40 print:hidden',
                        !activeMessage && 'xl:hidden',
                    )}
                >
                    {activeMessage ? (
                        <>
                            <label
                                htmlFor="interview-answer"
                                className="label-mono xl:px-4 xl:pt-3.5"
                            >
                                Jawabanmu
                            </label>
                            <textarea
                                id="interview-answer"
                                rows={3}
                                value={answer}
                                onChange={(event) =>
                                    onAnswerChange(event.target.value)
                                }
                                onKeyDown={(event) => {
                                    if (
                                        (event.metaKey || event.ctrlKey) &&
                                        event.key === 'Enter'
                                    ) {
                                        event.preventDefault();
                                        onSubmitAnswer();
                                    }
                                }}
                                placeholder="Tulis jawabanmu di sini, atau pilih dari opsi di atas..."
                                className="w-full resize-none rounded-md border border-input bg-background px-3 py-2.5 text-base leading-normal outline-none placeholder:text-muted-foreground/80 focus-visible:border-foreground/40 xl:min-h-24 xl:resize-y xl:rounded-none xl:border-0 xl:bg-transparent xl:px-4 xl:py-2"
                            />
                        </>
                    ) : null}
                    <div className="flex items-center justify-between gap-3 xl:border-t xl:py-2.5 xl:pr-2.5 xl:pl-4">
                        {activeMessage ? (
                            <span className="hidden font-mono text-xs text-muted-foreground xl:inline">
                                ⌘/Ctrl + Enter untuk kirim
                            </span>
                        ) : null}
                        <div className="grid flex-1 grid-cols-2 gap-2 xl:flex xl:flex-none">
                            <GenerateButton
                                variant="outline"
                                readiness={readiness}
                                hasPrd={hasPrd}
                                isLoading={isLoading}
                                onGenerate={onGenerate}
                                className={cn(
                                    'h-12 px-3 xl:hidden',
                                    !activeMessage && 'col-span-2',
                                )}
                            />
                            {activeMessage ? (
                                <Button
                                    type="button"
                                    className="h-12 px-3 xl:h-10 xl:px-4"
                                    disabled={isLoading || !canSubmit}
                                    onClick={onSubmitAnswer}
                                >
                                    {isLoading ? (
                                        <Loader2 className="size-4 animate-spin" />
                                    ) : null}
                                    Kirim jawaban
                                    {isLoading ? null : (
                                        <ArrowRight className="size-4" />
                                    )}
                                </Button>
                            ) : null}
                        </div>
                    </div>
                </div>
            </div>

            <div ref={transcriptEndRef} className="-mt-7" />
        </div>
    );
}

function QuestionSection({
    question,
    number,
    ready,
    selectedExamples,
    onToggleExample,
}: {
    question: ParsedAssistantQuestion;
    number: number;
    ready: boolean;
    selectedExamples: string[];
    onToggleExample: (example: string) => void;
}) {
    const headingId = useId();

    return (
        <section
            aria-labelledby={headingId}
            className="flex flex-col gap-4 xl:gap-[18px]"
        >
            <p className="font-mono text-[11px] font-medium tracking-[0.08em] text-brand uppercase xl:text-xs">
                {ready
                    ? 'Informasi sudah cukup'
                    : `Pertanyaan ${pad(number)} / ${pad(RECOMMENDED_ANSWERS)}`}
            </p>
            <h2
                id={headingId}
                className="font-serif text-4xl leading-[1.05] font-normal tracking-[-0.01em] text-balance xl:text-[44px]"
            >
                {question.question}
            </h2>

            {question.note ? (
                <p className="flex gap-3 text-sm leading-normal text-muted-foreground">
                    <span className="shrink-0 pt-0.5 label-mono text-foreground">
                        Kenapa
                    </span>
                    <span>{question.note}</span>
                </p>
            ) : null}

            {question.examples.length ? (
                <div
                    role="group"
                    aria-label="Contoh jawaban"
                    className="flex flex-wrap gap-2"
                >
                    {question.examples.map((example) => {
                        const isSelected = selectedExamples.includes(example);

                        return (
                            <button
                                key={example}
                                type="button"
                                onClick={() => onToggleExample(example)}
                                aria-pressed={isSelected}
                                className={cn(
                                    'flex min-h-11 items-center gap-1.5 rounded-lg border px-3.5 py-1.5 text-left text-sm transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 xl:min-h-9',
                                    isSelected
                                        ? 'border-foreground bg-foreground text-background'
                                        : 'border-input bg-transparent hover:bg-secondary',
                                )}
                            >
                                {isSelected ? (
                                    <Check
                                        aria-hidden="true"
                                        className="size-3.5 shrink-0"
                                        strokeWidth={2}
                                    />
                                ) : null}
                                {example}
                            </button>
                        );
                    })}
                </div>
            ) : null}
        </section>
    );
}

export function InterviewPanel({
    model,
    models,
    areModelsLoading,
    modelError,
    quota,
    answeredQuestions,
    readiness,
    hasPrd,
    isLoading,
    onModelChange,
    onGenerate,
}: {
    model: Model;
    models: AiModelOption[];
    areModelsLoading: boolean;
    modelError: string | null;
    quota: TokenQuota;
    answeredQuestions: number;
    readiness: InterviewReadiness;
    hasPrd: boolean;
    isLoading: boolean;
    onModelChange: (model: Model) => void;
    onGenerate: () => void;
}) {
    return (
        <aside
            aria-label="Sesi wawancara"
            className="flex flex-col border-t bg-panel xl:fixed xl:inset-y-0 xl:right-0 xl:w-[368px] xl:border-t-0 xl:border-l print:hidden"
        >
            <div className="flex flex-col gap-7 px-4 pt-6 pb-5 md:px-8 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:px-7 xl:pt-7">
                <section className="hidden flex-col gap-2.5 xl:flex">
                    <h2 className="label-mono">Progress wawancara</h2>
                    <p className="flex items-baseline gap-2">
                        <span className="font-serif text-[56px] leading-[0.9]">
                            {answeredQuestions}
                        </span>
                        <span className="text-sm text-muted-foreground">
                            / {RECOMMENDED_ANSWERS} jawaban
                        </span>
                    </p>
                    <InterviewProgressBar
                        answeredQuestions={answeredQuestions}
                        decorative
                    />
                </section>

                <section className="flex flex-col gap-2">
                    <label htmlFor="interview-model" className="label-mono">
                        Model
                    </label>
                    <ModelSelect
                        id="interview-model"
                        model={model}
                        models={models}
                        onModelChange={onModelChange}
                        className="h-10 w-full bg-card text-sm"
                    />
                    {areModelsLoading ? (
                        <p className="text-xs text-muted-foreground">
                            Memuat model dari Base URL provider...
                        </p>
                    ) : modelError ? (
                        <p className="text-xs text-destructive">{modelError}</p>
                    ) : null}
                </section>

                <QuotaMeter quota={quota} />

                <section className="hidden flex-col gap-2.5 xl:flex">
                    <h2 className="label-mono">Yang akan ditulis AI</h2>
                    <ol className="flex flex-col border-t text-[13px]">
                        {PRD_SECTIONS.map((title, index) => (
                            <li
                                key={title}
                                className="flex gap-3.5 border-b py-1.5"
                            >
                                <span className="pt-px font-mono text-xs text-muted-foreground">
                                    {pad(index + 1)}
                                </span>
                                {title}
                            </li>
                        ))}
                    </ol>
                </section>
            </div>

            <div className="flex flex-col gap-3 border-t px-4 pt-5 pb-7 md:px-8 xl:px-7">
                <p className="text-[13px] leading-normal text-muted-foreground">
                    {readiness.hint}
                </p>
                <GenerateButton
                    variant="brand"
                    readiness={readiness}
                    hasPrd={hasPrd}
                    isLoading={isLoading}
                    onGenerate={onGenerate}
                    className="hidden h-11 w-full text-[15px] xl:inline-flex"
                />
            </div>
        </aside>
    );
}
