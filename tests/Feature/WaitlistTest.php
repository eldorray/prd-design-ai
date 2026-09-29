<?php

use App\Models\User;
use App\Models\WaitlistEntry;

test('a visitor can join the waitlist', function () {
    $this->from(route('home'))
        ->post(route('waitlist.store'), [
            'name' => 'Budi',
            'email' => 'budi@example.com',
            'note' => 'Butuh PRD untuk aplikasi kasir.',
        ])
        ->assertRedirect(route('home'))
        ->assertSessionHasNoErrors();

    expect(WaitlistEntry::where('email', 'budi@example.com')->first())
        ->not->toBeNull()
        ->name->toBe('Budi');
});

test('joining twice keeps one entry and still answers with success', function () {
    // The response must not reveal whether an address is already listed.
    WaitlistEntry::create(['email' => 'budi@example.com']);

    $this->post(route('waitlist.store'), ['email' => 'BUDI@example.com'])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect(WaitlistEntry::count())->toBe(1);
});

test('the waitlist validates the email', function () {
    $this->post(route('waitlist.store'), ['email' => 'bukan-email'])
        ->assertSessionHasErrors('email');

    expect(WaitlistEntry::count())->toBe(0);
});

test('the waitlist is rate limited', function () {
    foreach (range(1, 5) as $attempt) {
        $this->post(route('waitlist.store'), ['email' => "orang{$attempt}@example.com"])->assertRedirect();
    }

    $this->post(route('waitlist.store'), ['email' => 'orang6@example.com'])->assertTooManyRequests();
});

test('admins see the waitlist on the dashboard', function () {
    WaitlistEntry::create(['email' => 'budi@example.com', 'name' => 'Budi']);

    $this->actingAs(User::factory()->create(['role' => 'admin']))
        ->get(route('admin.dashboard'))
        ->assertInertia(fn ($page) => $page
            ->where('waitlist.0.email', 'budi@example.com')
            ->where('analytics.waitlist_count', 1),
        );
});

test('admins can remove a waitlist entry', function () {
    $entry = WaitlistEntry::create(['email' => 'budi@example.com']);

    $this->actingAs(User::factory()->create(['role' => 'admin']))
        ->delete(route('admin.waitlist.destroy', $entry))
        ->assertRedirect();

    expect(WaitlistEntry::count())->toBe(0);
});

test('non-admins cannot remove waitlist entries', function () {
    $entry = WaitlistEntry::create(['email' => 'budi@example.com']);

    $this->actingAs(User::factory()->create(['role' => 'user']))
        ->delete(route('admin.waitlist.destroy', $entry))
        ->assertForbidden();

    expect(WaitlistEntry::count())->toBe(1);
});
