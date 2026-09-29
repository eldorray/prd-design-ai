import {
    AlertCircle,
    Check,
    ChevronLeft,
    ChevronRight,
    Code2,
    Copy,
    Download,
    Eye,
    FileArchive,
    Monitor,
    MousePointerClick,
    PanelsTopLeft,
    Pencil,
    Smartphone,
    Square,
    Tablet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef,
    useState,
} from 'react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';

import { GENERATE_STEPS } from '@/components/design/prompt-panel';
import type { DesignVersion } from '@/components/design/prompt-panel';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { EDIT_BRIDGE, highlightHtml, stripEditBridge } from '@/lib/design-html';
import { cn } from '@/lib/utils';
import type { DesignKind, SelectedElement } from '@/types';

export type DesignPreviewHandle = {
    requestHtml: (callback: (html: string) => void) => void;
    updateSelected: (patch: Partial<SelectedElement>) => void;
};

type Device = 'desktop' | 'tablet' | 'mobile';

const KIND_LABELS: Record<DesignKind, string> = {
    'landing-page': 'Landing',
    dashboard: 'Dashboard',
    'mobile-app': 'Mobile',
};

const DEVICES: { id: Device; label: string; icon: LucideIcon }[] = [
    { id: 'desktop', label: 'Desktop', icon: Monitor },
    { id: 'tablet', label: 'Tablet', icon: Tablet },
    { id: 'mobile', label: 'Mobile', icon: Smartphone },
];

// Soft, long drop shadow shared by the preview frame and floating cards.
const FRAME_SHADOW = 'shadow-[0_30px_60px_-30px_rgb(0_0_0/0.35)]';

const FOCUS_RING =
    'focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]';

