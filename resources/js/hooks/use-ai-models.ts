import { useEffect, useMemo, useState } from 'react';

export type AiModelOption = {
    id: string;
    provider: string;
    provider_name: string;
};

type AiModelResponse = {
    models?: AiModelOption[];
    message?: string;
};

/**
 * Load model choices from the active provider base URLs configured by the
 * administrator. Initial IDs from Inertia keep first paint stable; the
 * endpoint refresh replaces them with provider-labelled options.
 */
export function useAiModels(initialModelIds: string[] = []) {
    const initialOptions = useMemo<AiModelOption[]>(
        () =>
            initialModelIds.map((id) => ({
                id,
                provider: '',
                provider_name: 'Provider AI',
            })),
        [initialModelIds],
    );
    const [models, setModels] = useState<AiModelOption[]>(initialOptions);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const controller = new AbortController();

        const load = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const response = await fetch('/ai/models', {
                    headers: { Accept: 'application/json' },
                    signal: controller.signal,
                });
                const data = (await response.json()) as AiModelResponse;

                if (!response.ok) {
                    throw new Error(
                        data.message ?? 'Daftar model gagal dimuat.',
                    );
                }

                const resolved = Array.isArray(data.models) ? data.models : [];
                setModels(resolved);

                if (resolved.length === 0) {
                    setError(
                        'Provider aktif tidak mengembalikan model. Periksa Base URL dan API key di Pengaturan AI.',
                    );
                }
            } catch (caught) {
                if (
                    caught instanceof DOMException &&
                    caught.name === 'AbortError'
                ) {
                    return;
                }

                setError(
                    caught instanceof Error
                        ? caught.message
                        : 'Daftar model gagal dimuat.',
                );
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            }
        };

        void load();

        return () => controller.abort();
    }, []);

    return {
        models,
        modelIds: models.map((model) => model.id),
        isLoading,
        error,
    };
}
