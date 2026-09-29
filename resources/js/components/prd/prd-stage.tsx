import { Link } from '@inertiajs/react';
import {
    Copy,
    Download,
    FilePlus2,
    History,
    LayoutTemplate,
    Loader2,
    Printer,
    RefreshCw,
    Undo2,
    Wand2,
} from 'lucide-react';
import type { MouseEvent } from 'react';

import { PrdSectionContent } from '@/components/prd/prd-document';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { PrdCompleteness } from '@/lib/prd-completeness';
import { parsePrdSections } from '@/lib/prd-parser';
import { cn } from '@/lib/utils';
import { index as designIndex } from '@/routes/design';
import type { PrdVersionSummary } from '@/types';

function formatVersionTime(value: string) {
    return new Date(value).toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
}

const pad = (value: number) => String(value).padStart(2, '0');

/** Anchor id of a document section, shared by the sheet and the outline. */
const sectionAnchor = (index: number) => `prd-section-${index + 1}`;

/**
 * The document's title (its first heading) and the sections under it. Both
 * the sheet and the table of contents read from this, so their numbering
 * and anchors always agree.
 */
function prdOutline(prd: string) {
    const sections = parsePrdSections(prd);

    return {
        title: sections[0]?.title ?? 'PRD',
        sections: sections.length > 1 ? sections.slice(1) : sections.slice(0),
    };
}

/**
 * Copy / Markdown / PDF / design hand-off. `compact` hides the labels below
 * 2xl so the row fits the top bar next to the stepper.
 */
export function PrdActions({
    prdId,
    isStreaming,
    compact = false,
    onCopy,
    onExport,
    onPrint,
    className,
}: {
    prdId: string | null;
    isStreaming: boolean;
    compact?: boolean;
    onCopy: () => void;
    onExport: () => void;
    onPrint: () => void;
    className?: string;
}) {
    if (isStreaming) {
        return (
            <p
                className={cn(
                    'flex items-center gap-2 text-sm text-muted-foreground print:hidden',
                    className,
                )}
            >
                <Loader2 className="size-4 animate-spin text-brand" />
                AI sedang menulis PRD...
            </p>
        );
    }

    const label = (text: string) => (
        <span className={compact ? 'sr-only 2xl:not-sr-only' : undefined}>
            {text}
        </span>
    );

    return (
        <div
            className={cn(
                'flex flex-wrap items-center gap-1 print:hidden',
                className,
            )}
        >
            <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9"
                title={compact ? 'Salin' : undefined}
                onClick={onCopy}
            >
                <Copy className="size-4" />
                {label('Salin')}
            </Button>
            <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9"
                title={compact ? 'Unduh Markdown' : undefined}
                onClick={onExport}
            >
                <Download className="size-4" />
                {label('Unduh Markdown')}
            </Button>
            <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9"
                title={compact ? 'PDF' : undefined}
                onClick={onPrint}
            >
                <Printer className="size-4" />
                {label('PDF')}
            </Button>
            {prdId && (
                <Button
                    asChild
                    variant="brand"
                    size="sm"
                    className="ml-1.5 h-9 px-3.5"
                >
                    <Link href={designIndex({ query: { prd_id: prdId } })}>
                        <LayoutTemplate className="size-4" />
                        Generate UI Mockup
                    </Link>
                </Button>
            )}
        </div>
    );
}