const TOOLBAR_BUTTON_CLASS = cn(
    'flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm transition-colors disabled:pointer-events-none disabled:opacity-40',
    FOCUS_RING,
);

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
        versions,
        currentVersionIndex,
        onSelectVersion,
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
        versions: DesignVersion[];
        currentVersionIndex: number | null;
        onSelectVersion: (index: number) => void;
        onViewModeChange: (mode: 'preview' | 'code') => void;
        onToggleEdit: () => void;
        onDownloadHtml: () => void;
        onSelect: (selected: SelectedElement | null) => void;
        onSave: () => void;
        onCopyCode: () => void;
        onStop: () => void;
        ref: React.Ref<DesignPreviewHandle>;
    }) => {
        const [device, setDevice] = useState<Device>('desktop');

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

        const isViewingOldVersion =
            hasDesign &&
            currentVersionIndex !== null &&
            currentVersionIndex < versions.length - 1;
        const hasZipExport = Boolean(designId) && viewMode === 'preview';
        const showFrame =
            hasDesign || (isGenerating && activeMode === 'generate');
        // With no design yet the live frame always fills the canvas.
        const frameDevice: Device = hasDesign ? device : 'desktop';

        const frameContent =
            isGenerating && activeMode === 'generate' ? (
                <LivePreviewFrame streamingHtml={streamingHtml} />
            ) : (
                <>
                    <PreviewFrame
                        ref={ref}
                        html={html}
                        editMode={editMode}
                        onSelect={onSelect}
                    />
                    {isGenerating && activeMode === 'refine' ? (
                        <RefineOverlay activeStep={activeStep} />
                    ) : null}
                </>
            );

        return (
            <main className="flex min-h-[60vh] min-w-0 flex-col lg:min-h-0">
                <div className="flex min-h-[72px] shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border px-4 py-3 md:px-5">
                    <div
                        role="group"
                        aria-label="Halaman"
                        className="flex flex-wrap items-center gap-1"
                    >
                        {selectedKinds.map((k) => {
                            const isActive = k === activeKind;
                            const isStreaming =
                                typeof streaming[k] === 'string';

                            return (
                                <button
                                    key={k}
                                    type="button"
                                    onClick={() => onTabChange(k)}
                                    aria-pressed={isActive}
                                    className={cn(
                                        TOOLBAR_BUTTON_CLASS,
                                        'gap-2 px-3',
                                        isActive
                                            ? 'bg-secondary font-medium text-foreground'
                                            : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                                    )}
                                >
                                    {isStreaming ? (
                                        <span
                                            aria-hidden="true"
                                            className="size-1.5 shrink-0 animate-pulse rounded-full bg-brand"
                                        />
                                    ) : null}
                                    {KIND_LABELS[k]}
                                </button>
                            );
                        })}
                    </div>

                    {hasDesign && viewMode === 'preview' ? (
                        <div
                            role="group"
                            aria-label="Perangkat"
                            className="flex gap-0.5 rounded-xl border border-input p-[3px]"
                        >
                            {DEVICES.map((d) => {
                                const isActive = device === d.id;

                                return (
                                    <IconTooltip key={d.id} label={d.label}>
                                        <button
                                            type="button"
                                            onClick={() => setDevice(d.id)}
                                            aria-label={d.label}
                                            aria-pressed={isActive}
                                            className={cn(
                                                'flex h-[30px] w-9 items-center justify-center rounded-[5px] transition-colors',
                                                FOCUS_RING,
                                                isActive
                                                    ? 'bg-foreground text-background'
                                                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                                            )}
                                        >
                                            <d.icon
                                                className="size-4"
                                                strokeWidth={1.75}
                                            />
                                        </button>
                                    </IconTooltip>
                                );
                            })}
                        </div>
                    ) : null}

                    {hasDesign || isGenerating ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                            {hasDesign && versions.length > 0 ? (
                                <VersionSwitcher
                                    versions={versions}
                                    currentVersionIndex={currentVersionIndex}
                                    onSelectVersion={onSelectVersion}
                                    disabled={isGenerating}
                                />
                            ) : null}

                            {isGenerating ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={onStop}
                                    className="ml-1 h-9 border-foreground bg-transparent"
                                >
                                    <Square className="size-3 fill-current" />
                                    Berhenti
                                </Button>
                            ) : hasDesign ? (
                                <>
                                    <span
                                        aria-hidden="true"
                                        className="mx-1.5 h-5 w-px bg-input"
                                    />
                                    {viewMode === 'preview' ? (
                                        <button
                                            type="button"
                                            onClick={onToggleEdit}
                                            aria-pressed={editMode}
                                            className={cn(
                                                TOOLBAR_BUTTON_CLASS,
                                                editMode
                                                    ? 'bg-secondary font-medium text-foreground'
                                                    : 'hover:bg-accent',
                                            )}
                                        >
                                            <Pencil
                                                className="size-4"
                                                strokeWidth={1.75}
                                            />
                                            {editMode
                                                ? 'Selesai edit'
                                                : 'Edit visual'}
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={onCopyCode}
                                            className={cn(
                                                TOOLBAR_BUTTON_CLASS,
                                                'hover:bg-accent',
                                            )}
                                        >
                                            {copied ? (
                                                <>
                                                    <Check className="size-4" />
                                                    Tersalin
                                                </>
                                            ) : (
                                                <>
                                                    <Copy
                                                        className="size-4"
                                                        strokeWidth={1.75}
                                                    />
                                                    Salin Kode
                                                </>
                                            )}
                                        </button>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() =>
                                            onViewModeChange(
                                                viewMode === 'preview'
                                                    ? 'code'
                                                    : 'preview',
                                            )
                                        }
                                        className={cn(
                                            TOOLBAR_BUTTON_CLASS,
                                            'hover:bg-accent',
                                        )}
                                    >
                                        {viewMode === 'preview' ? (
                                            <>
                                                <Code2
                                                    className="size-4"
                                                    strokeWidth={1.75}
                                                />
                                                Kode
                                            </>
                                        ) : (
                                            <>
                                                <Eye
                                                    className="size-4"
                                                    strokeWidth={1.75}
                                                />
                                                Preview
                                            </>
                                        )}
                                    </button>

                                    <div
                                        role="group"
                                        aria-label="Unduh"
                                        className="flex h-9 items-center rounded-lg border border-input"
                                    >
                                        <button
                                            type="button"
                                            onClick={onDownloadHtml}
                                            className={cn(
                                                TOOLBAR_BUTTON_CLASS,
                                                'h-full rounded-[5px] px-3 hover:bg-accent',
                                                hasZipExport &&
                                                    'rounded-r-none',
                                            )}
                                        >
                                            <Download
                                                className="size-4"
                                                strokeWidth={1.75}
                                            />
                                            HTML
                                        </button>
                                        {hasZipExport ? (
                                            <>
                                                <span
                                                    aria-hidden="true"
                                                    className="h-4 w-px bg-input"
                                                />
                                                <a
                                                    href={`/designs/${designId}/export`}
                                                    className={cn(
                                                        TOOLBAR_BUTTON_CLASS,
                                                        'h-full rounded-[5px] rounded-l-none px-3 hover:bg-accent',
                                                    )}
                                                >
                                                    <FileArchive
                                                        className="size-4"
                                                        strokeWidth={1.75}
                                                    />
                                                    ZIP
                                                </a>
                                            </>
                                        ) : null}
                                    </div>

                                    {editMode && viewMode === 'preview' ? (
                                        <Button
                                            type="button"
                                            onClick={onSave}
                                            className="ml-1 h-9 px-4"
                                        >
                                            <Check className="size-4" />
                                            Simpan
                                        </Button>
                                    ) : null}
                                </>
                            ) : null}
                        </div>
                    ) : null}
                </div>

                {isViewingOldVersion ? (
                    <div className="flex items-start gap-2.5 border-b border-amber-600/20 bg-amber-500/10 px-4 py-2.5 text-[13px] leading-5 text-amber-950 md:px-5 dark:text-amber-100">
                        <AlertCircle
                            className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-400"
                            aria-hidden="true"
                        />
                        <p>
                            <span className="font-medium">
                                Melihat Versi Lama
                            </span>
                            <span className="opacity-80">
                                {' '}
                                · Membuat revisi atau menyimpan visual dari sini
                                akan memulai cabang baru. Versi setelah ini akan
                                dihapus.
                            </span>
                        </p>
                    </div>
                ) : null}

                {editMode && hasDesign && !isGenerating ? (
                    <div className="flex items-center gap-2 border-b border-border bg-panel px-4 py-2 text-[13px] text-muted-foreground md:px-5">
                        <MousePointerClick
                            className="size-4 shrink-0"
                            strokeWidth={1.75}
                            aria-hidden="true"
                        />
                        Klik elemen di preview, lalu ubah lewat panel kiri.
                        Tekan Simpan saat selesai.
                    </div>
                ) : null}

                <div className="relative flex min-h-0 flex-1 flex-col">
                    {isGenerating ? (
                        <StreamingPill activeStep={activeStep} />
                    ) : null}

                    <div
                        className={cn(
                            'flex min-h-0 flex-1 items-center-safe justify-center-safe overflow-auto bg-muted bg-[radial-gradient(var(--color-input)_1px,transparent_1px)] bg-[size:20px_20px] p-4 md:p-7',
                            isGenerating && 'pt-16 md:pt-[72px]',
                        )}
                    >
                        {viewMode === 'code' ? (
                            <div
                                className={cn(
                                    'size-full max-w-6xl overflow-auto rounded-xl border border-border bg-primary p-6 font-mono text-xs leading-5 text-primary-foreground select-text dark:bg-card dark:text-card-foreground',
                                    FRAME_SHADOW,
                                )}
                            >
                                <pre className="break-all whitespace-pre-wrap">
                                    <code
                                        dangerouslySetInnerHTML={{
                                            __html: highlightHtml(html),
                                        }}
                                    />
                                </pre>
                            </div>
                        ) : showFrame ? (
                            <DeviceFrame
                                device={frameDevice}
                                fileName={`${activeKind}.html`}
                                highlighted={editMode && hasDesign}
                            >
                                {frameContent}
                            </DeviceFrame>
                        ) : (
                            <EmptyPreview isGenerating={isGenerating} />
                        )}
                    </div>
                </div>
            </main>
        );
    };

    Component.displayName = 'PreviewPanel';

    return Component;
})();

