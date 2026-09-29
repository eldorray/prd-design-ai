import {
    Check,
    Code2,
    Copy,
    Download,
    Eye,
    FileArchive,
    Layout,
    Loader2,
    Monitor,
    Pencil,
    Smartphone,
    Square,
    Tablet,
} from 'lucide-react';
import {
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef,
    useState,
} from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { EDIT_BRIDGE, highlightHtml, stripEditBridge } from '@/lib/design-html';
import { cn } from '@/lib/utils';
import type { DesignKind, SelectedElement } from '@/types';

export type DesignPreviewHandle = {
    requestHtml: (callback: (html: string) => void) => void;
    updateSelected: (patch: Partial<SelectedElement>) => void;
};

export const PreviewPanel = (() => {
    const Component = ({
        html,
        streamingHtml,
        selectedKinds,
        activeKind,
        onTabChange,
        streaming,
        hasDesign,
        isGenerating,
        activeMode,
        editMode,
        designId,
        viewMode,
        copied,
        onViewModeChange,
        onToggleEdit,
        onDownloadHtml,
        onSelect,
        onSave,
        onCopyCode,
        onStop,
        ref,
    }: {
        html: string;
        streamingHtml: string;
        selectedKinds: DesignKind[];
        activeKind: DesignKind;
        onTabChange: (kind: DesignKind) => void;
        streaming: Partial<Record<DesignKind, string>>;
        hasDesign: boolean;
        isGenerating: boolean;
        activeMode: 'generate' | 'refine';
        editMode: boolean;
        designId: string | null;
        viewMode: 'preview' | 'code';
        copied: boolean;
        onViewModeChange: (mode: 'preview' | 'code') => void;
        onToggleEdit: () => void;
        onDownloadHtml: () => void;
        onSelect: (selected: SelectedElement | null) => void;
        onSave: () => void;
        onCopyCode: () => void;
        onStop: () => void;
        ref: React.Ref<DesignPreviewHandle>;
    }) => {
        const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>(
            'desktop',
        );

        const activeStep = useMemo(() => {
            const lower = streamingHtml.toLowerCase();

            if (lower.includes('<footer') || lower.includes('</html>')) {
                return 4;
            }

            if (lower.includes('<section') || lower.includes('<main')) {
                return 3;
            }

            if (lower.includes('</style>') || lower.includes('<body')) {
                return 2;
            }

            if (lower.includes('<style')) {
                return 1;
            }

            return 0;
        }, [streamingHtml]);

        return (
            <section className="flex min-h-[60vh] flex-col bg-[var(--m3-surface-2)]">
                {selectedKinds.length > 1 ? (
                    <div className="border-border flex shrink-0 items-center gap-1 border-b px-2 py-1.5">
                        {selectedKinds.map((k) => {
                            const labels: Record<DesignKind, string> = {
                                'landing-page': 'Landing',
                                dashboard: 'Dashboard',
                                'mobile-app': 'Mobile',
                            };
                            const isStreaming =
                                typeof streaming[k] === 'string';

                            return (
                                <button
                                    key={k}
                                    type="button"
                                    onClick={() => onTabChange(k)}
                                    aria-pressed={k === activeKind}
                                    className={cn(
                                        'flex min-h-10 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition',
                                        k === activeKind
                                            ? 'bg-[var(--m3-secondary-container)] text-[var(--m3-on-secondary-container)]'
                                            : 'text-[var(--m3-on-surface-var)] hover:bg-[var(--m3-surface-3)]',
                                    )}
                                >
                                    {labels[k]}
                                    {isStreaming ? (
                                        <Loader2 className="size-3 animate-spin" />
                                    ) : null}
                                </button>
                            );
                        })}
                    </div>
                ) : null}
                <div className="border-border bg-background/60 flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 md:px-5">
                    <div className="flex items-center gap-2 text-sm font-medium">
                        {isGenerating ? (
                            <div className="flex items-center gap-3">
                                <span className="flex items-center gap-2">
                                    <span className="relative flex size-2">
                                        <span className="bg-primary/60 absolute inline-flex size-full animate-ping rounded-full" />
                                        <span className="bg-primary relative inline-flex size-2 rounded-full" />
                                    </span>
                                    AI sedang mendesain langsung
                                </span>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={onStop}
                                    className="h-7 gap-1.5 px-2.5 text-xs"
                                >
                                    <Square className="size-3 fill-current" />
                                    Berhenti
                                </Button>
                            </div>
                        ) : hasDesign ? (
                            <div className="border-border bg-muted/50 flex items-center gap-1 rounded-lg border p-0.5">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className={cn(
                                        'h-7 gap-1.5 rounded-md px-3 text-xs',
                                        viewMode === 'preview'
                                            ? 'bg-background text-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground',
                                    )}
                                    onClick={() => onViewModeChange('preview')}
                                    aria-label="Tampilkan pratinjau"
                                >
                                    <Eye className="size-3.5" />
                                    Preview
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className={cn(
                                        'h-7 gap-1.5 rounded-md px-3 text-xs',
                                        viewMode === 'code'
                                            ? 'bg-background text-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground',
                                    )}
                                    onClick={() => onViewModeChange('code')}
                                    aria-label="Tampilkan kode HTML"
                                >
                                    <Code2 className="size-3.5" />
                                    Code
                                </Button>
                            </div>
                        ) : (
                            <>
                                <Eye className="text-primary size-4" />
                                Live preview
                            </>
                        )}
                    </div>

                    {hasDesign && viewMode === 'preview' && (
                        <div className="border-border bg-muted/50 flex items-center gap-1 rounded-lg border p-0.5">
                            {[
                                {
                                    id: 'desktop',
                                    label: 'Desktop',
                                    icon: Monitor,
                                },
                                { id: 'tablet', label: 'Tablet', icon: Tablet },
                                {
                                    id: 'mobile',
                                    label: 'Mobile',
                                    icon: Smartphone,
                                },
                            ].map((d) => {
                                const Icon = d.icon;
                                const isActive = device === d.id;

                                return (
                                    <Button
                                        key={d.id}
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className={cn(
                                            'h-7 w-7 rounded-md p-0',
                                            isActive
                                                ? 'bg-background text-foreground shadow-sm'
                                                : 'text-muted-foreground hover:text-foreground hover:bg-transparent',
                                        )}
                                        onClick={() => setDevice(d.id as any)}
                                        aria-label={d.label}
                                    >
                                        <Icon className="size-4" />
                                    </Button>
                                );
                            })}
                        </div>
                    )}

                    {hasDesign && !isGenerating ? (
                        <div className="flex flex-wrap items-center gap-2">
                            {viewMode === 'preview' ? (
                                <>
                                    <Button
                                        type="button"
                                        variant={
                                            editMode ? 'default' : 'outline'
                                        }
                                        size="sm"
                                        onClick={onToggleEdit}
                                    >
                                        <Pencil className="size-4" />
                                        {editMode
                                            ? 'Selesai edit'
                                            : 'Edit visual'}
                                    </Button>
                                    {editMode && (
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={onSave}
                                        >
                                            <Check className="size-4" />
                                            Simpan
                                        </Button>
                                    )}
                                </>
                            ) : (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={onCopyCode}
                                    className="gap-1.5"
                                >
                                    {copied ? (
                                        <>
                                            <Check className="size-3.5 text-green-500" />
                                            Tersalin
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="size-3.5" />
                                            Salin Kode
                                        </>
                                    )}
                                </Button>
                            )}
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={onDownloadHtml}
                            >
                                <Download className="size-4" />
                                HTML
                            </Button>
                            {designId && viewMode === 'preview' && (
                                <Button type="button" size="sm" asChild>
                                    <a href={`/designs/${designId}/export`}>
                                        <FileArchive className="size-4" />
                                        ZIP
                                    </a>
                                </Button>
                            )}
                        </div>
                    ) : null}
                </div>

                {editMode && hasDesign && !isGenerating ? (
                    <div className="border-primary/20 bg-primary/10 text-foreground flex items-center gap-2 border-b px-4 py-2 text-xs md:px-5">
                        <Code2 className="text-primary size-3.5" />
                        Klik elemen di preview, lalu ubah lewat panel kiri.
                        Tekan Simpan saat selesai.
                    </div>
                ) : null}

                <div
                    className="relative flex flex-1 items-center justify-center overflow-auto bg-neutral-50 p-6 text-neutral-200 dark:bg-neutral-900/10 dark:text-neutral-800"
                    style={{
                        backgroundImage:
                            'radial-gradient(circle, currentColor 1.5px, transparent 1.5px)',
                        backgroundSize: '24px 24px',
                    }}
                >
                    {viewMode === 'code' ? (
                        <div className="border-border size-full max-w-6xl select-text overflow-auto rounded-xl border bg-neutral-950 p-6 font-mono text-xs leading-5 text-neutral-200 shadow-2xl">
                            <pre className="selection:bg-primary selection:text-primary-foreground whitespace-pre-wrap break-all">
                                <code
                                    dangerouslySetInnerHTML={{
                                        __html: highlightHtml(html),
                                    }}
                                />
                            </pre>
                        </div>
                    ) : (
                        <div
                            className={cn(
                                'relative transition-all duration-300 ease-in-out',
                                device === 'desktop' &&
                                    'h-full w-full max-w-full',
                                device === 'tablet' &&
                                    'h-[900px] max-h-full w-[768px] overflow-hidden rounded-[28px] border-[12px] border-neutral-950 bg-white shadow-2xl dark:border-neutral-800',
                                device === 'mobile' &&
                                    'h-[680px] max-h-full w-[375px] overflow-hidden rounded-[28px] border-[12px] border-neutral-950 bg-white shadow-2xl dark:border-neutral-800',
                                !hasDesign &&
                                    'h-full w-full border-0 bg-transparent shadow-none',
                            )}
                        >
                            {/* Mobile/Tablet Speaker and Camera Mockup */}
                            {hasDesign && device !== 'desktop' && (
                                <div className="absolute left-1/2 top-1.5 z-10 flex h-4 w-20 -translate-x-1/2 items-center justify-center gap-1.5 rounded-full border border-neutral-900/50 bg-neutral-950 dark:bg-neutral-800">
                                    <div className="h-1 w-8 rounded-full bg-neutral-800" />
                                    <div className="h-1.5 w-1.5 rounded-full border border-neutral-800 bg-neutral-900" />
                                </div>
                            )}

                            <div
                                className={cn(
                                    'relative h-full w-full',
                                    hasDesign &&
                                        device !== 'desktop' &&
                                        'overflow-hidden rounded-[16px]',
                                )}
                            >
                                {isGenerating && activeMode === 'generate' ? (
                                    <LivePreviewFrame
                                        streamingHtml={streamingHtml}
                                        device={device}
                                    />
                                ) : hasDesign ? (
                                    <>
                                        <PreviewFrame
                                            ref={ref}
                                            html={html}
                                            editMode={editMode}
                                            onSelect={onSelect}
                                            device={device}
                                        />
                                        {isGenerating &&
                                        activeMode === 'refine' ? (
                                            <div className="bg-background/60 absolute inset-0 z-30 flex flex-col items-center justify-center backdrop-blur-sm transition-all duration-300">
                                                <div className="border-border bg-background/90 flex max-w-sm flex-col items-center gap-3 rounded-2xl border p-6 text-center shadow-xl">
                                                    <Loader2 className="text-primary size-8 animate-spin" />
                                                    <div>
                                                        <p className="text-sm font-semibold">
                                                            Memperbarui
                                                            desain...
                                                        </p>
                                                        <p className="text-muted-foreground mt-1 text-xs">
                                                            AI sedang menerapkan
                                                            revisi Anda secara
                                                            presisi. Mohon
                                                            tunggu sebentar.
                                                        </p>
                                                    </div>
                                                    <div className="bg-muted mt-2 h-1 w-full overflow-hidden rounded-full">
                                                        <div
                                                            className="bg-primary h-full transition-all duration-500"
                                                            style={{
                                                                width: `${(activeStep + 1) * 20}%`,
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ) : null}
                                    </>
                                ) : (
                                    <EmptyPreview isGenerating={isGenerating} />
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </section>
        );
    };

    Component.displayName = 'PreviewPanel';

    return Component;
})();

function LivePreviewFrame({
    streamingHtml,
    device,
}: {
    streamingHtml: string;
    device: 'desktop' | 'tablet' | 'mobile';
}) {
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Render the partial HTML as it streams. Browsers render malformed/partial
    // markup fine, so the page visibly builds top-to-bottom.
    useEffect(() => {
        const doc = iframeRef.current?.contentDocument;

        if (!doc) {
            return;
        }

        doc.open();
        doc.write(
            streamingHtml ||
                '<!doctype html><html><body style="margin:0"></body></html>',
        );
        doc.close();

        // Keep the newest content in view as the page grows.
        const win = iframeRef.current?.contentWindow;
        win?.scrollTo({ top: doc.body?.scrollHeight ?? 0, behavior: 'smooth' });
    }, [streamingHtml]);

    return (
        <div
            className={cn(
                'relative h-full overflow-hidden bg-white transition-all duration-300 dark:bg-neutral-950',
                device === 'desktop'
                    ? 'border-primary/30 ring-primary/20 rounded-xl border shadow-sm ring-2'
                    : '',
            )}
        >
            <iframe
                ref={iframeRef}
                title="Live building preview"
                sandbox="allow-same-origin"
                className="size-full"
            />
            {!streamingHtml ? (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80">
                    <div className="text-muted-foreground flex items-center gap-2 text-sm">
                        <Loader2 className="text-primary size-4 animate-spin" />
                        Menyiapkan kanvas...
                    </div>
                </div>
            ) : null}
        </div>
    );
}

function EmptyPreview({ isGenerating }: { isGenerating: boolean }) {
    return (
        <div className="flex h-full items-center justify-center">
            <div className="max-w-sm text-center">
                <div className="bg-primary/10 text-primary mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl">
                    {isGenerating ? (
                        <Loader2 className="size-6 animate-spin" />
                    ) : (
                        <Layout className="size-6" />
                    )}
                </div>
                <h2 className="text-lg font-semibold">
                    {isGenerating
                        ? 'AI sedang membangun design...'
                        : 'Preview muncul di sini'}
                </h2>
                <p className="text-muted-foreground mt-2 text-sm">
                    {isGenerating
                        ? 'Ikuti langkahnya di panel kiri. Sebentar lagi selesai.'
                        : 'Tulis deskripsi design di panel kiri, lalu klik Generate. Hasilnya tampil langsung di sini.'}
                </p>
            </div>
        </div>
    );
}

const PreviewFrame = (() => {
    const Component = ({
        html,
        editMode,
        onSelect,
        device,
        ref,
    }: {
        html: string;
        editMode: boolean;
        onSelect: (selected: SelectedElement | null) => void;
        device: 'desktop' | 'tablet' | 'mobile';
        ref: React.Ref<DesignPreviewHandle>;
    }) => {
        const iframeRef = useRef<HTMLIFrameElement>(null);
        const htmlCallbackRef = useRef<((html: string) => void) | null>(null);
        // Mirrors the editMode prop for the message listener, which must not
        // re-register on every toggle just to see the current value.
        const editModeRef = useRef(editMode);

        useEffect(() => {
            editModeRef.current = editMode;
        }, [editMode]);

        const srcDoc = useMemo(() => {
            // Never stack a second bridge on top of one already baked into a
            // saved document — always start from a clean copy.
            const base = stripEditBridge(html);
            const bodyEndIndex = base.toLowerCase().lastIndexOf('</body>');

            if (bodyEndIndex !== -1) {
                return (
                    base.substring(0, bodyEndIndex) +
                    EDIT_BRIDGE +
                    base.substring(bodyEndIndex)
                );
            }

            return base + EDIT_BRIDGE;
        }, [html]);

        useImperativeHandle(ref, () => ({
            requestHtml: (callback) => {
                htmlCallbackRef.current = callback;
                iframeRef.current?.contentWindow?.postMessage(
                    { type: 'request-html' },
                    '*',
                );
            },
            updateSelected: (patch) => {
                iframeRef.current?.contentWindow?.postMessage(
                    { type: 'update-selected', payload: patch },
                    '*',
                );
            },
        }));

        useEffect(() => {
            const handler = (event: MessageEvent) => {
                // Only trust messages from this specific preview iframe —
                // any other window/tab embedding the page must not be able to
                // inject designs, selections, or saved HTML.
                if (event.source !== iframeRef.current?.contentWindow) {
                    return;
                }

                const data = event.data as {
                    type?: string;
                    html?: string;
                    payload?: SelectedElement;
                    text?: string;
                    href?: string;
                };

                if (
                    data?.type === 'html-result' &&
                    typeof data.html === 'string'
                ) {
                    htmlCallbackRef.current?.(data.html);
                    htmlCallbackRef.current = null;
                }

                if (data?.type === 'element-selected' && data.payload) {
                    onSelect(data.payload);
                }

                if (data?.type === 'iframe-ready') {
                    const isDark =
                        document.documentElement.classList.contains('dark');
                    iframeRef.current?.contentWindow?.postMessage(
                        { type: 'set-theme', value: isDark ? 'dark' : 'light' },
                        '*',
                    );

                    // The iframe was just (re)built: any set-edit sent while it
                    // was loading was dropped. Re-sync the current mode so
                    // visual editing keeps working after saves/version switches.
                    iframeRef.current?.contentWindow?.postMessage(
                        { type: 'set-edit', value: editModeRef.current },
                        '*',
                    );
                }

                if (data?.type === 'link-clicked') {
                    const isAnchor = data.href?.indexOf('#') === 0;

                    if (isAnchor && data.href !== '#' && data.href !== '#/') {
                        toast.info(
                            `Bagian "${data.href}" tidak ditemukan pada pratinjau ini.`,
                        );
                    } else {
                        toast.info(
                            `Halaman "${data.text || 'Menu'}" (${data.href || '#'}) belum dibuat (Simulasi).`,
                        );
                    }
                }

                if (data?.type === 'form-submitted') {
                    toast.info('Pengiriman formulir hanya simulasi pratinjau.');
                }
            };

            window.addEventListener('message', handler);

            return () => window.removeEventListener('message', handler);
        }, [onSelect]);

        useEffect(() => {
            iframeRef.current?.contentWindow?.postMessage(
                { type: 'set-edit', value: editMode },
                '*',
            );
        }, [editMode, srcDoc]);

        useEffect(() => {
            const syncTheme = () => {
                const isDark =
                    document.documentElement.classList.contains('dark');
                iframeRef.current?.contentWindow?.postMessage(
                    { type: 'set-theme', value: isDark ? 'dark' : 'light' },
                    '*',
                );
            };

            const observer = new MutationObserver(syncTheme);
            observer.observe(document.documentElement, {
                attributes: true,
                attributeFilter: ['class'],
            });

            // Initial sync
            syncTheme();

            return () => observer.disconnect();
        }, [srcDoc]);

        // Keep selection highlight in sync when edit mode toggles off.
        useEffect(() => {
            if (!editMode) {
                onSelect(null);
            }
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [editMode]);

        return (
            <div
                className={cn(
                    'h-full overflow-hidden bg-white transition dark:bg-neutral-950',
                    device === 'desktop'
                        ? cn(
                              'rounded-xl border shadow-sm',
                              editMode
                                  ? 'border-primary/40 ring-primary/20 ring-2'
                                  : 'border-border',
                          )
                        : 'rounded-none border-0 shadow-none ring-0',
                )}
            >
                <iframe
                    key={html}
                    ref={iframeRef}
                    title="Live preview"
                    srcDoc={srcDoc}
                    sandbox="allow-scripts"
                    className="size-full"
                />
            </div>
        );
    };

    Component.displayName = 'PreviewFrame';

    return Component;
})();
