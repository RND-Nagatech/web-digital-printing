import { ReactNode, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Printer, ShieldCheck, Headphones, ShoppingCart, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import { CartService } from '@/services/cart.service';
import pesananIcon from '../../assets/pesanan.png';

interface Props { children: ReactNode }

export const MainLayout = ({ children }: Props) => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) {
      setCartCount(0);
      return;
    }

    let isMounted = true;
    const load = async () => {
      try {
        const data = await CartService.getMy();
        if (isMounted) setCartCount(data.total);
      } catch {
        if (isMounted) setCartCount(0);
      }
    };

    void load();
    const id = window.setInterval(() => {
      void load();
    }, 10000);

    return () => {
      isMounted = false;
      window.clearInterval(id);
    };
  }, [isAuthenticated, location.pathname]);

  const onLogout = () => {
    clearAuth();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-surface">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-lg">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
              <Printer className="h-5 w-5 text-primary-foreground" />
            </span>
            <div className="leading-tight">
              <p className="font-display text-base font-bold">PrintCo</p>
              <p className="text-[11px] text-muted-foreground">Order Banner Online</p>
            </div>
          </Link>

          <div className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-success" /> Pembayaran Aman</span>

          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <button
                  type="button"
                  onClick={() => navigate('/riwayat-pesanan')}
                  className={`inline-flex items-center justify-center p-0 ${location.pathname === '/riwayat-pesanan' ? 'text-primary' : 'text-foreground'} hover:text-primary`}
                  title="Riwayat Pesanan"
                  aria-label="Riwayat Pesanan"
                >
                  <img src={pesananIcon} alt="Pesanan" className="h-5 w-5 object-contain" loading="lazy" />
                </button>
                <button
                  id="cart-button"
                  type="button"
                  onClick={() => navigate('/pesanan')}
                  className={`relative inline-flex items-center justify-center p-0 ${location.pathname === '/pesanan' || cartCount > 0 ? 'text-primary' : 'text-foreground'} hover:text-primary`}
                  title="Keranjang"
                  aria-label="Keranjang"
                >
                  <ShoppingCart className="h-5 w-5" />
                  {cartCount > 0 && (
                    <span className="absolute -right-2 -top-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                      {cartCount > 99 ? '99+' : cartCount}
                    </span>
                  )}
                </button>
                <Button variant="ghost" size="sm" onClick={onLogout} title="Logout">
                  <LogOut className="mr-2 h-4 w-4" /> {user?.username ?? 'Logout'}
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>Login</Button>
                <Button size="sm" onClick={() => navigate('/register')}>Register</Button>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="container flex-1 py-8 md:py-10">{children}</main>
      <footer className="border-t border-border/60 py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} PrintCo. Semua hak dilindungi.
      </footer>
    </div>
  );
};
