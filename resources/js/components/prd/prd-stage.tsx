import { Link } from '@inertiajs/react';
import {
    ArrowLeft,
    Copy,
    Download,
    FileText,
    Loader2,
    Pencil,
    RefreshCw,
    Wand2,
} from 'lucide-react';

import { PrdSectionContent } from '@/components/prd/prd-document';
import { Button } from '@/components/ui/button';
import { parsePrdSections } from '@/lib/prd-parser';

export function PrdStage({
    prd,
    revision,
    isLoading,
    lastUsage,
    prdId,
    onRevisionChange,
    onRequestRevision,
    onRegenerate,
    onCopy,
    onExport,
    onBackToInterview,
}: {
    prd: string;
    revision: string;
    isLoading: boolean;
    lastUsage: number | null;
    prdId: string | null;
    onRevisionChange: (revision: string) => void;
    onRequestRevision: () => void;
    onRegenerate: () => void;
    onCopy: () => void;
    onExport: () => void;
    onBackToInterview: () => void;
}) {
    const sections = parsePrdSections(prd);
    const title = sections[0]?.title ?? 'PRD';
    const documentSections =
        sections.length > 1 ? sections.slice(1) : sections.slice(0);

    return (
        <div className="space-y-5">
            <div className="m3-document-toolbar p-5 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="m3-stage-icon flex size-11 items-center justify-center">
                            <FileText className="size-5" />
                        </div>
                        <div>
                            <p className="m3-stage-label">Dokumen PRD</p>
                            <h2 className="text-lg font-semibold tracking-tight">
                                {title}
                            </h2>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {prdId && (
                            <Button
                                asChild
                                variant="outline"
                                size="sm"
                                className="m3-design-action"
                            >
                                <Link href={`/design?prd_id=${prdId}`}>
                                    <Wand2 className="size-4" />
                                    Generate UI Mockup
                                </Link>
                            </Button>
                        )}
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={onCopy}
                        >
                            <Copy className="size-4" />
                            Salin
                        </Button>
                        <Button type="button" size="sm" onClick={onExport}>
                            <Download className="size-4" />
                            Unduh Markdown
                        </Button>
                    </div>
                </div>

                {lastUsage ? (
                    <p className="text-muted-foreground mt-3 text-xs">
                        {lastUsage.toLocaleString()} token digunakan
                    </p>
                ) : null}
            </div>

            <article className="m3-document-paper">
                {documentSections.map((section, index) => (
                    <section
                        key={`${section.title}-${index}`}
                        className="m3-document-section p-5 md:p-7"
                    >
                        <div className="flex gap-4">
                            <div className="m3-section-index flex size-8 shrink-0 items-center justify-center text-sm font-medium">
                                {String(index + 1).padStart(2, '0')}
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 className="text-base font-semibold">
                                    {section.title}
                                </h3>
                                <PrdSectionContent items={section.content} />
                            </div>
                        </div>
                    </section>
                ))}
            </article>

            <div className="m3-revision-panel p-5 md:p-6">
                <div className="flex items-center gap-2">
                    <Pencil className="text-muted-foreground size-4" />
                    <p className="text-sm font-medium">Minta revisi</p>
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                    Jelaskan bagian yang ingin diubah, AI akan memperbarui PRD
                    tanpa menghilangkan isi penting.
                </p>
                <textarea
                    value={revision}
                    onChange={(event) => onRevisionChange(event.target.value)}
                    placeholder="Contoh: tambahkan bagian metrik keberhasilan dan perjelas scope MVP..."
                    className="mt-3 min-h-28 w-full resize-y p-4 text-sm leading-6"
                />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={onBackToInterview}
                            className="text-muted-foreground"
                        >
                            <ArrowLeft className="size-4" />
                            Lanjut wawancara
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isLoading}
                            onClick={onRegenerate}
                        >
                            {isLoading ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : (
                                <RefreshCw className="size-4" />
                            )}
                            Buat ulang
                        </Button>
                    </div>
                    <Button
                        type="button"
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
                </div>
            </div>
        </div>
    );
}
