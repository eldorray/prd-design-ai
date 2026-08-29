<?php

namespace Database\Factories;

use App\Models\Prd;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Prd>
 */
class PrdFactory extends Factory
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
            'idea' => fake()->paragraph(),
            'model' => fake()->randomElement(['deepseek-v4-flash', 'deepseek-v4-pro']),
            'content' => '# '.fake()->sentence(2)."\n\n## Ringkasan\n".fake()->paragraph(),
            'messages' => [
                ['role' => 'user', 'content' => fake()->sentence()],
                ['role' => 'assistant', 'content' => fake()->sentence()],
            ],
        ];
    }

    /**
     * Indicate that the PRD is still a draft without generated content.
     */
    public function draft(): static
    {
        return $this->state(fn (array $attributes): array => [
            'content' => null,
        ]);
    }
}
