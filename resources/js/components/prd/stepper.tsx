import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';

export type Stage = 'idea' | 'interview' | 'prd';

const STEPS: { key: Stage; label: string }[] = [
    { key: 'idea', label: 'Ide' },
    { key: 'interview', label: 'Wawancara' },
    { key: 'prd', label: 'PRD' },
];

const stepNumber = (index: number) => String(index + 1).padStart(2, '0');

export function Stepper({
    stage,
    compact = false,
    showChecks = true,
    className,
}: {
    stage: Stage;
    /** Phone header: only the current step, with its position. */
    compact?: boolean;
    showChecks?: boolean;
    className?: string;
}) {
    const currentIndex = STEPS.findIndex((step) => step.key === stage);

    if (compact) {
        return (
            <p className={cn('flex min-w-0 flex-col leading-tight', className)}>
                <span className="truncate text-[15px] font-semibold">
                    {STEPS[currentIndex].label}
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">
                    {stepNumber(currentIndex)} / {stepNumber(STEPS.length - 1)}
                </span>
            </p>
        );
    }

    return (
        <ol
            className={cn(
                'flex items-center gap-2.5 text-sm 2xl:gap-3.5',
                className,
            )}
            aria-label="Tahap pembuatan PRD"
        >
            {STEPS.map((step, index) => {
                const isCurrent = index === currentIndex;
                const isDone = index < currentIndex;

                return (
                    <li
                        key={step.key}
                        className="flex items-center gap-2.5 2xl:gap-3.5"
                    >
                        <span
                            aria-current={isCurrent ? 'step' : undefined}
                            className={cn(
                                'flex items-center gap-2 whitespace-nowrap',
                                isCurrent
                                    ? 'font-semibold text-foreground'
                                    : 'text-muted-foreground',
                            )}
                        >
                            <span
                                className={cn(
                                    'font-mono text-xs',
                                    isCurrent && 'text-brand',
                                )}
                            >
                                {stepNumber(index)}
                            </span>
                            {step.label}
                            {isDone ? (
                                <>
                                    {showChecks ? (
                                        <Check
                                            aria-hidden="true"
                                            className="size-3.5"
                                            strokeWidth={2}
                                        />
                                    ) : null}
                                    <span className="sr-only">(selesai)</span>
                                </>
                            ) : null}
                        </span>
                        {index < STEPS.length - 1 ? (
                            <span
                                aria-hidden="true"
                                className={cn(
                                    'h-px w-7 2xl:w-10',
                                    isDone ? 'bg-foreground' : 'bg-input',
                                )}
                            />
                        ) : null}
                    </li>
                );
            })}
        </ol>
    );
}
