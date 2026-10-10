import {
    AlertCircle,
    Check,
    FileText,
    ImagePlus,
    Pencil,
    Square,
    Wand2,
    X,
} from 'lucide-react';
import { toast } from 'sonner';

import { Inspector } from '@/components/design/inspector';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { AiModelOption } from '@/hooks/use-ai-models';
import { modelLabel } from '@/lib/models';
import type { Model } from '@/lib/models';
import { cn } from '@/lib/utils';
import type { DesignKind, SelectedElement } from '@/types';

export type DesignVersion = {
    index: number;
    messageIndex: number;
    description: string;
    html: string;
};

const KINDS: { value: DesignKind; label: string; title: string }[] = [
    { value: 'landing-page', label: 'Landing', title: 'Landing page' },
    { value: 'dashboard', label: 'Dashboard', title: 'Dashboard' },
    { value: 'mobile-app', label: 'Mobile', title: 'Mobile app mockup' },
];

export const GENERATE_STEPS = [
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

// Scrollable body between the panel header and the pinned action footer.
/** What the server accepts as a reference screenshot. */
const REFERENCE_IMAGE_TYPES = [
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
];

const BODY_CLASS =
    'flex flex-col gap-5 px-4 py-5 md:px-6 lg:min-h-0 lg:flex-1 lg:overflow-y-auto';

export function PromptPanel({
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
    versions: DesignVersion[];
    currentVersionIndex: number | null;
    onSelectVersion: (index: number) => void;
}) {
    // When editing, the left panel becomes the property inspector.
    if (editMode && hasDesign && !isGenerating) {
        return (
            <div className="flex flex-col lg:min-h-0 lg:flex-1">
                <div className={BODY_CLASS}>
                    <Inspector
                        selected={selected}
                        onUpdate={onUpdateSelected}
                    />
                </div>
            </div>
        );
    }

    const handlePaste = (e: React.ClipboardEvent) => {
        const file = e.clipboardData?.files?.[0];

        if (file && REFERENCE_IMAGE_TYPES.includes(file.type)) {
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

        if (file && !REFERENCE_IMAGE_TYPES.includes(file.type)) {
            toast.error(
                'Gambar referensi harus berupa PNG, JPEG, WebP, atau GIF.',
            );
            e.target.value = '';

            return;
        }

        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                onImageChange(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const prdWordCount = fromPrd
        ? fromPrd.content.trim().split(/\s+/).filter(Boolean).length
        : 0;
    const showExampleButton = !hasDesign;
    const showUploadButton = !image;

    return (
        <div className="flex flex-col lg:min-h-0 lg:flex-1">
            <div className={BODY_CLASS}>
                {fromPrd && !hasDesign ? (
                    <div className="flex flex-col gap-2">
                        <span className="label-mono">
                            Konteks PRD terhubung
                        </span>
                        <div className="flex items-center gap-3 rounded-lg border border-input bg-card py-2.5 pr-1.5 pl-3">
                            <FileText
                                className="size-5 shrink-0 text-brand"
                                aria-hidden="true"
                            />
                            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                                <span
                                    className="truncate text-sm font-medium"
                                    title={fromPrd.title}
                                >
                                    {fromPrd.title}
                                </span>
                                <span className="font-mono text-[11px] text-muted-foreground">
                                    PRD · {prdWordCount} kata
                                </span>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
                                onClick={onClearPrdContext}
                                aria-label="Lepas konteks PRD"
                            >
                                <X className="size-4" />
                            </Button>
                        </div>
                    </div>
                ) : null}

                {hasDesign && initialPrompt ? (
                    <div className="flex flex-col gap-2">
                        <span className="label-mono">Prompt awal</span>
                        <p
                            className="line-clamp-3 rounded-lg border border-border bg-card px-3 py-2.5 text-[13px] leading-5"
                            title={initialPrompt}
                        >
                            {initialPrompt}
                        </p>
                    </div>
                ) : null}

                <fieldset className="flex flex-col gap-2">
                    <legend className="mb-2 p-0 label-mono">
                        Jenis halaman
                    </legend>
                    <div className="grid grid-cols-3 gap-1.5">
                        {KINDS.map((item) => {
                            const isActive = selectedKinds.includes(item.value);

                            return (
                                <label
                                    key={item.value}
                                    title={item.title}
                                    className={cn(
                                        'flex h-11 cursor-pointer items-center gap-1.5 rounded-lg border px-2 text-xs transition-colors has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50 has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50',
                                        isActive
                                            ? 'border-foreground bg-card font-medium'
                                            : 'border-input hover:bg-card',
                                    )}
                                >
                                    <input
                                        type="checkbox"
                                        checked={isActive}
                                        onChange={() =>
                                            onToggleKind(item.value)
                                        }
                                        disabled={isGenerating}
                                        className="m-0 size-3.5 shrink-0 accent-foreground outline-none"
                                    />
                                    <span className="truncate">
                                        {item.label}
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                </fieldset>

                <div className="flex flex-col gap-2">
                    <label htmlFor="design-prompt" className="label-mono">
                        {hasDesign
                            ? 'Minta revisi atau tambahan fitur'
                            : 'Deskripsi design'}
                    </label>
                    <textarea
                        id="design-prompt"
                        value={prompt}
                        onChange={(event) => onPromptChange(event.target.value)}
                        onPaste={handlePaste}
                        placeholder={
                            hasDesign
                                ? 'Contoh: ganti warna utama jadi biru, tambah bagian harga, atau buat header lebih modern...'
                                : EXAMPLE_PROMPTS[selectedKinds[0]]
                        }
                        disabled={isGenerating}
                        className="min-h-36 w-full resize-none rounded-lg border border-input bg-card p-3 text-sm leading-6 transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 disabled:opacity-60"
                    />

                    {showExampleButton || showUploadButton ? (
                        <div className="flex items-center justify-between gap-3">
                            {showExampleButton ? (
                                <button
                                    type="button"
                                    onClick={() =>
                                        onPromptChange(
                                            EXAMPLE_PROMPTS[selectedKinds[0]],
                                        )
                                    }
                                    disabled={isGenerating}
                                    className="h-8 rounded-sm text-xs whitespace-nowrap underline decoration-foreground/40 underline-offset-4 transition-colors outline-none hover:decoration-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
                                >
                                    Gunakan contoh prompt
                                </button>
                            ) : null}

                            {showUploadButton ? (
                                <label
                                    title="Unggah screenshot (opsional) / Tempel gambar"
                                    className="ml-auto flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-foreground/25 px-2.5 text-xs whitespace-nowrap transition-colors hover:bg-card has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50 has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50"
                                >
                                    <ImagePlus
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                    Unggah screenshot
                                    <span className="sr-only">
                                        {' '}
                                        (opsional) / Tempel gambar
                                    </span>
                                    <input
                                        type="file"
                                        accept={REFERENCE_IMAGE_TYPES.join(',')}
                                        className="sr-only"
                                        disabled={isGenerating}
                                        onChange={handleImageUpload}
                                    />
                                </label>
                            ) : null}
                        </div>
                    ) : null}

                    {image ? (
                        <div className="flex items-center gap-3 rounded-lg border border-input bg-card py-2 pr-1.5 pl-2">
                            <img
                                src={image}
                                alt="Screenshot preview"
                                className="size-12 shrink-0 rounded-md border border-border object-cover"
                            />
                            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                                <span className="truncate text-sm font-medium">
                                    Screenshot terlampir
                                </span>
                                <span className="font-mono text-[11px] text-muted-foreground">
                                    Siap dikirim ke AI
                                </span>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-8 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => onImageChange(null)}
                                aria-label="Hapus gambar"
                            >
                                <X className="size-4" />
                            </Button>
                        </div>
                    ) : null}
                </div>

                <div className="flex flex-col gap-2">
                    <label htmlFor="design-model" className="label-mono">
                        Model
                    </label>
                    <Select
                        value={model}
                        onValueChange={(value) => onModelChange(value as Model)}
                        disabled={isGenerating || models.length === 0}
                    >
                        <SelectTrigger
                            id="design-model"
                            className="w-full bg-card shadow-none data-[size=default]:h-10 dark:bg-card dark:hover:bg-card"
                            aria-label="Pilih model AI"
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {models.map((option) => (
                                <SelectItem key={option.id} value={option.id}>
                                    {modelLabel(option.id)} ·{' '}
                                    {option.provider_name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {areModelsLoading ? (
                        <p className="font-mono text-[11px] text-muted-foreground">
                            Memuat model dari Base URL provider...
                        </p>
                    ) : modelError ? (
                        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-[13px] text-destructive">
                            {modelError}
                        </p>
                    ) : null}
                </div>

                {image &&
                (model.startsWith('deepseek') || model === 'MiniMax-M3') ? (
                    <div className="flex items-start gap-2.5 rounded-lg border border-amber-600/25 bg-amber-500/10 px-3 py-2.5 text-[13px] leading-5 text-amber-950 dark:text-amber-100">
                        <AlertCircle
                            className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-400"
                            aria-hidden="true"
                        />
                        <span>
                            Model DeepSeek tidak mendukung input gambar. Silakan
                            ganti ke model Gemini (misal:{' '}
                            <strong className="font-mono text-xs font-medium">
                                gemini-3.5-flash
                            </strong>
                            ) agar AI dapat melihat screenshot Anda.
                        </span>
                    </div>
                ) : null}

                {hasDesign && versions.length > 0 ? (
                    <div className="flex flex-col gap-2">
                        <label htmlFor="design-version" className="label-mono">
                            Riwayat Revisi ({versions.length})
                        </label>
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
                            <SelectTrigger
                                id="design-version"
                                className="w-full bg-card shadow-none data-[size=default]:h-10 dark:bg-card dark:hover:bg-card"
                            >
                                <SelectValue placeholder="Pilih Versi" />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                                {versions.map((v) => (
                                    <SelectItem
                                        key={v.index}
                                        value={String(v.index)}
                                    >
                                        <span className="mr-1 font-mono text-xs">
                                            v{v.index + 1}
                                        </span>
                                        <span className="inline-block max-w-[200px] truncate align-bottom">
                                            {v.description}
                                        </span>
                                        {v.index === versions.length - 1 && (
                                            <span className="ml-1 font-mono text-[11px] text-muted-foreground">
                                                (Terbaru)
                                            </span>
                                        )}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                ) : null}

                {isGenerating ? <BuildSteps activeStep={activeStep} /> : null}
            </div>

            <div className="flex shrink-0 flex-col gap-2 border-t border-border px-4 pt-4 pb-5 md:px-6">
                {error ? (
                    <div
                        role="alert"
                        className="mb-1 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-[13px] leading-5 text-destructive"
                    >
                        {error}
                    </div>
                ) : null}

                {isGenerating ? (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onStop}
                        className="h-11 w-full border-foreground bg-transparent"
                    >
                        <Square className="size-3.5 fill-current" />
                        Berhenti
                    </Button>
                ) : hasDesign ? (
                    <>
                        <Button
                            type="button"
                            variant="brand"
                            disabled={!prompt.trim() || isGenerating}
                            onClick={onRefine}
                            className="h-11 w-full"
                        >
                            <Pencil className="size-4" />
                            Terapkan revisi
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={!prompt.trim() || isGenerating}
                            onClick={onGenerate}
                            className="h-10 w-full bg-card"
                        >
                            <Wand2 className="size-4" />
                            Buat ulang dari awal
                        </Button>
                    </>
                ) : (
                    <Button
                        type="button"
                        variant="brand"
                        disabled={!prompt.trim() || isGenerating}
                        onClick={onGenerate}
                        className="h-11 w-full"
                    >
                        <Wand2 className="size-4" />
                        Generate design
                    </Button>
                )}
            </div>
        </div>
    );
}

function BuildSteps({ activeStep }: { activeStep: number }) {
    const position = Math.min(activeStep + 1, GENERATE_STEPS.length);

    return (
        <section
            aria-live="polite"
            className="flex flex-col gap-3 rounded-lg bg-panel p-4"
        >
            <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">
                    AI sedang membangun design
                </span>
                <span className="font-mono text-xs text-muted-foreground tabular-nums">
                    {position} / {GENERATE_STEPS.length}
                </span>
            </div>
            <ol className="flex flex-col gap-2 text-[13px]">
                {GENERATE_STEPS.map((step, index) => {
                    const isDone = index < activeStep;
                    const isActive = index === activeStep;

                    return (
                        <li
                            key={step}
                            className={cn(
                                'flex items-center gap-2.5',
                                isActive
                                    ? 'font-medium text-foreground'
                                    : 'text-muted-foreground',
                            )}
                        >
                            {isDone ? (
                                <>
                                    <Check
                                        className="size-4 shrink-0 text-foreground"
                                        strokeWidth={2}
                                        aria-hidden="true"
                                    />
                                    <span className="sr-only">selesai:</span>
                                </>
                            ) : isActive ? (
                                <span
                                    aria-hidden="true"
                                    className="mx-0.5 size-3 shrink-0 animate-spin rounded-full border-2 border-brand border-t-transparent"
                                />
                            ) : (
                                <span
                                    aria-hidden="true"
                                    className="mx-0.5 size-3 shrink-0 rounded-full border-[1.5px] border-input"
                                />
                            )}
                            {step}
                        </li>
                    );
                })}
            </ol>
        </section>
    );
}
