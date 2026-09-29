import { useId } from 'react';

/** Mirrors the `quota` prop PrdController::index shares with the page. */
export type TokenQuota = {
    used: number;
    /** Null for admins, who are exempt from the quota. */
    limit: number | null;
    /** ISO-8601 start of the next quota period. */
    resets_at: string;
};

const numberFormat = new Intl.NumberFormat('id-ID');

/**
 * Format the server's calendar date as-is. Parsing the full timestamp would
 * shift it into the browser's timezone and could show the day before.
 */
function formatResetDate(value: string) {
    const [year, month, day] = value.slice(0, 10).split('-').map(Number);

    if (!year || !month || !day) {
        return '';
    }

    return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'long',
    }).format(new Date(year, month - 1, day));
}

export function QuotaMeter({ quota }: { quota: TokenQuota }) {
    const labelId = useId();

    if (quota.limit === null) {
        return (
            <section className="flex flex-col gap-2">
                <h2 className="label-mono">Kuota token bulan ini</h2>
                <p className="text-[13px] text-muted-foreground">
                    Tanpa batas (admin)
                </p>
            </section>
        );
    }

    const percent =
        quota.limit > 0
            ? Math.min(100, Math.round((quota.used / quota.limit) * 100))
            : 100;
    const resetDate = formatResetDate(quota.resets_at);

    return (
        <section className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3">
                <h2 id={labelId} className="label-mono">
                    Kuota token bulan ini
                </h2>
                <span className="font-mono text-xs">{percent}%</span>
            </div>
            <div
                role="progressbar"
                aria-labelledby={labelId}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
                className="h-1 bg-border"
            >
                <div
                    className="h-1 bg-foreground transition-[width]"
                    style={{ width: `${percent}%` }}
                />
            </div>
            <p className="text-[13px] text-muted-foreground">
                {numberFormat.format(quota.used)} dari{' '}
                {numberFormat.format(quota.limit)} token
                {resetDate ? ` · reset ${resetDate}` : null}
            </p>
        </section>
    );
}
