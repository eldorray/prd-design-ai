import { Head, router, useForm } from '@inertiajs/react';
import {
    ChevronLeft,
    ChevronRight,
    Edit2,
    Search,
    Shield,
    Trash2,
    UserPlus,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useInitials } from '@/hooks/use-initials';
import { cn } from '@/lib/utils';
import type { Auth } from '@/types';

type DashboardUser = {
    id: string;
    name: string;
    email: string;
    role: 'user' | 'admin';
    token_quota: number;
    status: 'active' | 'blocked';
    created_at: string | null;
    used_tokens: number;
};

type Analytics = {
    total_users: number;
    total_tokens: number;
    total_prds: number;
    total_designs: number;
    waitlist_count: number;
};

type Paginated<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    from: number | null;
    to: number | null;
    total: number;
    prev_page_url: string | null;
    next_page_url: string | null;
};

type RoleFilter = 'all' | 'user' | 'admin';
type StatusFilter = 'all' | 'active' | 'blocked';

type Filters = {
    search: string;
    role: RoleFilter;
    status: StatusFilter;
};

type WaitlistEntry = {
    id: string;
    email: string;
    name: string | null;
    note: string | null;
    created_at: string;
};

type Props = {
    auth: Auth;
    users: Paginated<DashboardUser>;
    filters: Filters;
    waitlist: WaitlistEntry[];
    analytics: Analytics;
};

// label-mono sorts before the Label primitive's own text utilities, so the
// conflicting ones are overridden explicitly.
const fieldLabelClasses = 'label-mono text-[11px] leading-[1.4] font-normal';
const dialogTitleClasses = 'font-serif text-[28px] leading-tight font-normal';

