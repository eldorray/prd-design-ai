import { Check, FileText, Lightbulb, MessageCircle } from 'lucide-react';

import { cn } from '@/lib/utils';

export type Stage = 'idea' | 'interview' | 'prd';

const STEPS: { key: Stage; label: string; icon: typeof Lightbulb }[] = [
    { key: 'idea', label: 'Ide', icon: Lightbulb },
    { key: 'interview', label: 'Wawancara', icon: MessageCircle },
    { key: 'prd', label: 'PRD', icon: FileText },
];

export function Stepper({ stage }: { stage: Stage }) {
    const currentIndex = STEPS.findIndex((step) => step.key === stage);

    return (
        <ol
            className="m3-progress-path flex items-center"
            aria-label="Tahap pembuatan PRD"
        >
            {STEPS.map((step, index) => {
                const isCurrent = index === currentIndex;
                const isDone = index < currentIndex;
                const StepIcon = step.icon;

                return (
                    <li
                        key={step.key}
                        className="flex min-w-0 flex-1 items-center last:flex-none"
                    >
                        <div
                            aria-current={isCurrent ? 'step' : undefined}
                            className={cn(
                                'm3-progress-step flex min-h-10 items-center gap-2 px-3 text-xs font-medium',
                                isCurrent && 'is-current',
                                isDone && 'is-done',
                            )}
                        >
                            <span className="m3-progress-icon flex size-6 items-center justify-center">
                                {isDone ? (
                                    <Check className="size-3.5" />
                                ) : (
                                    <StepIcon className="size-3.5" />
                                )}
                            </span>
                            <span>{step.label}</span>
                        </div>
                        {index < STEPS.length - 1 ? (
                            <span
                                className={cn(
                                    'm3-progress-connector mx-1 h-0.5 min-w-3 flex-1',
                                    isDone && 'is-done',
                                )}
                            />
                        ) : null}
                    </li>
                );
            })}
        </ol>
    );
}
