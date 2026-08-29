import { useCallback, useState } from 'react';
import type { CanvasState, Design, DesignKind, DesignMessage } from '@/types/design';

export const ALL_KINDS: DesignKind[] = ['landing-page', 'dashboard', 'mobile-app'];

function emptyCanvas(kind: DesignKind): CanvasState {
    return { kind, html: '', messages: [], prompt: '' };
}

/** Build the initial per-canvas record from a loaded design (with back-compat). */
export function initialCanvasesFrom(current: Design | null): {
    canvases: Record<DesignKind, CanvasState>;
    selectedKinds: DesignKind[];
} {
    const record = {} as Record<DesignKind, CanvasState>;

    let source: CanvasState[] = [];

    if (current?.canvases?.length) {
        source = current.canvases;
    } else if (current) {
        source = [{
            kind: current.kind,
            html: current.html ?? '',
            messages: current.messages ?? [],
            prompt: current.prompt,
        }];
    } else {
        source = [emptyCanvas('landing-page')];
    }

    for (const canvas of source) {
        record[canvas.kind] = {
            kind: canvas.kind,
            html: canvas.html ?? '',
            messages: canvas.messages ?? [],
            prompt: canvas.prompt ?? '',
        };
    }

    const selectedKinds = source.map((c) => c.kind);

    return { canvases: record, selectedKinds };
}

export function useCanvases(current: Design | null) {
    const init = initialCanvasesFrom(current);
    const [canvases, setCanvases] = useState<Record<DesignKind, CanvasState>>(init.canvases);
    const [selectedKinds, setSelectedKinds] = useState<DesignKind[]>(init.selectedKinds);
    const [activeKind, setActiveKind] = useState<DesignKind>(init.selectedKinds[0]);

    /** Toggle a kind on/off. Never allow zero selected; keep activeKind valid. */
    const toggleKind = useCallback((kind: DesignKind) => {
        const isOn = selectedKinds.includes(kind);

        if (isOn && selectedKinds.length === 1) {
            return; // keep at least one
        }

        const next = isOn ? selectedKinds.filter((k) => k !== kind) : [...selectedKinds, kind];
        // Order by ALL_KINDS for stable tab order.
        const ordered = ALL_KINDS.filter((k) => next.includes(k));

        setSelectedKinds(ordered);

        if (!isOn) {
            setCanvases((c) => (c[kind] ? c : { ...c, [kind]: emptyCanvas(kind) }));
        }

        setActiveKind((current) => (ordered.includes(current) ? current : ordered[0]));
    }, [selectedKinds]);

    /** Replace one canvas's html + messages + prompt after a generate/refine/edit. */
    const applyCanvasResult = useCallback(
        (kind: DesignKind, html: string, messages: DesignMessage[], prompt: string) => {
            setCanvases((prev) => ({
                ...prev,
                [kind]: { ...(prev[kind] ?? emptyCanvas(kind)), html, messages, prompt },
            }));
        },
        [],
    );

    return {
        canvases,
        setCanvases,
        selectedKinds,
        toggleKind,
        activeKind,
        setActiveKind,
        applyCanvasResult,
    };
}
