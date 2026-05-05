import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, RefreshCw, QrCode } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { whatsappService } from '@/services/whatsapp.service';
import { WhatsAppSetting } from '@/types/order';

export default function WhatsAppSettingPage() {
  const [setting, setSetting] = useState<WhatsAppSetting | null>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);

  const loadStatus = async () => {
    const data = await whatsappService.getSetting();
    setSetting(data);
    if (data.connected) setQrImage(null);
    return data;
  };

  useEffect(() => {
    let cancelled = false;

    const initStatus = async () => {
      try {
        const current = await loadStatus();
        if (cancelled || current.connected) return;

        // Try to restore an existing linked session before showing disconnected UI.
        await whatsappService.connect();

        if (cancelled) return;
        const refreshed = await loadStatus();
        if (cancelled || refreshed.connected) return;

        const qr = await whatsappService.getQr();
        if (!cancelled) setQrImage(qr.qrImage);
      } catch {
        if (!cancelled) toast.error('Gagal memuat status WhatsApp');
      }
    };

    initStatus();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!setting || setting.connected) return;
    const timer = setInterval(async () => {
      const qr = await whatsappService.getQr();
      setQrImage(qr.qrImage);
      await loadStatus();
    }, 3000);
    return () => clearInterval(timer);
  }, [setting?.connected]);

  if (!setting) return null;

  const connect = async () => {
    try {
      setIsGeneratingQr(true);
      await whatsappService.connect();

      let image: string | null = null;
      for (let i = 0; i < 10; i += 1) {
        const qr = await whatsappService.getQr();
        image = qr.qrImage;
        if (image) break;
        await new Promise((resolve) => setTimeout(resolve, 800));
      }

      if (!image) {
        toast.error('QR belum tersedia, coba Generate QR sekali lagi');
        return;
      }

      setQrImage(image);
      toast.success('QR berhasil dibuat, silakan scan di WhatsApp user');
      await loadStatus();
    } catch {
      toast.error('Gagal generate QR');
    } finally {
      setIsGeneratingQr(false);
    }
  };

  const disconnect = async () => {
    await whatsappService.disconnect();
    setQrImage(null);
    await loadStatus();
    toast.success('Perangkat WhatsApp diputuskan');
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border border-border/70 shadow-card">
        <CardHeader className="rounded-none bg-slate-800 px-6 py-4">
          <CardTitle className="text-xl font-semibold text-white">Setting WhatsApp</CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          <div className="p-6">
            <div className="flex flex-col gap-4 rounded-md border bg-muted/30 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-full ${setting.connected ? 'bg-success/10' : 'bg-destructive/10'}`}>
                  {setting.connected ? <CheckCircle2 className="h-6 w-6 text-success" /> : <XCircle className="h-6 w-6 text-destructive" />}
                </div>
                <div>
                  <p className="font-semibold">{setting.connected ? 'Terhubung' : 'Tidak Terhubung'}</p>
                  <p className="text-sm text-muted-foreground">{setting.phoneNumber}</p>
                </div>
              </div>
              <div className="flex gap-2">
                {!setting.connected ? (
                  <Button variant="outline" onClick={connect}><QrCode className="mr-2 h-4 w-4" />Generate QR</Button>
                ) : (
                  <Button variant="outline" onClick={disconnect}><RefreshCw className="mr-2 h-4 w-4" />Putuskan</Button>
                )}
              </div>
            </div>

            {!setting.connected && (
              <div className="mt-4 rounded-md border bg-muted/20 p-5">
                <p className="mb-3 text-sm font-semibold">Scan QR</p>
                <div className="flex flex-col items-center gap-3">
                  {qrImage ? (
                    <img src={qrImage} alt="WhatsApp QR" className="h-64 w-64 rounded-md border bg-white p-2" />
                  ) : (
                    <div className="flex h-64 w-64 items-center justify-center rounded-md border bg-white p-2 text-center text-sm text-muted-foreground">
                      {isGeneratingQr ? 'Sedang membuat QR...' : 'Klik Generate QR untuk menampilkan kode.'}
                    </div>
                  )}
                  <p className="text-center text-sm text-muted-foreground">
                    Buka WhatsApp user {'>'} Perangkat Tertaut {'>'} Tautkan Perangkat {'>'} Scan QR ini.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
