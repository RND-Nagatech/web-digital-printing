import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { CustomerAuthService } from '@/services/customer-auth.service';
import { useAuthStore } from '@/store/authStore';
import { Eye, EyeOff } from 'lucide-react';
import loginImage from '../../assets/login_logo.png';

const REMEMBER_CREDENTIALS_KEY = 'order-remember-credentials';

const LoginPage = () => {
    const navigate = useNavigate();
    const location = useLocation() as { state?: { from?: string } };
    const from = location.state?.from || '/';
    const setAuth = useAuthStore((s) => s.setAuth);
    const [isRegisterMode, setIsRegisterMode] = useState(false);

    const [emailOrUsername, setEmailOrUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showLoginPassword, setShowLoginPassword] = useState(false);
    const [showRegisterPassword, setShowRegisterPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [registerForm, setRegisterForm] = useState({
        email: '',
        username: '',
        password: '',
        nama: '',
        alamat: '',
        no_hp: '',
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const raw = localStorage.getItem(REMEMBER_CREDENTIALS_KEY);
        if (!raw) return;

        try {
            const parsed = JSON.parse(raw) as { emailOrUsername?: string; password?: string };
            if (parsed.emailOrUsername) setEmailOrUsername(parsed.emailOrUsername);
            if (parsed.password) setPassword(parsed.password);
            if (parsed.emailOrUsername || parsed.password) setRememberMe(true);
        } catch {
            localStorage.removeItem(REMEMBER_CREDENTIALS_KEY);
        }
    }, []);

    useEffect(() => {
        const prevBodyOverflow = document.body.style.overflow;
        const prevHtmlOverflow = document.documentElement.style.overflow;
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prevBodyOverflow;
            document.documentElement.style.overflow = prevHtmlOverflow;
        };
    }, []);

    const onRegisterChange = (key: keyof typeof registerForm, value: string) => {
        setRegisterForm((prev) => ({ ...prev, [key]: value }));
    };

    const onLoginSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!emailOrUsername.trim() || !password) {
            toast({ title: 'Lengkapi username/email dan password', variant: 'destructive' });
            return;
        }

        setLoading(true);
        try {
            const data = await CustomerAuthService.login({ emailOrUsername, password });
            setAuth(data.access_token, data.user, rememberMe);

            if (rememberMe) {
                localStorage.setItem(
                    REMEMBER_CREDENTIALS_KEY,
                    JSON.stringify({ emailOrUsername, password }),
                );
            } else {
                localStorage.removeItem(REMEMBER_CREDENTIALS_KEY);
            }

            toast({ title: `Selamat datang, ${data.user.nama}` });
            navigate(from, { replace: true });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Login gagal';
            toast({ title: 'Login gagal', description: message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const onRegisterSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!registerForm.email || !registerForm.username || !registerForm.password || !registerForm.nama || !registerForm.alamat || !registerForm.no_hp) {
            toast({ title: 'Semua field wajib diisi', variant: 'destructive' });
            return;
        }

        setLoading(true);
        try {
            const data = await CustomerAuthService.register(registerForm);
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
        <div className="relative h-dvh overflow-hidden bg-slate-100">
            <img src={loginImage} alt="Digital Printing" className="absolute inset-0 h-full w-full object-cover object-[45%_center]" />
            <div className="absolute inset-0 bg-white/10" />

            <div className="relative z-10 flex h-dvh items-center justify-center p-4 sm:p-8 lg:justify-end lg:p-14">
                <div className="flex h-full w-full max-w-md flex-col rounded-2xl border border-white/70 bg-white/95 p-5 shadow-2xl sm:max-h-[calc(100dvh-4rem)] sm:p-8">
                    <h1 className="text-3xl font-semibold tracking-tight text-slate-800 sm:text-4xl">{isRegisterMode ? 'Buat Akun' : 'Selamat Datang'}</h1>
                    <p className="mt-2 text-base text-slate-500">
                        {isRegisterMode ? 'Isi data untuk membuat akun baru' : 'Silakan masuk untuk melanjutkan'}
                    </p>

                    <div className="mt-8 flex-1 overflow-y-auto pr-1">
                    {isRegisterMode ? (
                        <form className="space-y-4" onSubmit={onRegisterSubmit}>
                            <div className="space-y-2">
                                <Label className="text-slate-600">Nama</Label>
                                <Input value={registerForm.nama} onChange={(e) => onRegisterChange('nama', e.target.value)} className="h-11 bg-white" placeholder="Masukkan nama" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-600">Alamat</Label>
                                <Input value={registerForm.alamat} onChange={(e) => onRegisterChange('alamat', e.target.value)} className="h-11 bg-white" placeholder="Masukkan alamat" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-600">No HP</Label>
                                <Input value={registerForm.no_hp} onChange={(e) => onRegisterChange('no_hp', e.target.value)} className="h-11 bg-white" placeholder="Masukkan no hp" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-600">Email</Label>
                                <Input type="email" value={registerForm.email} onChange={(e) => onRegisterChange('email', e.target.value)} className="h-11 bg-white" placeholder="Masukkan email" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-600">Username</Label>
                                <Input value={registerForm.username} onChange={(e) => onRegisterChange('username', e.target.value)} className="h-11 bg-white" placeholder="Masukkan username" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-600">Password</Label>
                                <div className="relative">
                                    <Input
                                        type={showRegisterPassword ? 'text' : 'password'}
                                        value={registerForm.password}
                                        onChange={(e) => onRegisterChange('password', e.target.value)}
                                        className="h-11 bg-white pr-11"
                                        placeholder="Masukkan password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowRegisterPassword((prev) => !prev)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                                        aria-label={showRegisterPassword ? 'Sembunyikan password' : 'Lihat password'}
                                    >
                                        {showRegisterPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                            <Button type="submit" className="h-11 w-full bg-cyan-600 text-base font-semibold text-white hover:bg-cyan-700" disabled={loading}>
                                {loading ? 'Menyimpan...' : 'Daftar'}
                            </Button>
                        </form>
                    ) : (
                        <form className="space-y-5" onSubmit={onLoginSubmit}>
                            <div className="space-y-2">
                                <Label className="text-slate-600">Username atau Email</Label>
                                <Input
                                    value={emailOrUsername}
                                    onChange={(e) => setEmailOrUsername(e.target.value)}
                                    className="h-11 bg-white"
                                    placeholder="Masukkan username atau email"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-600">Password</Label>
                                <div className="relative">
                                    <Input
                                        type={showLoginPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="h-11 bg-white pr-11"
                                        placeholder="Masukkan password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowLoginPassword((prev) => !prev)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                                        aria-label={showLoginPassword ? 'Sembunyikan password' : 'Lihat password'}
                                    >
                                        {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    id="remember-me-order"
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="h-4 w-4 rounded border-border accent-cyan-600"
                                />
                                <Label htmlFor="remember-me-order" className="cursor-pointer text-sm text-slate-600">Remember me</Label>
                            </div>
                            <Button type="submit" className="h-11 w-full bg-cyan-600 text-base font-semibold text-white hover:bg-cyan-700" disabled={loading}>
                                {loading ? 'Memproses...' : 'Masuk'}
                            </Button>
                        </form>
                    )}
                    </div>

                    <p className="mt-6 text-center text-sm text-muted-foreground">
                        {isRegisterMode ? 'Sudah punya akun? ' : 'Belum punya akun? '}
                        <button
                            type="button"
                            className="font-semibold text-cyan-600 hover:text-cyan-700"
                            onClick={() => setIsRegisterMode((prev) => !prev)}
                        >
                            {isRegisterMode ? 'Masuk sekarang' : 'Daftar sekarang'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
