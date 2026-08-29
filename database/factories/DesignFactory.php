<?php

namespace Database\Factories;

use App\Models\Design;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Design>
 */
class DesignFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'title' => fake()->sentence(3),
            'prompt' => fake()->sentence(),
            'kind' => fake()->randomElement(['landing-page', 'dashboard']),
            'model' => fake()->randomElement(['deepseek-v4-flash', 'deepseek-v4-pro']),
            'html' => '<!doctype html><html><body><h1>'.fake()->sentence(2).'</h1></body></html>',
            'messages' => [
                ['role' => 'user', 'content' => fake()->sentence()],
                ['role' => 'assistant', 'content' => '<!doctype html>...'],
            ],
            'canvases' => [[
                'kind' => 'landing-page',
                'html' => '<!doctype html><html><body><h1>Canvas</h1></body></html>',
                'messages' => [
                    ['role' => 'user', 'content' => fake()->sentence()],
                    ['role' => 'assistant', 'content' => '<!doctype html>...'],
                ],
                'prompt' => fake()->sentence(),
            ]],
        ];
    }

    /**
     * Indicate that the design has not generated any HTML yet.
     */
    public function draft(): static
    {
        return $this->state(fn (array $attributes): array => [
            'html' => null,
        ]);
    }
}
