export type DesignMessage = {
    role: 'assistant' | 'user';
    content: string;
};

export type SelectedElement = {
    tag: string;
    text: string | null;
    color: string;
    backgroundColor: string;
    fontSize: number;
    fontWeight: number;
    textAlign: 'left' | 'center' | 'right';
};

export type DesignKind = 'landing-page' | 'dashboard' | 'mobile-app';

export type CanvasState = {
    kind: DesignKind;
    html: string;
    messages: DesignMessage[];
    prompt: string | null;
};

export type DesignSummary = {
    id: string;
    title: string;
    kind: DesignKind;
    model: string;
    updated_at: string;
};

export type Design = {
    id: string;
    title: string;
    prompt: string | null;
    kind: DesignKind;
    model: string;
    html: string | null;
    messages: DesignMessage[];
    canvases: CanvasState[] | null;
    created_at: string;
    updated_at: string;
};
