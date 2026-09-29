export type PrdMessage = {
    role: 'assistant' | 'user';
    content: string;
};

export type PrdSummary = {
    id: string;
    title: string;
    model: string;
    updated_at: string;
};

export type Prd = {
    id: string;
    title: string;
    idea: string | null;
    model: string;
    content: string | null;
    messages: PrdMessage[];
    created_at: string;
    updated_at: string;
};

/** An earlier content of a PRD; the content itself loads on restore. */
export type PrdVersionSummary = {
    id: string;
    created_at: string;
    characters: number;
};