function IconTooltip({
    label,
    children,
}: {
    label: string;
    children: ReactNode;
}) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>{children}</TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
        </Tooltip>
    );
}

function VersionSwitcher({
    versions,
    currentVersionIndex,
    onSelectVersion,
    disabled,
}: {
    versions: DesignVersion[];
    currentVersionIndex: number | null;
    onSelectVersion: (index: number) => void;
    disabled: boolean;
}) {
    const isLatest =
        currentVersionIndex === null ||
        currentVersionIndex === versions.length - 1;
    const chevronClass = cn(
        'flex size-8 items-center justify-center rounded-lg transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-35',
        FOCUS_RING,
    );

    return (
        <div
            role="group"
            aria-label="Versi"
            className="flex items-center gap-0.5 font-mono text-xs"
        >
            <IconTooltip label="Versi sebelumnya">
                <button
                    type="button"
                    className={chevronClass}
                    disabled={
                        currentVersionIndex === null ||
                        currentVersionIndex === 0 ||
                        disabled
                    }
                    onClick={() => onSelectVersion(currentVersionIndex! - 1)}
                    aria-label="Versi sebelumnya"
                >
                    <ChevronLeft className="size-4" strokeWidth={1.75} />
                </button>
            </IconTooltip>
            <span className="px-1 whitespace-nowrap tabular-nums">
                v{currentVersionIndex !== null ? currentVersionIndex + 1 : 1}
                {isLatest ? ' · Terbaru' : ''}
            </span>
            <IconTooltip label="Versi berikutnya">
                <button
                    type="button"
                    className={chevronClass}
                    disabled={
                        currentVersionIndex === null ||
                        currentVersionIndex === versions.length - 1 ||
                        disabled
                    }
                    onClick={() => onSelectVersion(currentVersionIndex! + 1)}
                    aria-label="Versi berikutnya"
                >
                    <ChevronRight className="size-4" strokeWidth={1.75} />
                </button>
            </IconTooltip>
        </div>
    );
}

