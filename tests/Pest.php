<?php

use GuzzleHttp\Client;
use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Middleware;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
|
| The closure you provide to your test functions is always bound to a specific PHPUnit test
| case class. By default, that class is "PHPUnit\Framework\TestCase". Of course, you may
| need to change it using the "pest()" function to bind different classes or traits.
|
*/

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->in('Feature');

/*
|--------------------------------------------------------------------------
| Expectations
|--------------------------------------------------------------------------
|
| When you're writing tests, you often need to check that values meet certain conditions. The
| "expect()" function gives you access to a set of "expectations" methods that you can use
| to assert different things. Of course, you may extend the Expectation API at any time.
|
*/

expect()->extend('toBeOne', function () {
    return $this->toBe(1);
});

/*
|--------------------------------------------------------------------------
| Functions
|--------------------------------------------------------------------------
|
| While Pest is very powerful out-of-the-box, you may have some testing code specific to your
| project that you don't want to repeat in every file. Here you can also expose helpers as
| global functions to help you to reduce the number of lines of code in your test files.
|
*/

function something()
{
    // ..
}

/**
 * Route the streaming controllers' Guzzle client through a mock handler.
 * Sent requests are appended to $history (Guzzle history entries).
 *
 * @param  list<mixed>  $queue
 * @param  array<int, array<string, mixed>>  $history
 */
function fakeProviderStream(array $queue, array &$history = []): void
{
    config([
        'services.deepseek.key' => 'test-key',
        'services.deepseek.base_url' => 'https://api.deepseek.com',
    ]);

    $stack = HandlerStack::create(new MockHandler($queue));
    $stack->push(Middleware::history($history));

    app()->bind(Client::class, fn ($app, array $parameters) => new Client(
        ['handler' => $stack] + ($parameters['config'] ?? []),
    ));
}
