import { Head, router } from '@inertiajs/react';
import {
    Cpu,
    Edit2,
    FileText,
    LayoutTemplate,
    Search,
    Shield,
    Trash2,
    Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
};

type Props = {
    auth: Auth;
    users: DashboardUser[];
    analytics: Analytics;
};

export default function Dashboard({ auth, users, analytics }: Props) {
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'admin'>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked'>('all');

    // Editing user state
    const [editingUser, setEditingUser] = useState<DashboardUser | null>(null);
    const [editRole, setEditRole] = useState<'user' | 'admin'>('user');
    const [editStatus, setEditStatus] = useState<'active' | 'blocked'>('active');
    const [editQuota, setEditQuota] = useState('100000');
    const [isSaving, setIsSaving] = useState(false);

    // Deleting user state
    const [deletingUser, setDeletingUser] = useState<DashboardUser | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const filteredUsers = useMemo(() => {
        return users.filter((u) => {
            const matchesSearch =
                u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                u.email.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesRole = roleFilter === 'all' ? true : u.role === roleFilter;
            const matchesStatus = statusFilter === 'all' ? true : u.status === statusFilter;

            return matchesSearch && matchesRole && matchesStatus;
        });
    }, [users, searchQuery, roleFilter, statusFilter]);

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
                    const message = Object.values(errors).join(', ') || 'Gagal memperbarui user.';
                    toast.error(message);
                },
                onFinish: () => setIsSaving(false),
            }
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

    return (
        <div className="flex flex-col gap-6 p-6">
            <Head title="Admin Dashboard" />

            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                    Admin Dashboard
                </h1>
                <p className="text-neutral-500 dark:text-neutral-400">
                    Pantau statistik sistem dan kelola hak akses, kuota, serta status pengguna.
                </p>
            </div>

            {/* Statistics Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Pengguna</CardTitle>
                        <Users className="h-4 w-4 text-neutral-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-500">{analytics.total_users}</div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">Pengguna terdaftar di platform</p>
                    </CardContent>
                </Card>

                <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Token AI</CardTitle>
                        <Cpu className="h-4 w-4 text-neutral-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-500">
                            {analytics.total_tokens.toLocaleString('id-ID')}
                        </div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">Konsumsi total token AI</p>
                    </CardContent>
                </Card>

                <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Dokumen PRD</CardTitle>
                        <FileText className="h-4 w-4 text-neutral-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-500">{analytics.total_prds}</div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">Total PRD yang telah digenerate</p>
                    </CardContent>
                </Card>

                <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Design Mockups</CardTitle>
                        <LayoutTemplate className="h-4 w-4 text-neutral-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-500">{analytics.total_designs}</div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">Total design studio yang dibuat</p>
                    </CardContent>
                </Card>
            </div>

            {/* User Management Section */}
            <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg">Manajemen Pengguna</CardTitle>
                    <CardDescription>
                        Kelola data pengguna, perbarui batasan token, aktifkan/nonaktifkan akun, dan lainnya.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Search & Filters */}
                    <div className="flex flex-col gap-3 md:flex-row md:items-center justify-between">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-400" />
                            <Input
                                placeholder="Cari nama atau email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Select
                                value={roleFilter}
                                onValueChange={(val) => setRoleFilter(val as any)}
                            >
                                <SelectTrigger className="w-[140px]">
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
                                onValueChange={(val) => setStatusFilter(val as any)}
                            >
                                <SelectTrigger className="w-[140px]">
                                    <SelectValue placeholder="Semua Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Status</SelectItem>
                                    <SelectItem value="active">Aktif</SelectItem>
                                    <SelectItem value="blocked">Ditangguhkan</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
                        <table className="w-full text-left text-sm text-neutral-700 dark:text-neutral-300">
                            <thead className="bg-neutral-50 dark:bg-neutral-900 text-xs font-semibold uppercase tracking-wider text-neutral-500 border-b border-neutral-200 dark:border-neutral-800">
                                <tr>
                                    <th className="px-6 py-4">Nama & Email</th>
                                    <th className="px-6 py-4">Role</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Token Digunakan</th>
                                    <th className="px-6 py-4 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 bg-white dark:bg-transparent">
                                {filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-neutral-400">
                                            Tidak ada pengguna ditemukan.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUsers.map((user) => {
                                        const quotaPercent = Math.min(
                                            100,
                                            Math.round((user.used_tokens / user.token_quota) * 100)
                                        );

                                        return (
                                            <tr
                                                key={user.id}
                                                className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/10 transition-colors"
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                                                        {user.name}
                                                    </div>
                                                    <div className="text-xs text-neutral-400">
                                                        {user.email}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Badge
                                                        variant={
                                                            user.role === 'admin'
                                                                ? 'default'
                                                                : 'secondary'
                                                        }
                                                        className="gap-1 font-medium"
                                                    >
                                                        {user.role === 'admin' && (
                                                            <Shield className="h-3 w-3" />
                                                        )}
                                                        {user.role}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Badge
                                                        variant={
                                                            user.status === 'active'
                                                                ? 'outline'
                                                                : 'destructive'
                                                        }
                                                        className={`font-semibold ${
                                                            user.status === 'active'
                                                                ? 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800'
                                                                : ''
                                                        }`}
                                                    >
                                                        {user.status === 'active'
                                                            ? 'Aktif'
                                                            : 'Ditangguhkan'}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4 max-w-xs">
                                                    <div className="flex flex-col gap-1.5">
                                                        <div className="flex justify-between text-xs font-medium">
                                                            <span>
                                                                {user.used_tokens.toLocaleString('id-ID')} /{' '}
                                                                {user.token_quota.toLocaleString('id-ID')}
                                                            </span>
                                                            <span
                                                                className={
                                                                    quotaPercent >= 90
                                                                        ? 'text-red-500 font-bold'
                                                                        : 'text-neutral-400'
                                                                }
                                                            >
                                                                {quotaPercent}%
                                                            </span>
                                                        </div>
                                                        <div className="h-1.5 w-full bg-neutral-150 dark:bg-neutral-800 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all duration-500 ${
                                                                    quotaPercent >= 90
                                                                        ? 'bg-red-500'
                                                                        : quotaPercent >= 70
                                                                          ? 'bg-amber-500'
                                                                          : 'bg-primary'
                                                                }`}
                                                                style={{ width: `${quotaPercent}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
                                                            onClick={() => handleEditClick(user)}
                                                        >
                                                            <Edit2 className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-neutral-400 hover:text-red-600 disabled:opacity-50"
                                                            disabled={user.id === auth.user.id}
                                                            onClick={() => handleDeleteClick(user)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
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
                </CardContent>
            </Card>

            {/* Edit User Modal */}
            <Dialog open={editingUser !== null} onOpenChange={(open) => !open && setEditingUser(null)}>
                <DialogContent className="sm:max-w-[425px]">
                    <form onSubmit={handleSaveEdit}>
                        <DialogHeader>
                            <DialogTitle>Edit Pengaturan Pengguna</DialogTitle>
                            <DialogDescription>
                                Sesuaikan peranan, batas kuota token AI, dan status penangguhan akun untuk {editingUser?.name}.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="role">Peranan Sistem (Role)</Label>
                                <Select
                                    value={editRole}
                                    onValueChange={(val) => setEditRole(val as any)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih Role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="user">User (Normal)</SelectItem>
                                        <SelectItem value="admin">Admin (Akses Penuh)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="status">Status Akun</Label>
                                <Select
                                    value={editStatus}
                                    onValueChange={(val) => setEditStatus(val as any)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Aktif (Dapat Mengakses Platform)</SelectItem>
                                        <SelectItem value="blocked">Tangguhkan (Akses Ditolak)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="quota">Kuota Batas Token AI</Label>
                                <Input
                                    id="quota"
                                    type="number"
                                    value={editQuota}
                                    onChange={(e) => setEditQuota(e.target.value)}
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
            <Dialog open={deletingUser !== null} onOpenChange={(open) => !open && setDeletingUser(null)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-500">
                            <Trash2 className="h-5 w-5" />
                            Konfirmasi Hapus Pengguna
                        </DialogTitle>
                        <DialogDescription className="pt-2">
                            Apakah Anda yakin ingin menghapus pengguna <span className="font-semibold text-neutral-900 dark:text-neutral-100">{deletingUser?.name}</span>?
                            Tindakan ini bersifat permanen dan seluruh dokumen PRD, Mockups Design, serta riwayat token milik pengguna ini akan dihapus secara total dari database.
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
