import {
    ArrowLeft,
    Loader2,
    MessageCircle,
    Send,
    Sparkles,
    Wand2,
} from 'lucide-react';

import { ModelSelect } from '@/components/prd/model-select';
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

export function InterviewStage({
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
    // The model emits [SIAP_GENERATE] once it has heard enough.
    const activeMessage = messages.find(
        (message) => message.id === activeQuestionId,
    );
    const aiReady = activeMessage
        ? isReadyToGenerate(activeMessage.content)
        : false;
    const generateEnabled = canGenerate || aiReady;

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
                                ready={aiReady}
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
                        {modelLabel(model)} sedang menulis...
                    </div>
                ) : null}

                <div ref={transcriptEndRef} />
            </div>

            <div className="m3-interview-action sticky bottom-4 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-muted-foreground text-xs">
                        {aiReady
                            ? 'AI menilai informasinya sudah cukup. Buat PRD sekarang, atau tetap jawab untuk menambah detail.'
                            : canGenerate
                              ? remaining > 0
                                  ? `Sudah cukup untuk membuat PRD. Tambah ${remaining} jawaban lagi untuk hasil lebih lengkap.`
                                  : 'Wawancara lengkap. Saatnya membuat PRD.'
                              : 'Jawab minimal 2 pertanyaan sebelum membuat PRD.'}
                    </p>
                    <Button
                        type="button"
                        disabled={!generateEnabled || isLoading}
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
    ready,
    answer,
    selectedExamples,
    isLoading,
    onAnswerChange,
    onToggleExample,
    onSubmit,
    canSubmit,
}: {
    question: ParsedAssistantQuestion;
    ready: boolean;
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
                {ready ? (
                    <Sparkles className="size-4" />
                ) : (
                    <MessageCircle className="size-4" />
                )}
                {ready ? 'Informasi sudah cukup' : 'Pertanyaan berikutnya'}
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
