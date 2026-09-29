import {
    AlertCircle,
    Check,
    ChevronLeft,
    ChevronRight,
    FileText,
    History,
    Layout,
    LayoutDashboard,
    Loader2,
    Pencil,
    Smartphone,
    Sparkles,
    Square,
    Upload,
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
