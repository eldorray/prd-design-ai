import { Head, router } from '@inertiajs/react';
import { Plug, RefreshCw, Sparkles, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import AiSettingController from '@/actions/App/Http/Controllers/Admin/AiSettingController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

type ProviderRow = {
    id: string;
    name: string;
    slug: string;
    base_url: string;
    has_key: boolean;
    is_active: boolean;
    supports_thinking: boolean;
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
    const [loadingModelsFor, setLoadingModelsFor] = useState<string | null>(null);
    const [loadedModels, setLoadedModels] = useState<Record<string, string[]>>({});

    // --- Prompt form ---
    const [showPromptDialog, setShowPromptDialog] = useState(false);
    const [promptForm, setPromptForm] = useState({
        scope: 'prd',
        label: '',
        content: '',
    });
    const [savingPrompt, setSavingPrompt] = useState(false);

    // --- Delete confirmation ---
    const [deletingProvider, setDeletingProvider] = useState<ProviderRow | null>(null);
    const [deletingPrompt, setDeletingPrompt] = useState<PromptRow | null>(null);

    const saveProvider = async () => {
        setSavingProvider(true);

        try {
            await router.post(AiSettingController.storeProvider.url(), form, {
                preserveScroll: true,
            });
            setShowProviderDialog(false);
            setForm({ name: '', slug: '', base_url: '', api_key: '', supports_thinking: false });
        } finally {
            setSavingProvider(false);
        }
    };

    const toggleProviderActive = (provider: ProviderRow, is_active: boolean) => {
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
            toast.success(`${data.models?.length ?? 0} model dimuat dari ${provider.name}.`);
        } catch {
            toast.error('Tidak bisa terhubung ke server.');
        } finally {
            setLoadingModelsFor(null);
        }
    };

    const savePrompt = async () => {
        setSavingPrompt(true);

        try {
            await router.post(AiSettingController.storePrompt.url(), promptForm, {
                preserveScroll: true,
            });
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

            <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-lg font-semibold">Pengaturan AI</h1>
                        <p className="text-sm text-muted-foreground">
                            Kelola provider model, kunci API, dan injeksi prompt.
                        </p>
                    </div>
                </div>

                {/* Providers */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Plug className="size-4 text-primary" />
                                Provider
                            </CardTitle>
                            <CardDescription>
                                Base URL dan API key per provider. Model dimuat
                                langsung dari <code>{`{base_url}/models`}</code>.
                            </CardDescription>
                        </div>
                        <Button size="sm" onClick={() => setShowProviderDialog(true)}>
                            Tambah provider
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {providers.length === 0 ? (
                            <p className="py-6 text-center text-sm text-muted-foreground">
                                Belum ada provider. Aplikasi memakai konfigurasi
                                default dari .env (deepseek, gemini, tokenrouter).
                            </p>
                        ) : (
                            providers.map((provider) => (
                                <div
                                    key={provider.id}
                                    className="rounded-lg border border-border p-4"
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium">
                                                    {provider.name}
                                                </p>
                                                <Badge variant={provider.is_active ? 'default' : 'secondary'}>
                                                    {provider.is_active ? 'Aktif' : 'Nonaktif'}
                                                </Badge>
                                                {provider.supports_thinking ? (
                                                    <Badge variant="outline">thinking</Badge>
                                                ) : null}
                                            </div>
                                            <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                                                {provider.base_url}
                                            </p>
                                            <p className="mt-0.5 text-xs text-muted-foreground">
                                                Key: {provider.has_key ? 'tersimpan' : 'belum diset'}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                checked={provider.is_active}
                                                onCheckedChange={(value: boolean) =>
                                                    toggleProviderActive(provider, value)
                                                }
                                                aria-label={`Aktifkan ${provider.name}`}
                                            />
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                disabled={loadingModelsFor === provider.id}
                                                onClick={() => loadModels(provider)}
                                            >
                                                <RefreshCw
                                                    className={`size-4 ${loadingModelsFor === provider.id ? 'animate-spin' : ''}`}
                                                />
                                                Muat model
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-destructive"
                                                onClick={() => setDeletingProvider(provider)}
                                                aria-label={`Hapus ${provider.name}`}
                                            >
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    {loadedModels[provider.id] ? (
                                        <div className="mt-3 flex flex-wrap gap-1.5">
                                            {loadedModels[provider.id].map((model) => (
                                                <Badge key={model} variant="secondary" className="font-mono text-xs">
                                                    {model}
                                                </Badge>
                                            ))}
                                        </div>
                                    ) : null}
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

                {/* Prompt injections */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Sparkles className="size-4 text-primary" />
                                Injeksi Prompt
                            </CardTitle>
                            <CardDescription>
                                Instruksi tambahan yang disisipkan ke system prompt
                                setiap generate PRD atau design.
                            </CardDescription>
                        </div>
                        <Button size="sm" onClick={() => setShowPromptDialog(true)}>
                            Tambah injeksi
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {prompts.length === 0 ? (
                            <p className="py-6 text-center text-sm text-muted-foreground">
                                Belum ada injeksi prompt.
                            </p>
                        ) : (
                            prompts.map((prompt) => (
                                <div
                                    key={prompt.id}
                                    className="rounded-lg border border-border p-4"
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline">
                                                    {prompt.scope === 'prd' ? 'PRD' : 'Design'}
                                                </Badge>
                                                <p className="font-medium">{prompt.label}</p>
                                            </div>
                                            <pre className="mt-2 max-h-24 overflow-y-auto whitespace-pre-wrap rounded bg-muted/40 p-2 font-mono text-xs text-muted-foreground">
                                                {prompt.content}
                                            </pre>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                checked={prompt.is_active}
                                                onCheckedChange={() => togglePromptActive(prompt)}
                                                aria-label={`Aktifkan ${prompt.label}`}
                                            />
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-destructive"
                                                onClick={() => setDeletingPrompt(prompt)}
                                                aria-label={`Hapus ${prompt.label}`}
                                            >
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Add provider dialog */}
            <Dialog open={showProviderDialog} onOpenChange={setShowProviderDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Tambah provider</DialogTitle>
                        <DialogDescription>
                            Provider harus kompatibel dengan OpenAI API
                            (endpoint <code>/chat/completions</code> dan{' '}
                            <code>/models</code>).
                        </DialogDescription>
                        <DialogDescription>
                            Contoh base URL: https://api.deepseek.com ·
                            https://api.tokenrouter.com/v1
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div>
                            <Label htmlFor="provider-name">Nama</Label>
                            <Input
                                id="provider-name"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                placeholder="DeepSeek"
                            />
                        </div>
                        <div>
                            <Label htmlFor="provider-slug">Slug</Label>
                            <Input
                                id="provider-slug"
                                value={form.slug}
                                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                                placeholder="deepseek"
                            />
                        </div>
                        <div>
                            <Label htmlFor="provider-url">Base URL</Label>
                            <Input
                                id="provider-url"
                                value={form.base_url}
                                onChange={(e) => setForm({ ...form, base_url: e.target.value })}
                                placeholder="https://api.deepseek.com"
                            />
                        </div>
                        <div>
                            <Label htmlFor="provider-key">API key</Label>
                            <Input
                                id="provider-key"
                                type="password"
                                value={form.api_key}
                                onChange={(e) => setForm({ ...form, api_key: e.target.value })}
                                placeholder="sk-..."
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Switch
                                id="provider-thinking"
                                checked={form.supports_thinking}
                                onCheckedChange={(value: boolean) =>
                                    setForm({ ...form, supports_thinking: value })
                                }
                            />
                            <Label htmlFor="provider-thinking">
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
                            disabled={savingProvider || !form.name || !form.slug || !form.base_url}
                        >
                            Simpan
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add prompt dialog */}
            <Dialog open={showPromptDialog} onOpenChange={setShowPromptDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Tambah injeksi prompt</DialogTitle>
                        <DialogDescription>
                            Teks ini disisipkan sebagai system prompt tambahan
                            pada setiap permintaan generate.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div>
                            <Label htmlFor="prompt-scope">Berlaku untuk</Label>
                            <select
                                id="prompt-scope"
                                value={promptForm.scope}
                                onChange={(e) =>
                                    setPromptForm({ ...promptForm, scope: e.target.value })
                                }
                                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                            >
                                <option value="prd">PRD Generator</option>
                                <option value="design">Design Studio</option>
                            </select>
                        </div>
                        <div>
                            <Label htmlFor="prompt-label">Label</Label>
                            <Input
                                id="prompt-label"
                                value={promptForm.label}
                                onChange={(e) =>
                                    setPromptForm({ ...promptForm, label: e.target.value })
                                }
                                placeholder="Selalu pakai bahasa Indonesia formal"
                            />
                        </div>
                        <div>
                            <Label htmlFor="prompt-content">Isi prompt</Label>
                            <Textarea
                                id="prompt-content"
                                value={promptForm.content}
                                onChange={(e) =>
                                    setPromptForm({ ...promptForm, content: e.target.value })
                                }
                                placeholder="Tulis instruksi tambahan di sini..."
                                className="min-h-28"
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
                            disabled={savingPrompt || !promptForm.label || !promptForm.content}
                        >
                            Simpan
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete confirmations */}
            <Dialog open={deletingProvider !== null} onOpenChange={(open) => !open && setDeletingProvider(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Hapus provider?</DialogTitle>
                        <DialogDescription>
                            {deletingProvider?.name} akan dihapus dari daftar. Model
                            dari provider ini tidak akan tersedia lagi.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeletingProvider(null)}>
                            Batal
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                if (deletingProvider) {
                                    router.delete(
                                        AiSettingController.destroyProvider.url(deletingProvider.id),
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

            <Dialog open={deletingPrompt !== null} onOpenChange={(open) => !open && setDeletingPrompt(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Hapus injeksi prompt?</DialogTitle>
                        <DialogDescription>
                            "{deletingPrompt?.label}" akan berhenti disisipkan ke
                            permintaan generate.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeletingPrompt(null)}>
                            Batal
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                if (deletingPrompt) {
                                    router.delete(
                                        AiSettingController.destroyPrompt.url(deletingPrompt.id),
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
