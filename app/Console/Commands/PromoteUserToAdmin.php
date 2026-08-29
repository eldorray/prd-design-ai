<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

class PromoteUserToAdmin extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'user:promote-admin {email}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Promote an existing user to the admin role';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $email = $this->argument('email');
        $user = User::where('email', $email)->first();

        if (! $user) {
            $this->error("User dengan email {$email} tidak ditemukan.");

            return Command::FAILURE;
        }

        // Explicit write, not update(): `role` is deliberately excluded from
        // the User model's fillable list, so mass assignment silently drops it.
        $user->role = 'admin';
        $user->save();

        $this->info("User {$user->name} ({$email}) berhasil dipromosikan menjadi Administrator.");

        return Command::SUCCESS;
    }
}
