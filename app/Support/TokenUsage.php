<?php

namespace App\Support;

/**
 * Resolves how many tokens a completion cost.
 *
 * Providers are inconsistent about reporting usage — streaming responses in
 * particular often omit it — so a character estimate stands in when the real
 * number is missing. Without it a request would be recorded as free.
 */
final class TokenUsage
{
    /** Rough characters-per-token ratio used when the provider reports nothing. */
    private const CHARS_PER_TOKEN = 4;

    /**
     * @param  array<string, mixed>|null  $usage  The provider's usage object.
     * @param  array<int, array<string, mixed>>  $messages  The request messages.
     * @param  string  $completion  The text the provider produced.
     */
    public static function total(?array $usage, array $messages, string $completion): int
    {
        $reported = (int) ($usage['total_tokens'] ?? 0);

        if ($reported > 0) {
            return $reported;
        }

        $prompt = '';

        foreach ($messages as $message) {
            $prompt .= ' '.self::text($message['content'] ?? '');
        }

        return (int) ceil((strlen($prompt) + strlen($completion)) / self::CHARS_PER_TOKEN);
    }

    /**
     * Flatten a message body to text. Vision requests send an array of typed
     * parts instead of a string; the base64 image part is skipped on purpose,
     * since its length says nothing about the tokens it costs.
     */
    private static function text(mixed $content): string
    {
        if (is_string($content)) {
            return $content;
        }

        if (! is_array($content)) {
            return '';
        }

        $parts = array_map(
            fn (mixed $part): string => is_array($part) ? (string) ($part['text'] ?? '') : '',
            $content,
        );

        return implode(' ', array_filter($parts));
    }
}
