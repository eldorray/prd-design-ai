type StreamHandlers = {
    /** Called with everything received so far, not just the new delta. */
    onChunk: (fullText: string) => void;
    onDone: (fullText: string) => void;
    onError: (message: string) => void;
};

type StreamRequest = {
    url: string;
    csrfToken: string;
    body: Record<string, unknown>;
    signal?: AbortSignal;
    /** Shown when the server refuses without a message of its own. */
    failureMessage?: string;
};

/**
 * POST to one of the app's SSE endpoints (PRD or design) and parse its
 * `chunk` / `done` / `error` frames. Accumulates the streamed text deltas and
 * reports progress as it arrives; callers clean the text for their format.
 */
export async function streamSse(
    request: StreamRequest,
    handlers: StreamHandlers,
): Promise<void> {
    const response = await fetch(request.url, {
        method: 'POST',
        headers: {
            Accept: 'text/event-stream',
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': request.csrfToken,
        },
        body: JSON.stringify(request.body),
        signal: request.signal,
    });

    if (!response.ok || !response.body) {
        let message = request.failureMessage ?? 'Permintaan gagal. Coba lagi.';

        try {
            const data = await response.json();

            if (data && typeof data.message === 'string') {
                message = data.message;
            }
        } catch {
            // Fall back to default message
        }

        handlers.onError(message);

        return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';

    const handleEvent = (rawEvent: string) => {
        const lines = rawEvent.split('\n');
        let eventName = 'message';
        let dataText = '';

        for (const line of lines) {
            // Tolerate CRLF line endings, which the SSE spec allows.
            const normalized = line.endsWith('\r') ? line.slice(0, -1) : line;

            if (normalized.startsWith('event:')) {
                eventName = normalized.slice(6).trim();
            } else if (normalized.startsWith('data:')) {
                // Per the SSE spec, multiple data lines join with '\n'.
                dataText +=
                    (dataText ? '\n' : '') +
                    normalized.slice(5).replace(/^ /, '');
            }
        }

        if (eventName === 'chunk') {
            if (!dataText) {
                return;
            }

            let data: { delta?: string };

            try {
                data = JSON.parse(dataText);
            } catch {
                return;
            }

            if (typeof data.delta === 'string') {
                fullText += data.delta;
                handlers.onChunk(fullText);
            }
        } else if (eventName === 'done') {
            handlers.onDone(fullText);
        } else if (eventName === 'error') {
            let message = request.failureMessage ?? 'Permintaan gagal.';

            try {
                message = (JSON.parse(dataText).message as string) ?? message;
            } catch {
                // keep default message
            }

            handlers.onError(message);
        }
    };

    // Frames are separated by a blank line (\n\n, or \r\n\r\n per the SSE spec).
    const nextSeparator = (buf: string): number => {
        const lf = buf.indexOf('\n\n');
        const crlf = buf.indexOf('\r\n\r\n');

        if (lf === -1) {
            return crlf;
        }

        if (crlf === -1) {
            return lf;
        }

        return Math.min(lf, crlf);
    };

    for (;;) {
        const { done, value } = await reader.read();

        if (done) {
            break;
        }

        buffer += decoder.decode(value, { stream: true });

        let separator = nextSeparator(buffer);

        while (separator !== -1) {
            const rawEvent = buffer.slice(0, separator);
            buffer = buffer.slice(
                separator + separatorLength(buffer, separator),
            );
            handleEvent(rawEvent);
            separator = nextSeparator(buffer);
        }
    }

    // Some servers close the stream right after the last event without a
    // trailing blank line — flush whatever is left or the final done/error
    // frame (and its HTML) is silently dropped.
    if (buffer.trim() !== '') {
        handleEvent(buffer);
    }
}

/** Length (2 for \n\n, 4 for \r\n\r\n) of the separator at the given index. */
function separatorLength(buf: string, index: number): number {
    return buf.startsWith('\r\n\r\n', index) ? 4 : 2;
}
