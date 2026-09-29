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

export function ModelSelect({
    model,
    models,
    onModelChange,
    id,
    className,
}: {
    model: Model;
    models: AiModelOption[];
    onModelChange: (model: Model) => void;
    /** Lets a visible <label htmlFor> point at the trigger. */
    id?: string;
    className?: string;
}) {
    return (
        <Select
            value={model}
            onValueChange={(value) => onModelChange(value as Model)}
            disabled={models.length === 0}
        >
            <SelectTrigger
                id={id}
                className={cn('h-9 w-[190px] text-xs', className)}
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
    );
}