export default function Dashboard({
    auth,
    users,
    filters,
    waitlist,
    analytics,
}: Props) {
    const [searchQuery, setSearchQuery] = useState(filters.search);
    const [roleFilter, setRoleFilter] = useState<RoleFilter>(filters.role);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>(
        filters.status,
    );
    const isFirstFilterRun = useRef(true);
    const getInitials = useInitials();

    // Creating user state
    const [isCreating, setIsCreating] = useState(false);
    const createForm = useForm({
        name: '',
        email: '',
        password: '',
        role: 'user' as 'user' | 'admin',
        token_quota: '50000',
    });

    // Editing user state
    const [editingUser, setEditingUser] = useState<DashboardUser | null>(null);
    const [editRole, setEditRole] = useState<'user' | 'admin'>('user');
    const [editStatus, setEditStatus] = useState<'active' | 'blocked'>(
        'active',
    );
    const [editQuota, setEditQuota] = useState('100000');
    const [isSaving, setIsSaving] = useState(false);

    // Deleting user state
    const [deletingUser, setDeletingUser] = useState<DashboardUser | null>(
        null,
    );
    const [isDeleting, setIsDeleting] = useState(false);

    // Filtering and paging happen on the server; the search box is debounced
    // so typing does not fire a request per keystroke.
    useEffect(() => {
        if (isFirstFilterRun.current) {
            isFirstFilterRun.current = false;

            return;
        }

        const timeout = setTimeout(() => {
            router.get(
                '/admin/dashboard',
                {
                    search: searchQuery || undefined,
                    role: roleFilter === 'all' ? undefined : roleFilter,
                    status: statusFilter === 'all' ? undefined : statusFilter,
                },
                { preserveState: true, preserveScroll: true, replace: true },
            );
        }, 300);

        return () => clearTimeout(timeout);
    }, [searchQuery, roleFilter, statusFilter]);

    const goToPage = (url: string | null) => {
        if (url) {
            router.get(url, {}, { preserveState: true, preserveScroll: true });
        }
    };

    const openCreate = (entry?: WaitlistEntry) => {
        createForm.reset();
        createForm.clearErrors();

        if (entry) {
            createForm.setData((data) => ({
                ...data,
                name: entry.name ?? entry.email.split('@')[0],
                email: entry.email,
            }));
        }

        setIsCreating(true);
    };

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();

        createForm.transform((data) => ({
            ...data,
            token_quota: parseInt(data.token_quota, 10),
        }));
        createForm.post('/admin/users', {
            preserveScroll: true,
            onSuccess: () => {
                setIsCreating(false);
                createForm.reset();
            },
        });
    };

    const handleRemoveWaitlist = (entry: WaitlistEntry) => {
        router.delete(`/admin/waitlist/${entry.id}`, {
            preserveScroll: true,
            onSuccess: () =>
                toast.success(`${entry.email} dihapus dari daftar tunggu.`),
        });
    };

    const handleEditClick = (user: DashboardUser) => {
        setEditingUser(user);
        setEditRole(user.role);
        setEditStatus(user.status);
        setEditQuota(user.token_quota.toString());
    };

    const handleSaveEdit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!editingUser) {
            return;
        }

        const quotaNum = parseInt(editQuota, 10);

        if (isNaN(quotaNum) || quotaNum < 0) {
            toast.error('Quota harus berupa angka positif.');

            return;
        }

        setIsSaving(true);
        router.put(
            `/admin/users/${editingUser.id}`,
            {
                role: editRole,
                status: editStatus,
                token_quota: quotaNum,
            },
            {
                onSuccess: () => {
                    toast.success('Pengaturan user berhasil diperbarui.');
                    setEditingUser(null);
                },
                onError: (errors) => {
                    const message =
                        Object.values(errors).join(', ') ||
                        'Gagal memperbarui user.';
                    toast.error(message);
                },
                onFinish: () => setIsSaving(false),
            },
        );
    };

    const handleDeleteClick = (user: DashboardUser) => {
        if (user.id === auth.user.id) {
            toast.error('Anda tidak dapat menghapus akun Anda sendiri.');

            return;
        }

        setDeletingUser(user);
    };

    const handleConfirmDelete = () => {
        if (!deletingUser) {
            return;
        }

        setIsDeleting(true);
        router.delete(`/admin/users/${deletingUser.id}`, {
            onSuccess: () => {
                toast.success(`User ${deletingUser.name} berhasil dihapus.`);
                setDeletingUser(null);
            },
            onError: () => {
                toast.error('Gagal menghapus user.');
            },
            onFinish: () => setIsDeleting(false),
        });
    };

    const stats = [
        {
            label: 'Total Pengguna',
            value: analytics.total_users,
            caption: 'Pengguna terdaftar di platform',
        },
        {
            label: 'Total Token AI',
            value: analytics.total_tokens.toLocaleString('id-ID'),
            caption: 'Konsumsi total token AI sepanjang waktu',
        },
        {
            label: 'Dokumen PRD',
            value: analytics.total_prds,
            caption: 'Total PRD yang telah digenerate',
        },
        {
            label: 'Design Mockups',
            value: analytics.total_designs,
            caption: 'Total design studio yang dibuat',
        },
    ];

    // Ruled stat row: 2x2 on small screens, one row of four on large.
    const statCellClasses = [
        'border-r border-b pl-0 lg:border-b-0',
        'border-b pl-4 sm:pl-6 lg:border-r lg:border-b-0',
        'border-r pl-0 lg:pl-6',
        'pl-4 sm:pl-6',
    ];

    return (
        <div className="flex flex-col gap-7 px-6 py-8 md:px-12 md:py-9">
            <Head title="Admin Dashboard" />

            <header className="flex flex-col gap-2.5">
                <span className="label-mono">Admin</span>
                <h1 className="font-serif text-[44px] leading-none font-normal tracking-[-0.015em] md:text-[52px]">
                    Admin Dashboard
                </h1>
                <p className="text-[15px] text-muted-foreground">
                    Pantau statistik sistem dan kelola hak akses, kuota, serta
                    status pengguna.
                </p>
            </header>

            {/* Statistics */}
            <dl className="grid grid-cols-2 border-y border-t-foreground border-b-border lg:grid-cols-4">
                {stats.map((stat, index) => (
                    <div
                        key={stat.label}
                        className={cn(
                            'flex min-w-0 flex-col gap-1.5 border-border py-[18px] pr-4 sm:pr-6',
                            statCellClasses[index],
                        )}
                    >
                        <dt className="label-mono">{stat.label}</dt>
                        <dd className="truncate font-serif text-[40px] leading-none md:text-5xl">
                            {stat.value}
                        </dd>
                        <dd className="text-[13px] text-muted-foreground">
                            {stat.caption}
                        </dd>
                    </div>
                ))}
            </dl>

            {/* User Management */}
            <section
                aria-labelledby="user-management-title"
                className="overflow-hidden rounded-xl border border-border bg-card"
            >
                <div className="flex flex-col gap-3 px-4 py-3.5 lg:flex-row lg:items-center lg:justify-between lg:pl-6">
                    <div className="min-w-0">
                        <h2
                            id="user-management-title"
                            className="text-base font-semibold"
                        >
                            Manajemen Pengguna
                        </h2>
                        <p className="text-[13px] text-muted-foreground">
                            Kelola data pengguna, perbarui batasan token,
                            aktifkan/nonaktifkan akun, dan lainnya.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 lg:shrink-0 lg:flex-nowrap">
                        <div className="relative w-full sm:w-[260px]">
                            <Search
                                className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground"
                                strokeWidth={1.75}
                                aria-hidden="true"
                            />
                            <Input
                                type="search"
                                aria-label="Cari pengguna"
                                placeholder="Cari nama atau email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-background pl-9"
                            />
                        </div>
                        <Select
                            value={roleFilter}
                            onValueChange={(val) =>
                                setRoleFilter(val as RoleFilter)
                            }
                        >
                            <SelectTrigger
                                aria-label="Filter role"
                                className="w-[140px] bg-background"
                            >
                                <SelectValue placeholder="Semua Role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Role</SelectItem>
                                <SelectItem value="user">User</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select
                            value={statusFilter}
                            onValueChange={(val) =>
                                setStatusFilter(val as StatusFilter)
                            }
                        >
                            <SelectTrigger
                                aria-label="Filter status"
                                className="w-[140px] bg-background"
                            >
                                <SelectValue placeholder="Semua Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    Semua Status
                                </SelectItem>
                                <SelectItem value="active">Aktif</SelectItem>
                                <SelectItem value="blocked">
                                    Ditangguhkan
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <Button onClick={() => openCreate()}>
                            <UserPlus className="size-4" strokeWidth={1.75} />
                            Tambah Pengguna
                        </Button>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[780px] border-collapse text-left text-sm">
                        <thead>
                            <tr className="border-t border-border">
                                <th
                                    scope="col"
                                    className="px-6 py-2.5 text-left label-mono"
                                >
                                    Nama & Email
                                </th>
                                <th
                                    scope="col"
                                    className="px-4 py-2.5 text-left label-mono"
                                >
                                    Role
                                </th>
                                <th
                                    scope="col"
                                    className="px-4 py-2.5 text-left label-mono"
                                >
                                    Status
                                </th>
                                <th
                                    scope="col"
                                    className="px-4 py-2.5 text-left label-mono"
                                >
                                    Token Bulan Ini
                                </th>
                                <th
                                    scope="col"
                                    className="px-6 py-2.5 text-right label-mono"
                                >
                                    Aksi
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.data.length === 0 ? (
                                <tr className="border-t border-border">
                                    <td
                                        colSpan={5}
                                        className="px-6 py-12 text-center text-muted-foreground"
                                    >
                                        Tidak ada pengguna ditemukan.
                                    </td>
                                </tr>
                            ) : (
                                users.data.map((user) => {
                                    // A zero quota divided by zero
                                    // used to render "NaN%".
                                    const quotaPercent =
                                        user.token_quota > 0
                                            ? Math.min(
                                                  100,
                                                  Math.round(
                                                      (user.used_tokens /
                                                          user.token_quota) *
                                                          100,
                                                  ),
                                              )
                                            : user.used_tokens > 0
                                              ? 100
                                              : 0;
                                    const isActive = user.status === 'active';

                                    return (
                                        <tr
                                            key={user.id}
                                            className="border-t border-border transition-colors hover:bg-muted/40"
                                        >
                                            <td className="h-[54px] px-6">
                                                <div className="flex items-center gap-3">
                                                    <span
                                                        aria-hidden="true"
                                                        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold"
                                                    >
                                                        {getInitials(user.name)}
                                                    </span>
                                                    <div className="flex min-w-0 flex-col">
                                                        <span className="truncate font-medium">
                                                            {user.name}
                                                        </span>
                                                        <span className="truncate text-xs text-muted-foreground">
                                                            {user.email}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4">
                                                {user.role === 'admin' ? (
                                                    <span className="inline-flex items-center gap-1.5 text-[13px] font-medium">
                                                        <Shield
                                                            className="size-3.5"
                                                            strokeWidth={1.75}
                                                            aria-hidden="true"
                                                        />
                                                        Admin
                                                    </span>
                                                ) : (
                                                    <span className="text-[13px] text-muted-foreground">
                                                        User
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4">
                                                <span
                                                    className={cn(
                                                        'inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium whitespace-nowrap',
                                                        isActive
                                                            ? 'bg-lime-100 text-lime-800 dark:bg-lime-950/60 dark:text-lime-300'
                                                            : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300',
                                                    )}
                                                >
                                                    <span
                                                        aria-hidden="true"
                                                        className={cn(
                                                            'size-1.5 rounded-full',
                                                            isActive
                                                                ? 'bg-lime-700 dark:bg-lime-400'
                                                                : 'bg-red-700 dark:bg-red-400',
                                                        )}
                                                    />
                                                    {isActive
                                                        ? 'Aktif'
                                                        : 'Ditangguhkan'}
                                                </span>
                                            </td>
                                            <td className="px-4">
                                                <div className="flex w-[220px] flex-col gap-1.5">
                                                    <div className="flex justify-between gap-3 font-mono text-xs">
                                                        <span>
                                                            {user.used_tokens.toLocaleString(
                                                                'id-ID',
                                                            )}{' '}
                                                            /{' '}
                                                            {user.token_quota.toLocaleString(
                                                                'id-ID',
                                                            )}
                                                        </span>
                                                        <span
                                                            className={
                                                                quotaPercent >=
                                                                90
                                                                    ? 'font-medium text-red-800 dark:text-red-300'
                                                                    : quotaPercent >=
                                                                        70
                                                                      ? 'font-medium text-amber-800 dark:text-amber-300'
                                                                      : 'text-muted-foreground'
                                                            }
                                                        >
                                                            {quotaPercent}%
                                                        </span>
                                                    </div>
                                                    <div
                                                        aria-hidden="true"
                                                        className="h-1 w-full bg-border"
                                                    >
                                                        <div
                                                            className={cn(
                                                                'h-1 transition-[width] duration-500',
                                                                quotaPercent >=
                                                                    90
                                                                    ? 'bg-red-700 dark:bg-red-400'
                                                                    : quotaPercent >=
                                                                        70
                                                                      ? 'bg-amber-700 dark:bg-amber-400'
                                                                      : 'bg-foreground',
                                                            )}
                                                            style={{
                                                                width: `${quotaPercent}%`,
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="pr-4 text-right">
                                                <div className="inline-flex gap-0.5">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="size-8"
                                                        aria-label={`Edit ${user.name}`}
                                                        onClick={() =>
                                                            handleEditClick(
                                                                user,
                                                            )
                                                        }
                                                    >
                                                        <Edit2
                                                            className="size-4"
                                                            strokeWidth={1.75}
                                                        />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                        aria-label={`Hapus ${user.name}`}
                                                        disabled={
                                                            user.id ===
                                                            auth.user.id
                                                        }
                                                        onClick={() =>
                                                            handleDeleteClick(
                                                                user,
                                                            )
                                                        }
                                                    >
                                                        <Trash2
                                                            className="size-4"
                                                            strokeWidth={1.75}
                                                        />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-3 text-sm text-muted-foreground">
                    <span>
                        {users.total === 0
                            ? '0 pengguna'
                            : `${users.from}–${users.to} dari ${users.total} pengguna`}
                    </span>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={!users.prev_page_url}
                            onClick={() => goToPage(users.prev_page_url)}
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Sebelumnya
                        </Button>
                        <span className="font-mono text-xs">
                            {users.current_page} / {users.last_page}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={!users.next_page_url}
                            onClick={() => goToPage(users.next_page_url)}
                        >
                            Berikutnya
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </section>

            {/* Waitlist */}
            <section
                aria-labelledby="waitlist-title"
                className="overflow-hidden rounded-xl border border-border bg-card"
            >
                <div className="px-4 py-3.5 lg:pl-6">
                    <h2 id="waitlist-title" className="text-base font-semibold">
                        Daftar Tunggu ({analytics.waitlist_count})
                    </h2>
                    <p className="text-[13px] text-muted-foreground">
                        Pengunjung yang meminta akses dari halaman depan. Buat
                        akun untuk mereka, lalu kabari lewat email.
                    </p>
                </div>
                {waitlist.length === 0 ? (
                    <p className="border-t border-border py-10 text-center text-sm text-muted-foreground">
                        Belum ada yang mendaftar.
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[680px] border-collapse text-left text-sm">
                            <thead>
                                <tr className="border-t border-border">
                                    <th
                                        scope="col"
                                        className="px-6 py-2.5 text-left label-mono"
                                    >
                                        Nama & Email
                                    </th>
                                    <th
                                        scope="col"
                                        className="px-4 py-2.5 text-left label-mono"
                                    >
                                        Catatan
                                    </th>
                                    <th
                                        scope="col"
                                        className="px-4 py-2.5 text-left label-mono"
                                    >
                                        Tanggal
                                    </th>
                                    <th
                                        scope="col"
                                        className="px-6 py-2.5 text-right label-mono"
                                    >
                                        Aksi
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {waitlist.map((entry) => (
                                    <tr
                                        key={entry.id}
                                        className="border-t border-border"
                                    >
                                        <td className="px-6 py-3">
                                            <div className="font-medium">
                                                {entry.name ?? '—'}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {entry.email}
                                            </div>
                                        </td>
                                        <td className="max-w-sm px-4 py-3 text-xs whitespace-pre-line">
                                            {entry.note ?? '—'}
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                                            {new Date(
                                                entry.created_at,
                                            ).toLocaleDateString('id-ID')}
                                        </td>
                                        <td className="py-3 pr-4 text-right">
                                            <div className="inline-flex items-center gap-1">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() =>
                                                        openCreate(entry)
                                                    }
                                                >
                                                    <UserPlus
                                                        className="h-4 w-4"
                                                        strokeWidth={1.75}
                                                    />
                                                    Buat akun
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                    aria-label={`Hapus ${entry.email} dari daftar tunggu`}
                                                    onClick={() =>
                                                        handleRemoveWaitlist(
                                                            entry,
                                                        )
                                                    }
                                                >
                                                    <Trash2
                                                        className="h-4 w-4"
                                                        strokeWidth={1.75}
                                                    />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* Create User Modal */}
            <Dialog open={isCreating} onOpenChange={setIsCreating}>
                <DialogContent className="bg-card sm:max-w-[425px]">
                    <form onSubmit={handleCreate}>
                        <DialogHeader>
                            <DialogTitle className={dialogTitleClasses}>
                                Tambah Pengguna
                            </DialogTitle>
                            <DialogDescription>
                                Registrasi publik ditutup. Sampaikan email dan
                                password awal ke pengguna secara langsung.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-5">
                            <div className="grid gap-2">
                                <Label
                                    htmlFor="create-name"
                                    className={fieldLabelClasses}
                                >
                                    Nama
                                </Label>
                                <Input
                                    id="create-name"
                                    value={createForm.data.name}
                                    onChange={(e) =>
                                        createForm.setData(
                                            'name',
                                            e.target.value,
                                        )
                                    }
                                    required
                                />
                                <InputError message={createForm.errors.name} />
                            </div>
                            <div className="grid gap-2">
                                <Label
                                    htmlFor="create-email"
                                    className={fieldLabelClasses}
                                >
                                    Email
                                </Label>
                                <Input
                                    id="create-email"
                                    type="email"
                                    value={createForm.data.email}
                                    onChange={(e) =>
                                        createForm.setData(
                                            'email',
                                            e.target.value,
                                        )
                                    }
                                    required
                                />
                                <InputError message={createForm.errors.email} />
                            </div>
                            <div className="grid gap-2">
                                <Label
                                    htmlFor="create-password"
                                    className={fieldLabelClasses}
                                >
                                    Password awal
                                </Label>
                                <Input
                                    id="create-password"
                                    type="text"
                                    autoComplete="new-password"
                                    className="font-mono"
                                    value={createForm.data.password}
                                    onChange={(e) =>
                                        createForm.setData(
                                            'password',
                                            e.target.value,
                                        )
                                    }
                                    required
                                />
                                <InputError
                                    message={createForm.errors.password}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label
                                    htmlFor="create-role"
                                    className={fieldLabelClasses}
                                >
                                    Role
                                </Label>
                                <Select
                                    value={createForm.data.role}
                                    onValueChange={(val) =>
                                        createForm.setData(
                                            'role',
                                            val as 'user' | 'admin',
                                        )
                                    }
                                >
                                    <SelectTrigger
                                        id="create-role"
                                        className="w-full"
                                    >
                                        <SelectValue placeholder="Pilih Role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="user">
                                            User (Normal)
                                        </SelectItem>
                                        <SelectItem value="admin">
                                            Admin (Akses Penuh)
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                <InputError message={createForm.errors.role} />
                            </div>
                            <div className="grid gap-2">
                                <Label
                                    htmlFor="create-quota"
                                    className={fieldLabelClasses}
                                >
                                    Kuota Token AI per Bulan
                                </Label>
                                <Input
                                    id="create-quota"
                                    type="number"
                                    min={0}
                                    className="font-mono"
                                    value={createForm.data.token_quota}
                                    onChange={(e) =>
                                        createForm.setData(
                                            'token_quota',
                                            e.target.value,
                                        )
                                    }
                                    required
                                />
                                <InputError
                                    message={createForm.errors.token_quota}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsCreating(false)}
                                disabled={createForm.processing}
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={createForm.processing}
                            >
                                {createForm.processing
                                    ? 'Membuat...'
                                    : 'Buat Akun'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit User Modal */}
            <Dialog
                open={editingUser !== null}
                onOpenChange={(open) => !open && setEditingUser(null)}
            >
                <DialogContent className="bg-card sm:max-w-[425px]">
                    <form onSubmit={handleSaveEdit}>
                        <DialogHeader>
                            <DialogTitle className={dialogTitleClasses}>
                                Edit Pengaturan Pengguna
                            </DialogTitle>
                            <DialogDescription>
                                Sesuaikan peranan, batas kuota token AI, dan
                                status penangguhan akun untuk{' '}
                                {editingUser?.name}.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-5">
                            <div className="grid gap-2">
                                <Label
                                    htmlFor="role"
                                    className={fieldLabelClasses}
                                >
                                    Peranan Sistem (Role)
                                </Label>
                                <Select
                                    value={editRole}
                                    onValueChange={(val) =>
                                        setEditRole(val as 'user' | 'admin')
                                    }
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Pilih Role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="user">
                                            User (Normal)
                                        </SelectItem>
                                        <SelectItem value="admin">
                                            Admin (Akses Penuh)
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label
                                    htmlFor="status"
                                    className={fieldLabelClasses}
                                >
                                    Status Akun
                                </Label>
                                <Select
                                    value={editStatus}
                                    onValueChange={(val) =>
                                        setEditStatus(
                                            val as 'active' | 'blocked',
                                        )
                                    }
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Pilih Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">
                                            Aktif (Dapat Mengakses Platform)
                                        </SelectItem>
                                        <SelectItem value="blocked">
                                            Tangguhkan (Akses Ditolak)
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label
                                    htmlFor="quota"
                                    className={fieldLabelClasses}
                                >
                                    Kuota Token AI per Bulan
                                </Label>
                                <Input
                                    id="quota"
                                    type="number"
                                    className="font-mono"
                                    value={editQuota}
                                    onChange={(e) =>
                                        setEditQuota(e.target.value)
                                    }
                                    placeholder="Masukkan limit token"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setEditingUser(null)}
                                disabled={isSaving}
                            >
                                Batal
                            </Button>
                            <Button type="submit" disabled={isSaving}>
                                {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Confirm Delete Dialog */}
            <Dialog
                open={deletingUser !== null}
                onOpenChange={(open) => !open && setDeletingUser(null)}
            >
                <DialogContent className="bg-card sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle
                            className={cn(
                                dialogTitleClasses,
                                'text-destructive',
                            )}
                        >
                            Konfirmasi Hapus Pengguna
                        </DialogTitle>
                        <DialogDescription className="pt-2">
                            Apakah Anda yakin ingin menghapus pengguna{' '}
                            <span className="font-medium text-foreground">
                                {deletingUser?.name}
                            </span>
                            ? Tindakan ini bersifat permanen: seluruh dokumen
                            PRD dan Mockups Design milik pengguna ini ikut
                            dihapus. Riwayat pemakaian token tetap disimpan agar
                            total biaya AI tetap akurat.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4">
                        <Button
                            variant="outline"
                            onClick={() => setDeletingUser(null)}
                            disabled={isDeleting}
                        >
                            Batal
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleConfirmDelete}
                            disabled={isDeleting}
                        >
                            {isDeleting ? 'Menghapus...' : 'Ya, Hapus Permanen'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
