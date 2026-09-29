import { Head, router } from '@inertiajs/react';
import { RefreshCw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import AiSettingController from '@/actions/App/Http/Controllers/Admin/AiSettingController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type ProviderRow = {
    id: string;
    name: string;
    slug: string;
    base_url: string;
    has_key: boolean;
    is_active: boolean;
    supports_thinking: boolean;
    model_count: number;
    models_synced_at: string | null;
};

type PromptRow = {
    id: string;
    scope: 'prd' | 'design';
    label: string;
    content: string;
    is_active: boolean;
};

type Props = {
    providers: ProviderRow[];
    prompts: PromptRow[];
};

// label-mono sorts before the Label primitive's own text utilities, so the
// conflicting ones are overridden explicitly.
const fieldLabelClasses = 'label-mono text-[11px] leading-[1.4] font-normal';
const dialogTitleClasses = 'font-serif text-[28px] leading-tight font-normal';
const monoBadgeClasses =
    'h-5 gap-1.5 px-1.5 font-mono text-[11px] font-normal tracking-[0.04em] uppercase';

export default function AiSettings({ providers, prompts }: Props) {
    // --- Provider form ---
    const [showProviderDialog, setShowProviderDialog] = useState(false);
    const [form, setForm] = useState({
        name: '',
        slug: '',
        base_url: '',
        api_key: '',
        supports_thinking: false,
    });
    const [savingProvider, setSavingProvider] = useState(false);

    // --- Model loader ---
    const [loadingModelsFor, setLoadingModelsFor] = useState<string | null>(
        null,
    );
    const [loadedModels, setLoadedModels] = useState<Record<string, string[]>>(
        {},
    );

    // --- Prompt form ---
    const [showPromptDialog, setShowPromptDialog] = useState(false);
    const [promptForm, setPromptForm] = useState({
        scope: 'prd',
        label: '',
        content: '',
    });
    const [savingPrompt, setSavingPrompt] = useState(false);

    // --- Delete confirmation ---
    const [deletingProvider, setDeletingProvider] =
        useState<ProviderRow | null>(null);
    const [deletingPrompt, setDeletingPrompt] = useState<PromptRow | null>(
        null,
    );

    const saveProvider = async () => {
        setSavingProvider(true);

        try {
            await router.post(AiSettingController.storeProvider.url(), form, {
                preserveScroll: true,
            });
            setShowProviderDialog(false);
            setForm({
                name: '',
                slug: '',
                base_url: '',
                api_key: '',
                supports_thinking: false,
            });
        } finally {
            setSavingProvider(false);
        }
    };

    const toggleProviderActive = (
        provider: ProviderRow,
        is_active: boolean,
    ) => {
        router.put(
            AiSettingController.updateProvider.url(provider.id),
            {
                name: provider.name,
                base_url: provider.base_url,
                api_key: '',
                is_active,
                supports_thinking: provider.supports_thinking,
            },
            { preserveScroll: true },
        );
    };

    const loadModels = async (provider: ProviderRow) => {
        setLoadingModelsFor(provider.id);

        try {
            const response = await fetch(
                AiSettingController.models.url(provider.id),
                {
                    headers: { Accept: 'application/json' },
                },
            );

            const data = (await response.json()) as {
                models?: string[];
                message?: string;
            };

            if (!response.ok || !data.models) {
                toast.error(data.message ?? 'Gagal memuat model.');

                return;
            }

            setLoadedModels((current) => ({
                ...current,
                [provider.id]: data.models ?? [],
            }));
            toast.success(
                `${data.models?.length ?? 0} model dimuat dari ${provider.name}.`,
            );
        } catch {
            toast.error('Tidak bisa terhubung ke server.');
        } finally {
            setLoadingModelsFor(null);
        }
    };

    const savePrompt = async () => {
        setSavingPrompt(true);

        try {
            await router.post(
                AiSettingController.storePrompt.url(),
                promptForm,
                {
                    preserveScroll: true,
                },
            );
            setShowPromptDialog(false);
            setPromptForm({ scope: 'prd', label: '', content: '' });
        } finally {
            setSavingPrompt(false);
        }
    };

    const togglePromptActive = (prompt: PromptRow) => {
        router.put(
            AiSettingController.updatePrompt.url(prompt.id),
            {
                scope: prompt.scope,
                label: prompt.label,
                content: prompt.content,
                is_active: !prompt.is_active,
            },
            { preserveScroll: true },
        );
    };

    return (
        <>
            <Head title="Pengaturan AI" />

            <div className="flex flex-col gap-7 px-6 py-8 md:px-12 md:py-9">
                <header className="flex flex-col gap-2.5">
                    <span className="label-mono">Admin</span>
                    <h1 className="font-serif text-[44px] leading-none font-normal tracking-[-0.015em] md:text-[52px]">
                        Pengaturan AI
                    </h1>
                    <p className="text-[15px] text-muted-foreground">
                        Kelola provider model, kunci API, dan injeksi prompt.
                    </p>
                </header>

                {/* Providers */}
                <section
                    aria-labelledby="providers-title"
                    className="overflow-hidden rounded-xl border border-border bg-card"
                >
                    <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3.5 lg:pl-6">
                        <div className="min-w-0">
                            <h2
                                id="providers-title"
                                className="text-base font-semibold"
                            >
                                Provider
                            </h2>
                            <p className="text-[13px] text-muted-foreground">
                                Base URL dan API key per provider. Model dimuat
                                langsung dari{' '}
                                <code className="font-mono text-xs">{`{base_url}/models`}</code>
                                .
                            </p>
                        </div>
                        <Button
                            size="sm"
                            onClick={() => setShowProviderDialog(true)}
                        >
                            Tambah provider
                        </Button>
                    </div>
                    {providers.length === 0 ? (
                        <p className="border-t border-border px-6 py-10 text-center text-sm text-muted-foreground">
                            Belum ada provider. Aplikasi memakai konfigurasi
                            default dari .env (deepseek, gemini, tokenrouter).
                        </p>
                    ) : (
                        <ul>
                            {providers.map((provider) => (
                                <li
                                    key={provider.id}
                                    className="border-t border-border px-4 py-4 lg:px-6"
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="font-medium">
                                                    {provider.name}
                                                </p>
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        monoBadgeClasses,
                                                        provider.is_active
                                                            ? 'border-input text-foreground'
                                                            : 'text-muted-foreground',
                                                    )}
                                                >
                                                    {provider.is_active && (
                                                        <span
                                                            aria-hidden="true"
                                                            className="size-1.5 rounded-full bg-lime-700 dark:bg-lime-400"
                                                        />
                                                    )}
                                                    {provider.is_active
                                                        ? 'Aktif'
                                                        : 'Nonaktif'}
                                                </Badge>
                                                {provider.supports_thinking ? (
                                                    <Badge
                                                        variant="outline"
                                                        className={cn(
                                                            monoBadgeClasses,
                                                            'text-muted-foreground',
                                                        )}
                                                    >
                                                        thinking
                                                    </Badge>
                                                ) : null}
                                            </div>
                                            <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                                                {provider.base_url}
                                            </p>
                                            <p className="mt-0.5 text-xs text-muted-foreground">
                                                Key:{' '}
                                                {provider.has_key
                                                    ? 'tersimpan'
                                                    : 'belum diset'}
                                                {' · '}
                                                {provider.models_synced_at
                                                    ? `${provider.model_count} model, disinkron ${new Date(provider.models_synced_at).toLocaleString('id-ID')}`
                                                    : 'model belum disinkron'}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                checked={provider.is_active}
                                                onCheckedChange={(
                                                    value: boolean,
                                                ) =>
                                                    toggleProviderActive(
                                                        provider,
                                                        value,
                                                    )
                                                }
                                                aria-label={`Aktifkan ${provider.name}`}
                                            />
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                disabled={
                                                    loadingModelsFor ===
                                                    provider.id
                                                }
                                                onClick={() =>
                                                    loadModels(provider)
                                                }
                                            >
                                                <RefreshCw
                                                    className={`size-4 ${loadingModelsFor === provider.id ? 'animate-spin' : ''}`}
                                                    strokeWidth={1.75}
                                                />
                                                Muat model
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                onClick={() =>
                                                    setDeletingProvider(
                                                        provider,
                                                    )
                                                }
                                                aria-label={`Hapus ${provider.name}`}
                                            >
                                                <Trash2
                                                    className="size-4"
                                                    strokeWidth={1.75}
                                                />
                                            </Button>
                                        </div>
                                    </div>

                                    {loadedModels[provider.id] ? (
                                        <div className="mt-3 flex flex-wrap gap-1.5">
                                            {loadedModels[provider.id].map(
                                                (model) => (
                                                    <Badge
                                                        key={model}
                                                        variant="outline"
                                                        className="bg-background font-mono text-[11px] font-normal text-muted-foreground"
                                                    >
                                                        {model}
                                                    </Badge>
                                                ),
                                            )}
                                        </div>
                                    ) : null}
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                {/* Prompt injections */}
                <section
                    aria-labelledby="prompts-title"
                    className="overflow-hidden rounded-xl border border-border bg-card"
                >
                    <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3.5 lg:pl-6">
                        <div className="min-w-0">
                            <h2
                                id="prompts-title"
                                className="text-base font-semibold"
                            >
                                Injeksi Prompt
                            </h2>
                            <p className="text-[13px] text-muted-foreground">
                                Instruksi tambahan yang disisipkan ke system
                                prompt setiap generate PRD atau design.
                            </p>
                        </div>
                        <Button
                            size="sm"
                            onClick={() => setShowPromptDialog(true)}
                        >
                            Tambah injeksi
                        </Button>
                    </div>
                    {prompts.length === 0 ? (
                        <p className="border-t border-border px-6 py-10 text-center text-sm text-muted-foreground">
                            Belum ada injeksi prompt.
                        </p>
                    ) : (
                        <ul>
                            {prompts.map((prompt) => (
                                <li
                                    key={prompt.id}
                                    className="border-t border-border px-4 py-4 lg:px-6"
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        monoBadgeClasses,
                                                        'text-muted-foreground',
                                                    )}
                                                >
                                                    {prompt.scope === 'prd'
                                                        ? 'PRD'
                                                        : 'Design'}
                                                </Badge>
                                                <p className="font-medium">
                                                    {prompt.label}
                                                </p>
                                            </div>
                                            <pre className="mt-2 max-h-24 overflow-y-auto rounded-md border border-border bg-background p-3 font-mono text-xs whitespace-pre-wrap text-muted-foreground">
                                                {prompt.content}
                                            </pre>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                checked={prompt.is_active}
                                                onCheckedChange={() =>
                                                    togglePromptActive(prompt)
                                                }
                                                aria-label={`Aktifkan ${prompt.label}`}
                                            />
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                onClick={() =>
                                                    setDeletingPrompt(prompt)
                                                }
                                                aria-label={`Hapus ${prompt.label}`}
                                            >
                                                <Trash2
                                                    className="size-4"
                                                    strokeWidth={1.75}
                                                />
                                            </Button>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>

            {/* Add provider dialog */}
            <Dialog
                open={showProviderDialog}
                onOpenChange={setShowProviderDialog}
            >
                <DialogContent className="bg-card">
                    <DialogHeader>
                        <DialogTitle className={dialogTitleClasses}>
                            Tambah provider
                        </DialogTitle>
                        <DialogDescription>
                            Provider harus kompatibel dengan OpenAI API
                            (endpoint{' '}
                            <code className="font-mono text-xs">
                                /chat/completions
                            </code>{' '}
                            dan{' '}
                            <code className="font-mono text-xs">/models</code>
                            ).
                        </DialogDescription>
                        <DialogDescription className="font-mono text-xs">
                            Contoh base URL: https://api.deepseek.com ·
                            https://api.tokenrouter.com/v1
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-1">
                        <div className="grid gap-2">
                            <Label
                                htmlFor="provider-name"
                                className={fieldLabelClasses}
                            >
                                Nama
                            </Label>
                            <Input
                                id="provider-name"
                                value={form.name}
                                onChange={(e) =>
                                    setForm({ ...form, name: e.target.value })
                                }
                                placeholder="DeepSeek"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label
                                htmlFor="provider-slug"
                                className={fieldLabelClasses}
                            >
                                Slug
                            </Label>
                            <Input
                                id="provider-slug"
                                className="font-mono"
                                value={form.slug}
                                onChange={(e) =>
                                    setForm({ ...form, slug: e.target.value })
                                }
                                placeholder="deepseek"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label
                                htmlFor="provider-url"
                                className={fieldLabelClasses}
                            >
                                Base URL
                            </Label>
                            <Input
                                id="provider-url"
                                className="font-mono"
                                value={form.base_url}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        base_url: e.target.value,
                                    })
                                }
                                placeholder="https://api.deepseek.com"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label
                                htmlFor="provider-key"
                                className={fieldLabelClasses}
                            >
                                API key
                            </Label>
                            <Input
                                id="provider-key"
                                type="password"
                                className="font-mono"
                                value={form.api_key}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        api_key: e.target.value,
                                    })
                                }
                                placeholder="sk-..."
                            />
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                            <Switch
                                id="provider-thinking"
                                checked={form.supports_thinking}
                                onCheckedChange={(value: boolean) =>
                                    setForm({
                                        ...form,
                                        supports_thinking: value,
                                    })
                                }
                            />
                            <Label
                                htmlFor="provider-thinking"
                                className="font-normal"
                            >
                                Mendukung opsi thinking/reasoning
                            </Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowProviderDialog(false)}
                            disabled={savingProvider}
                        >
                            Batal
                        </Button>
                        <Button
                            onClick={saveProvider}
                            disabled={
                                savingProvider ||
                                !form.name ||
                                !form.slug ||
                                !form.base_url
                            }
                        >
                            Simpan
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add prompt dialog */}
            <Dialog open={showPromptDialog} onOpenChange={setShowPromptDialog}>
                <DialogContent className="bg-card">
                    <DialogHeader>
                        <DialogTitle className={dialogTitleClasses}>
                            Tambah injeksi prompt
                        </DialogTitle>
                        <DialogDescription>
                            Teks ini disisipkan sebagai system prompt tambahan
                            pada setiap permintaan generate.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-1">
                        <div className="grid gap-2">
                            <Label
                                htmlFor="prompt-scope"
                                className={fieldLabelClasses}
                            >
                                Berlaku untuk
                            </Label>
                            <select
                                id="prompt-scope"
                                value={promptForm.scope}
                                onChange={(e) =>
                                    setPromptForm({
                                        ...promptForm,
                                        scope: e.target.value,
                                    })
                                }
                                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                            >
                                <option value="prd">PRD Generator</option>
                                <option value="design">Design Studio</option>
                            </select>
                        </div>
                        <div className="grid gap-2">
                            <Label
                                htmlFor="prompt-label"
                                className={fieldLabelClasses}
                            >
                                Label
                            </Label>
                            <Input
                                id="prompt-label"
                                value={promptForm.label}
                                onChange={(e) =>
                                    setPromptForm({
                                        ...promptForm,
                                        label: e.target.value,
                                    })
                                }
                                placeholder="Selalu pakai bahasa Indonesia formal"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label
                                htmlFor="prompt-content"
                                className={fieldLabelClasses}
                            >
                                Isi prompt
                            </Label>
                            <Textarea
                                id="prompt-content"
                                value={promptForm.content}
                                onChange={(e) =>
                                    setPromptForm({
                                        ...promptForm,
                                        content: e.target.value,
                                    })
                                }
                                placeholder="Tulis instruksi tambahan di sini..."
                                className="min-h-28 font-mono text-[13px]"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowPromptDialog(false)}
                            disabled={savingPrompt}
                        >
                            Batal
                        </Button>
                        <Button
                            onClick={savePrompt}
                            disabled={
                                savingPrompt ||
                                !promptForm.label ||
                                !promptForm.content
                            }
                        >
                            Simpan
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete confirmations */}
            <Dialog
                open={deletingProvider !== null}
                onOpenChange={(open) => !open && setDeletingProvider(null)}
            >
                <DialogContent className="bg-card">
                    <DialogHeader>
                        <DialogTitle className={dialogTitleClasses}>
                            Hapus provider?
                        </DialogTitle>
                        <DialogDescription>
                            {deletingProvider?.name} akan dihapus dari daftar.
                            Model dari provider ini tidak akan tersedia lagi.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDeletingProvider(null)}
                        >
                            Batal
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                if (deletingProvider) {
                                    router.delete(
                                        AiSettingController.destroyProvider.url(
                                            deletingProvider.id,
                                        ),
                                        { preserveScroll: true },
                                    );
                                    setDeletingProvider(null);
                                }
                            }}
                        >
                            Hapus
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={deletingPrompt !== null}
                onOpenChange={(open) => !open && setDeletingPrompt(null)}
            >
                <DialogContent className="bg-card">
                    <DialogHeader>
                        <DialogTitle className={dialogTitleClasses}>
                            Hapus injeksi prompt?
                        </DialogTitle>
                        <DialogDescription>
                            "{deletingPrompt?.label}" akan berhenti disisipkan
                            ke permintaan generate.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDeletingPrompt(null)}
                        >
                            Batal
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                if (deletingPrompt) {
                                    router.delete(
                                        AiSettingController.destroyPrompt.url(
                                            deletingPrompt.id,
                                        ),
                                        { preserveScroll: true },
                                    );
                                    setDeletingPrompt(null);
                                }
                            }}
                        >
                            Hapus
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