function VersionControls({
    versions,
    isLoading,
    onRestoreVersion,
}: {
    versions: PrdVersionSummary[];
    isLoading: boolean;
    onRestoreVersion: (versionId: string) => void;
}) {
    if (versions.length === 0) {
        return null;
    }

    return (
        <div className="-my-1 flex items-center gap-0.5 print:hidden">
            <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs font-normal"
                disabled={isLoading}
                onClick={() => onRestoreVersion(versions[0].id)}
            >
                <Undo2 className="size-3.5" />
                Urungkan
            </Button>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 font-mono text-xs font-normal"
                        disabled={isLoading}
                        aria-label="Riwayat versi"
                    >
                        <History className="size-3.5" />
                        {versions.length}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuLabel>
                        Pulihkan versi sebelumnya
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {versions.map((version) => (
                        <DropdownMenuItem
                            key={version.id}
                            onSelect={() => onRestoreVersion(version.id)}
                            className="flex justify-between gap-3"
                        >
                            <span>{formatVersionTime(version.created_at)}</span>
                            <span className="font-mono text-xs text-muted-foreground">
                                {version.characters.toLocaleString('id-ID')}{' '}
                                karakter
                            </span>
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}

/**
 * Shown when the document lacks required sections or its tail was cut off,
 * with one click to have the AI write just those parts.
 */
function CompletenessNotice({
    completeness,
    isLoading,
    onComplete,
}: {
    completeness: PrdCompleteness;
    isLoading: boolean;
    onComplete: () => void;
}) {
    const { missing, incomplete } = completeness;

    if (missing.length === 0 && incomplete === null) {
        return null;
    }

    return (
        <div
            role="status"
            className="flex w-full max-w-[760px] flex-col gap-3 rounded-lg border border-amber-500/40 bg-amber-500/5 px-5 py-4 sm:flex-row sm:items-center sm:justify-between print:hidden"
        >
            <div className="flex flex-col gap-1 text-sm leading-normal">
                <p className="font-medium">PRD belum lengkap</p>
                {missing.length > 0 ? (
                    <p className="text-muted-foreground">
                        Section hilang: {missing.join(', ')}.
                    </p>
                ) : null}
                {incomplete ? (
                    <p className="text-muted-foreground">
                        Bagian “{incomplete}” tampak terpotong.
                    </p>
                ) : null}
            </div>
            <Button
                type="button"
                variant="brand"
                className="h-10 shrink-0"
                disabled={isLoading}
                onClick={onComplete}
            >
                {isLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                ) : (
                    <FilePlus2 className="size-4" />
                )}
                Lengkapi section
            </Button>
        </div>
    );
}

export function PrdStage({
    prd,
    isStreaming,
    isLoading,
    lastUsage,
    prdId,
    updatedAt,
    versions,
    completeness,
    onRestoreVersion,
    onComplete,
    onCopy,
    onExport,
    onPrint,
}: {
    prd: string;
    isStreaming: boolean;
    isLoading: boolean;
    lastUsage: number | null;
    prdId: string | null;
    /** Last saved time of the open PRD; null before its first save. */
    updatedAt: string | null;
    versions: PrdVersionSummary[];
    completeness: PrdCompleteness;
    onRestoreVersion: (versionId: string) => void;
    onComplete: () => void;
    onCopy: () => void;
    onExport: () => void;
    onPrint: () => void;
}) {
    const { title, sections } = prdOutline(prd);

    return (
        <div className="flex flex-col items-center gap-4 pt-6 pb-12 xl:pt-8 xl:pb-16 print:p-0">
            {/* From xl these live in the top bar. */}
            <PrdActions
                prdId={prdId}
                isStreaming={isStreaming}
                onCopy={onCopy}
                onExport={onExport}
                onPrint={onPrint}
                className="-ml-2.5 w-full max-w-[760px] xl:hidden"
            />

            {isStreaming ? null : (
                <CompletenessNotice
                    completeness={completeness}
                    isLoading={isLoading}
                    onComplete={onComplete}
                />
            )}

            <article className="flex w-full max-w-[760px] flex-col gap-9 border bg-card px-5 py-8 shadow-[0_24px_48px_-32px_rgb(0_0_0/0.3)] md:px-12 md:py-12 xl:px-16 xl:py-[52px] print:max-w-none print:border-0 print:bg-transparent print:p-0 print:shadow-none">
                <header className="flex flex-col gap-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                        <p className="flex flex-wrap gap-x-4 gap-y-1 label-mono">
                            <span>PRD · versi {versions.length + 1}</span>
                            {updatedAt ? (
                                <span>{formatVersionTime(updatedAt)}</span>
                            ) : null}
                            {lastUsage ? (
                                <span className="print:hidden">
                                    {lastUsage.toLocaleString('id-ID')} token
                                    digunakan
                                </span>
                            ) : null}
                        </p>
                        {isStreaming ? null : (
                            <VersionControls
                                versions={versions}
                                isLoading={isLoading}
                                onRestoreVersion={onRestoreVersion}
                            />
                        )}
                    </div>
                    <h2 className="font-serif text-4xl leading-none font-normal tracking-[-0.015em] text-balance md:text-5xl xl:text-[52px] print:text-4xl">
                        {title}
                    </h2>
                </header>

                {sections.map((section, index) => (
                    <section
                        key={`${section.title}-${index}`}
                        id={sectionAnchor(index)}
                        className={cn(
                            'grid scroll-mt-24 grid-cols-[36px_minmax(0,1fr)] border-t pt-[18px] md:grid-cols-[52px_minmax(0,1fr)]',
                            index === 0 && 'border-foreground',
                        )}
                    >
                        <span className="pt-2 font-mono text-xs text-brand">
                            {pad(index + 1)}
                        </span>
                        <div className="min-w-0">
                            <h3 className="font-serif text-[26px] leading-[1.1] font-normal md:text-[30px]">
                                {section.title}
                            </h3>
                            <PrdSectionContent items={section.content} />
                        </div>
                    </section>
                ))}
            </article>
        </div>
    );
}

/**
 * Table of contents and the revision form. A fixed right panel from xl;
 * below it the same content follows the document.
 */
export function PrdPanel({
    prd,
    isStreaming,
    isLoading,
    revision,
    onRevisionChange,
    onRequestRevision,
    onRegenerate,
    onBackToInterview,
}: {
    prd: string;
    isStreaming: boolean;
    isLoading: boolean;
    revision: string;
    onRevisionChange: (revision: string) => void;
    onRequestRevision: () => void;
    onRegenerate: () => void;
    onBackToInterview: () => void;
}) {
    const { sections } = prdOutline(prd);

    // Scroll in place instead of following the hash, which would add a
    // history entry Inertia does not know about.
    const jumpTo = (event: MouseEvent<HTMLAnchorElement>, index: number) => {
        event.preventDefault();
        document
            .getElementById(sectionAnchor(index))
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
        <aside
            aria-label="Navigasi dokumen dan revisi"
            className="flex flex-col border-t bg-panel xl:fixed xl:inset-y-0 xl:right-0 xl:w-[320px] xl:border-t-0 xl:border-l print:hidden"
        >
            <nav
                aria-label="Daftar isi"
                className="flex flex-col gap-2.5 px-4 pt-7 pb-6 md:px-8 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:px-7"
            >
                <h2 className="label-mono">Daftar isi</h2>
                <ol className="flex flex-col gap-0.5 text-sm">
                    {sections.map((section, index) => (
                        <li key={`${section.title}-${index}`}>
                            <a
                                href={`#${sectionAnchor(index)}`}
                                onClick={(event) => jumpTo(event, index)}
                                className="flex gap-3.5 py-1.5 leading-snug text-muted-foreground transition-colors hover:text-foreground"
                            >
                                <span className="shrink-0 pt-px font-mono text-xs">
                                    {pad(index + 1)}
                                </span>
                                <span className="min-w-0">{section.title}</span>
                            </a>
                        </li>
                    ))}
                </ol>
            </nav>

            <section
                className={cn(
                    'flex flex-col gap-3 border-t px-4 pt-6 pb-7 md:px-8 xl:px-7',
                    isStreaming && 'hidden',
                )}
            >
                <label htmlFor="prd-revision" className="label-mono">
                    Minta revisi
                </label>
                <p
                    id="prd-revision-hint"
                    className="-mt-1 text-[13px] leading-normal text-muted-foreground"
                >
                    Jelaskan bagian yang ingin diubah, AI akan memperbarui PRD
                    tanpa menghilangkan isi penting.
                </p>
                <textarea
                    id="prd-revision"
                    aria-describedby="prd-revision-hint"
                    rows={4}
                    value={revision}
                    onChange={(event) => onRevisionChange(event.target.value)}
                    placeholder="Contoh: tambahkan bagian metrik keberhasilan dan perjelas scope MVP..."
                    className="w-full resize-y rounded-md border border-input bg-card p-3 text-sm leading-normal outline-none placeholder:text-muted-foreground/80 focus-visible:border-foreground/40"
                />
                <Button
                    type="button"
                    variant="brand"
                    className="h-11"
                    disabled={isLoading || !revision.trim()}
                    onClick={onRequestRevision}
                >
                    {isLoading ? (
                        <Loader2 className="size-4 animate-spin" />
                    ) : (
                        <Wand2 className="size-4" />
                    )}
                    Terapkan revisi
                </Button>
                <div className="grid grid-cols-2 gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        className="h-10 bg-transparent px-2 text-[13px]"
                        onClick={onBackToInterview}
                    >
                        Lanjut wawancara
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        className="h-10 bg-transparent px-2 text-[13px]"
                        disabled={isLoading}
                        onClick={onRegenerate}
                    >
                        {isLoading ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : (
                            <RefreshCw className="size-3.5" />
                        )}
                        Buat ulang
                    </Button>
                </div>
            </section>
        </aside>
    );
}
