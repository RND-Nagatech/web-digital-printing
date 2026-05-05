import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useAuthStore } from "@/store/auth.store";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import loginImage from "../../../assets/login_logo.png";

const REMEMBER_CREDENTIALS_KEY = "admin-remember-credentials";

const getRememberedCredentials = () => {
  const raw = localStorage.getItem(REMEMBER_CREDENTIALS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { email?: string; password?: string };
  } catch {
    localStorage.removeItem(REMEMBER_CREDENTIALS_KEY);
    return null;
  }
};

const schema = z.object({
  email: z.string().trim().email("Email tidak valid").max(255),
  password: z.string().min(6, "Password minimal 6 karakter").max(72),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const loading = useAuthStore((s) => s.loading);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    const remembered = getRememberedCredentials();
    if (remembered?.email || remembered?.password) {
      reset({ email: remembered.email ?? "", password: remembered.password ?? "" });
      setRememberMe(true);
    } else {
      setRememberMe(false);
    }
  }, [reset]);

  const onSubmit = async (data: FormData) => {
    try {
      await login(data.email, data.password, rememberMe);

      if (rememberMe) {
        localStorage.setItem(
          REMEMBER_CREDENTIALS_KEY,
          JSON.stringify({ email: data.email, password: data.password }),
        );
      } else {
        localStorage.removeItem(REMEMBER_CREDENTIALS_KEY);
      }

      toast.success("Berhasil masuk");
      navigate("/dashboard", { replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal masuk");
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-100">
      <img src={loginImage} alt="Digital Printing" className="absolute inset-0 h-full w-full object-cover object-[45%_center]" />
      <div className="absolute inset-0 bg-white/10" />

      <div className="relative z-10 flex min-h-screen items-center justify-end p-4 sm:p-8 lg:p-14">
        <Card className="w-full max-w-md rounded-2xl border border-white/70 bg-white/95 p-8 shadow-2xl">
          <h1 className="text-4xl font-semibold tracking-tight text-slate-800">Selamat Datang</h1>
          <p className="mt-2 text-base text-slate-500">Silakan masuk untuk melanjutkan</p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-600">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Masukkan email Anda"
                className="h-11 bg-white"
                {...register("email")}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-600">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Masukkan password"
                  className="h-11 bg-white pr-11"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                  aria-label={showPassword ? "Sembunyikan password" : "Lihat password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            <div className="flex items-center gap-2">
              <input
                id="remember-me-admin"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-cyan-600"
              />
              <Label htmlFor="remember-me-admin" className="cursor-pointer text-sm text-slate-600">Remember me</Label>
            </div>

            <Button
              type="submit"
              className="h-11 w-full bg-cyan-600 text-base font-semibold text-white hover:bg-cyan-700"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Masuk
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