function StreamingPill({ activeStep }: { activeStep: number }) {
    return (
        <div
            role="status"
            className="pointer-events-none absolute top-4 left-1/2 z-20 flex h-9 max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-2.5 rounded-full bg-foreground px-4 text-[13px] whitespace-nowrap text-background md:top-5"
        >
            <span
                aria-hidden="true"
                className="size-[7px] shrink-0 animate-pulse rounded-full bg-brand ring-4 ring-brand/30"
            />
            AI sedang mendesain langsung
            <span
                aria-hidden="true"
                className="hidden truncate text-background/60 sm:inline"
            >
                · {GENERATE_STEPS[activeStep]}
            </span>
        </div>
    );
}

function DeviceFrame({
    device,
    fileName,
    highlighted,
    children,
}: {
    device: Device;
    fileName: string;
    highlighted: boolean;
    children: ReactNode;
}) {
    const isDesktop = device === 'desktop';

    // One stable element tree for every device: the content slot must keep
    // its position so switching device never remounts the preview iframe
    // (which would drop unsaved visual edits).
    return (
        <div
            className={cn(
                'relative flex flex-col border border-input bg-card transition-shadow',
                FRAME_SHADOW,
                isDesktop
                    ? 'size-full overflow-hidden rounded-xl'
                    : 'max-h-full shrink-0 rounded-[28px] px-2.5 pt-6 pb-2.5',
                device === 'tablet' && 'h-[900px] w-[768px]',
                device === 'mobile' && 'h-[680px] w-[375px]',
                highlighted && 'ring-2 ring-foreground/15',
            )}
        >
            {isDesktop ? (
                <div className="flex h-8 shrink-0 items-center gap-1.5 border-b border-border px-3">
                    <span
                        aria-hidden="true"
                        className="size-2 rounded-full bg-input"
                    />
                    <span
                        aria-hidden="true"
                        className="size-2 rounded-full bg-input"
                    />
                    <span
                        aria-hidden="true"
                        className="size-2 rounded-full bg-input"
                    />
                    <span className="ml-3 truncate font-mono text-[11px] text-muted-foreground">
                        pratinjau · {fileName}
                    </span>
                </div>
            ) : (
                <span
                    aria-hidden="true"
                    className="absolute top-2.5 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-input"
                />
            )}
            <div
                className={cn(
                    'relative min-h-0 flex-1',
                    !isDesktop &&
                        'overflow-hidden rounded-[18px] border border-border',
                )}
            >
                {children}
            </div>
        </div>
    );
}

