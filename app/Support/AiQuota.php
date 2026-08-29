<?php

namespace App\Support;

use App\Models\AiUsageLog;
use App\Models\User;
use Illuminate\Support\Facades\Cache;

/**
 * Token quota accounting for the AI endpoints.
 *
 * The check and the debit have to happen together. The design studio fires up
 * to three generations in parallel, and the old "check now, log at the end"
 * shape let all three clear a quota that only covered one — each request read
 * the same balance before any of them had written a usage row.
 *
 * So a request reserves an estimate before calling the provider and settles it
 * against the real token count afterwards. A stream that dies mid-flight keeps
 * its reservation on purpose: the provider already burned those tokens.
 */
final class AiQuota
{
    /**
     * Tokens held per in-flight request until the provider reports real usage.
     * Sized for a full PRD or HTML document, so a parallel burst cannot slip
     * far past the quota before the reservations land.
     */
    public const ESTIMATE = 8000;

    /**
     * Seconds to hold the per-user lock. The critical section is one SUM plus
     * one INSERT, so this only ever guards against genuine parallel requests.
     */
    private const LOCK_SECONDS = 10;

    /**
     * Debit an estimate up front and return the usage row to settle later.
     * Returns null when the user is out of quota.
     */
    public static function reserve(User $user, string $model, string $mode): ?AiUsageLog
    {
        // Admins are exempt from the balance check but still get a usage row,
        // so admin spend stays visible on the admin dashboard.
        $isAdmin = $user->isAdmin();

        // ponytail: a per-user cache lock is enough here; the reservation row
        // itself is what keeps parallel requests honest once it is written.
        return Cache::lock('ai-quota:'.$user->getKey(), self::LOCK_SECONDS)
            ->block(5, function () use ($user, $model, $mode, $isAdmin): ?AiUsageLog {
                if (! $isAdmin && $user->remainingQuota() <= 0) {
                    return null;
                }

                return $user->aiUsageLogs()->create([
                    'model' => $model,
                    'mode' => $mode,
                    'total_tokens' => $isAdmin ? 0 : self::ESTIMATE,
                ]);
            });
    }

    /**
     * Replace the reservation with the provider's real token count.
     */
    public static function settle(?AiUsageLog $log, int $actualTokens): void
    {
        $log?->update(['total_tokens' => max(0, $actualTokens)]);
    }

    /**
     * Drop the reservation when the call produced nothing billable — a refused
     * request, or a provider error before any tokens were spent.
     */
    public static function release(?AiUsageLog $log): void
    {
        $log?->delete();
    }
}
