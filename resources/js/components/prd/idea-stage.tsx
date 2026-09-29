import { ArrowRight, Loader2 } from 'lucide-react';

import { ModelSelect } from '@/components/prd/model-select';
import { Button } from '@/components/ui/button';
import type { AiModelOption } from '@/hooks/use-ai-models';
import type { Model } from '@/lib/models';

const PROCESS_STEPS = [
    {
        title: 'Wawancara',
        body: 'Jawab pertanyaan AI satu per satu.',
    },
    {
        title: 'Generate',
        body: 'AI menyusun PRD lengkap otomatis.',
    },
    {
        title: 'Export',
        body: 'Salin atau unduh sebagai Markdown.',
    },
];

export function IdeaStage({
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
        <div className="mx-auto w-full max-w-[760px] pt-8 pb-14 md:pt-12 xl:pt-16">
            <p className="label-mono">Tahap pertama</p>
            <h2 className="mt-3 font-serif text-[44px] leading-none font-normal tracking-[-0.015em] text-balance md:text-[56px]">
                Mulai dari ide produkmu
            </h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
                Ceritakan masalah yang ingin diselesaikan. Workspace akan
                mengajukan pertanyaan penting sebelum menyusun PRD.
            </p>

            <div className="mt-8 flex flex-col rounded-lg border border-input bg-card transition-colors focus-within:border-foreground/40">
                <label
                    htmlFor="idea"
                    className="px-4 pt-3.5 label-mono md:px-5"
                >
                    Ide produk
                </label>
                <textarea
                    id="idea"
                    value={idea}
                    onChange={(event) => onIdeaChange(event.target.value)}
                    placeholder="Contoh: webapp untuk membantu founder mengubah ide mentah menjadi PRD yang siap diberikan ke developer..."
                    className="min-h-44 w-full resize-y bg-transparent px-4 py-2 text-base leading-7 outline-none placeholder:text-muted-foreground/80 md:px-5"
                />

                <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:pr-3 md:pl-5">
                    <div className="flex items-center gap-3">
                        <label htmlFor="idea-model" className="label-mono">
                            Model
                        </label>
                        <ModelSelect
                            id="idea-model"
                            model={model}
                            models={models}
                            onModelChange={onModelChange}
                            className="h-9 w-[210px] bg-background text-[13px]"
                        />
                    </div>
                    <Button
                        type="button"
                        className="h-10 px-4"
                        disabled={!idea.trim() || isLoading}
                        onClick={onStart}
                    >
                        {isLoading ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : null}
                        Mulai wawancara
                        {isLoading ? null : <ArrowRight className="size-4" />}
                    </Button>
                </div>
            </div>
            {areModelsLoading ? (
                <p className="mt-2 text-xs text-muted-foreground">
                    Memuat model dari Base URL provider...
                </p>
            ) : modelError ? (
                <p className="mt-2 max-w-md text-xs text-destructive">
                    {modelError}
                </p>
            ) : null}

            <ol className="mt-12 grid border-t border-foreground sm:grid-cols-3">
                {PROCESS_STEPS.map((step, index) => (
                    <li
                        key={step.title}
                        className="flex gap-4 border-b py-4 sm:flex-col sm:gap-1.5 sm:border-b-0 sm:border-l sm:px-5 sm:first:border-l-0 sm:first:pl-0"
                    >
                        <span className="pt-0.5 font-mono text-xs text-muted-foreground sm:pt-0">
                            {String(index + 1).padStart(2, '0')}
                        </span>
                        <div className="flex flex-col gap-0.5">
                            <p className="text-sm font-medium">{step.title}</p>
                            <p className="text-[13px] leading-normal text-muted-foreground">
                                {step.body}
                            </p>
                        </div>
                    </li>
                ))}
            </ol>
        </div>
    );
}
