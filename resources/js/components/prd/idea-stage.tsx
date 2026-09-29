import {
    Download,
    Lightbulb,
    Loader2,
    MessageCircle,
    Wand2,
} from 'lucide-react';

import { ModelSelect } from '@/components/prd/model-select';
import { Button } from '@/components/ui/button';
import type { AiModelOption } from '@/hooks/use-ai-models';
import type { Model } from '@/lib/models';

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
