import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { CustomerAuthService } from '@/services/customer-auth.service';
import { useAuthStore } from '@/store/authStore';

const RegisterPage = () => {
    const navigate = useNavigate();
    const setAuth = useAuthStore((s) => s.setAuth);

    const [form, setForm] = useState({
        email: '',
        username: '',
        password: '',
        nama: '',
        alamat: '',
        no_hp: '',
    });
    const [loading, setLoading] = useState(false);

    const onChange = (key: keyof typeof form, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.email || !form.username || !form.password || !form.nama || !form.alamat || !form.no_hp) {
            toast({ title: 'Semua field wajib diisi', variant: 'destructive' });
            return;
        }

        setLoading(true);
        try {
            const data = await CustomerAuthService.register(form);
            setAuth(data.access_token, data.user);
            toast({ title: `${data.user.kode_customer} berhasil terdaftar` });
            navigate('/', { replace: true });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Registrasi gagal';
            toast({ title: 'Registrasi gagal', description: message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mx-auto w-full max-w-md rounded-2xl border bg-card p-6 shadow-sm">
            <h1 className="text-2xl font-bold">Register Customer</h1>
            <p className="mt-1 text-sm text-muted-foreground">Buat akun customer untuk memesan dan tracking status.</p>

            <form className="mt-6 space-y-4" onSubmit={onSubmit}>
                <div className="space-y-1.5"><Label>Nama</Label><Input value={form.nama} onChange={(e) => onChange('nama', e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Alamat</Label><Input value={form.alamat} onChange={(e) => onChange('alamat', e.target.value)} /></div>
                <div className="space-y-1.5"><Label>No HP</Label><Input value={form.no_hp} onChange={(e) => onChange('no_hp', e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => onChange('email', e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Username</Label><Input value={form.username} onChange={(e) => onChange('username', e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Password</Label><Input type="password" value={form.password} onChange={(e) => onChange('password', e.target.value)} /></div>
                <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Menyimpan...' : 'Daftar'}</Button>
            </form>

            <p className="mt-4 text-center text-sm text-muted-foreground">
                Sudah punya akun? <Link className="font-semibold text-primary" to="/login">Login</Link>
            </p>
        </div>
    );
};

export default RegisterPage;
