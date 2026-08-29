<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

/**
 * Public registration is closed, so accounts are provisioned here. Doubles as
 * the password-reset path while the deployment has no working mailer.
 */
class CreateUser extends Command
{
    protected $signature = 'user:create
        {email : Email address of the account}
        {--name= : Display name (defaults to the part before @)}
        {--role=user : user or admin}
        {--quota=0 : AI token quota}
        {--password= : Password; prompted for when omitted}';

    protected $description = 'Create a user, or reset the password and quota of an existing one';

    public function handle(): int
    {
        $email = (string) $this->argument('email');
        $role = (string) $this->option('role');

        if (! in_array($role, ['user', 'admin'], true)) {
            $this->error('Role harus "user" atau "admin".');

            return Command::FAILURE;
        }

        $quota = (int) $this->option('quota');

        if ($quota < 0) {
            $this->error('Quota tidak boleh negatif.');

            return Command::FAILURE;
        }

        $password = (string) ($this->option('password') ?? '');

        if ($password === '') {
            $password = (string) $this->secret('Password');
        }

        $existing = User::where('email', $email)->first();

        $validator = Validator::make(
            ['email' => $email, 'password' => $password],
            [
                'email' => ['required', 'email', 'max:255'],
                'password' => ['required', 'string', Password::default()],
            ],
        );

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $message) {
                $this->error($message);
            }

            return Command::FAILURE;
        }

        $user = $existing ?? new User;
        $user->name = (string) ($this->option('name') ?: ($existing->name ?? str($email)->before('@')->toString()));
        $user->email = $email;
        $user->password = Hash::make($password);
        $user->role = $role;
        $user->token_quota = $quota;
        $user->status = 'active';
        $user->email_verified_at ??= now();
        $user->save();

        $this->info(sprintf(
            '%s %s (%s) — role: %s, kuota: %s token.',
            $existing ? 'Diperbarui:' : 'Dibuat:',
            $user->name,
            $user->email,
            $user->role,
            number_format($user->token_quota, 0, ',', '.'),
        ));

        return Command::SUCCESS;
    }
}