function RefineOverlay({ activeStep }: { activeStep: number }) {
    return (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/60 p-4 backdrop-blur-[2px]">
            <div
                className={cn(
                    'flex w-full max-w-sm flex-col items-center gap-3 rounded-xl border border-border bg-card p-6 text-center',
                    FRAME_SHADOW,
                )}
            >
                <span
                    aria-hidden="true"
                    className="size-6 animate-spin rounded-full border-2 border-brand border-t-transparent"
                />
                <div>
                    <p className="font-serif text-2xl leading-tight">
                        Memperbarui desain...
                    </p>
                    <p className="mt-1.5 text-[13px] leading-5 text-muted-foreground">
                        AI sedang menerapkan revisi Anda secara presisi. Mohon
                        tunggu sebentar.
                    </p>
                </div>
                <div className="mt-1 h-1 w-full overflow-hidden bg-input">
                    <div
                        className="h-full bg-brand transition-[width] duration-500"
                        style={{
                            width: `${(activeStep + 1) * 20}%`,
                        }}
                    />
                </div>
            </div>
        </div>
    );
}

function LivePreviewFrame({ streamingHtml }: { streamingHtml: string }) {
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
        <div className="relative h-full overflow-hidden bg-white dark:bg-neutral-950">
            <iframe
                ref={iframeRef}
                title="Live building preview"
                sandbox="allow-same-origin"
                className="size-full"
            />
            {!streamingHtml ? (
                <div className="absolute inset-0 flex items-center justify-center bg-card">
                    <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                        <span
                            aria-hidden="true"
                            className="size-3.5 animate-spin rounded-full border-2 border-brand border-t-transparent"
                        />
                        Menyiapkan kanvas...
                    </div>
                </div>
            ) : null}
        </div>
    );
}

function EmptyPreview({ isGenerating }: { isGenerating: boolean }) {
    return (
        <div className="flex max-w-sm flex-col items-center rounded-xl border border-dashed border-input bg-card/80 px-8 py-10 text-center">
            <span className="mb-5 flex size-11 items-center justify-center rounded-lg border border-input text-muted-foreground">
                {isGenerating ? (
                    <span
                        aria-hidden="true"
                        className="size-4 animate-spin rounded-full border-2 border-brand border-t-transparent"
                    />
                ) : (
                    <PanelsTopLeft
                        className="size-5"
                        strokeWidth={1.75}
                        aria-hidden="true"
                    />
                )}
            </span>
            <h2 className="font-serif text-3xl leading-tight">
                {isGenerating
                    ? 'AI sedang membangun design...'
                    : 'Preview muncul di sini'}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {isGenerating
                    ? 'Ikuti langkahnya di panel kiri. Sebentar lagi selesai.'
                    : 'Tulis deskripsi design di panel kiri, lalu klik Generate. Hasilnya tampil langsung di sini.'}
            </p>
        </div>
    );
}

const PreviewFrame = (() => {
    const Component = ({
        html,
        editMode,
        onSelect,
        ref,
    }: {
        html: string;
        editMode: boolean;
        onSelect: (selected: SelectedElement | null) => void;
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
            <div className="h-full overflow-hidden bg-white dark:bg-neutral-950">
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
