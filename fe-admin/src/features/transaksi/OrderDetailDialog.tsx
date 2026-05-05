import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Order, OrderStatus } from '@/types/order';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge, PaymentBadge } from '@/components/common/StatusBadge';
import { ORDER_STATUSES } from '@/utils/constants';
import { formatIDR, formatDateTime } from '@/utils/formatters';
import { transaksiService } from '@/services/transaksi.service';
import { Image as ImageIcon, MessageCircle, Download, Upload, X, Wallet } from 'lucide-react';

interface Props { order: Order | null; onClose: () => void; onUpdated: () => void; }

export const OrderDetailDialog = ({ order, onClose, onUpdated }: Props) => {
  const [prodStatus, setProdStatus] = useState<OrderStatus | undefined>(order?.status);
  const [paymentMethod, setPaymentMethod] = useState<'transfer' | 'cash'>('transfer');
  const [prodSaving, setProdSaving] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [proofSaving, setProofSaving] = useState(false);
  const [showProof, setShowProof] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setProdStatus(order?.status);
    setPaymentMethod('transfer');
    setProofFile(null);
    setProofPreview(null);
  }, [order]);

  if (!order) return null;

  const settledMethodLabel = order.payment_settlement_method === 'cash'
    ? 'Tunai'
    : order.payment_settlement_method === 'transfer'
      ? 'Transfer'
      : order.payment_status === 'paid'
        ? (order.payment_proof ? 'Transfer' : 'Tunai')
        : null;

  const isProdChanged = prodStatus !== order.status;
  const canUploadProof = order.payment_status !== 'paid';

  const lineItems = (order.items?.length
    ? order.items
    : [{
      kode_bahan: order.kode_bahan,
      nama_bahan: order.kode_bahan,
      panjang: order.panjang,
      lebar: order.lebar,
      area: order.area,
      mata_ayam: order.mata_ayam,
      quantity: order.quantity,
      harga_satuan: order.quantity > 0 ? Math.round(order.harga_total / order.quantity) : order.harga_total,
      subtotal: order.harga_total,
    }]);

  const handleProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProofFile(file);
    setProofPreview(URL.createObjectURL(file));
  };

  const clearProof = () => {
    setProofFile(null);
    setProofPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getFileUrl = (path: string) => {
    const baseUrl = (import.meta.env.VITE_API_BASE_URL as string || '/api/v1').replace('/api/v1', '');
    return `${baseUrl}${path}`;
  };

  const downloadFile = (path: string, filename: string) => {
    const a = document.createElement('a');
    a.href = getFileUrl(path);
    a.download = filename;
    a.target = '_blank';
    a.rel = 'noopener';
    a.click();
  };

  const saveProdStatus = async () => {
    if (!prodStatus || !isProdChanged) return;
    setProdSaving(true);
    try {
      await transaksiService.updateStatus(order._id, prodStatus);
      toast.success('Status pengerjaan diperbarui');
      onUpdated();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal');
    } finally {
      setProdSaving(false);
    }
  };

  const confirmPayment = async () => {
    if (!proofFile) { toast.error('Pilih file bukti pembayaran terlebih dahulu'); return; }
    setProofSaving(true);
    try {
      await transaksiService.uploadPaymentProof(order._id, proofFile);
      toast.success('Pembayaran dikonfirmasi');
      onUpdated();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal');
    } finally {
      setProofSaving(false);
    }
  };

  const confirmCashPayment = async () => {
    setProofSaving(true);
    try {
      await transaksiService.settleCashPayment(order._id);
      toast.success('Pelunasan tunai berhasil dikonfirmasi');
      onUpdated();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal');
    } finally {
      setProofSaving(false);
    }
  };

  const sendWA = () => {
    const phone = order.no_hp.replace(/^0/, '62').replace(/\D/g, '');
    const prodLabel = ORDER_STATUSES.find((s) => s.value === order.status)?.label ?? order.status;
    const msg = encodeURIComponent(`Halo ${order.nama_customer}, pesanan ${order.no_faktur} (${prodLabel}) sudah siap. Total: ${formatIDR(order.harga_total)}.`);
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank', 'noopener');
  };

  const fileActions = [
    order.design_file
      ? {
        key: 'download-design',
        label: 'Download Design',
        className: 'bg-orange-500 hover:bg-orange-600 text-white border-0',
        onClick: () => downloadFile(order.design_file!, order.design_file!.split('/').pop() ?? 'design'),
        icon: <Download className="mr-2 h-4 w-4" />,
      }
      : null,
    order.payment_proof
      ? {
        key: 'download-proof',
        label: 'Download Bukti',
        className: 'bg-red-500 hover:bg-red-600 text-white border-0',
        onClick: () => downloadFile(order.payment_proof!, order.payment_proof!.split('/').pop() ?? 'bukti'),
        icon: <Download className="mr-2 h-4 w-4" />,
      }
      : null,
    order.payment_proof
      ? {
        key: 'view-proof',
        label: 'Lihat Bukti',
        className: 'bg-blue-500 hover:bg-blue-600 text-white border-0',
        onClick: () => setShowProof(true),
        icon: <ImageIcon className="mr-2 h-4 w-4" />,
      }
      : null,
    {
      key: 'follow-up-wa',
      label: 'Follow up WA',
      className: 'bg-green-500 hover:bg-green-600 text-white border-0',
      onClick: sendWA,
      icon: <MessageCircle className="mr-2 h-4 w-4" />,
    },
  ].filter((action): action is {
    key: string;
    label: string;
    className: string;
    onClick: () => void;
    icon: JSX.Element;
  } => action !== null);

  return (
    <>
      <Dialog open onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{order.no_faktur}</DialogTitle>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <StatusBadge status={order.status} />
              <PaymentBadge status={order.payment_status} />
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {/* Customer */}
            <div className="grid gap-3 sm:grid-cols-2 rounded-lg border bg-muted/30 p-4">
              <div><p className="text-xs text-muted-foreground">Pelanggan</p><p className="font-semibold">{order.nama_customer}</p></div>
              <div><p className="text-xs text-muted-foreground">No. HP</p><p className="font-semibold">{order.no_hp}</p></div>
              <div><p className="text-xs text-muted-foreground">Tanggal Order</p><p className="text-sm">{formatDateTime(order.created_at)}</p></div>
              <div><p className="text-xs text-muted-foreground">Alamat</p><p className="text-sm">{order.alamat}</p></div>
              {order.updated_date && (
                <div><p className="text-xs text-muted-foreground">Terakhir Diupdate</p><p className="text-sm">{formatDateTime(order.updated_date)}</p></div>
              )}
              {order.update_by && (
                <div><p className="text-xs text-muted-foreground">Diupdate Oleh</p><p className="text-sm font-medium">{order.update_by}</p></div>
              )}
            </div>

            {/* Order detail */}
            <div className="space-y-3 rounded-lg border bg-muted/30 p-4 text-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Detail Item Pesanan</p>
                <p className="text-xs text-muted-foreground">{lineItems.length} item</p>
              </div>

              <div className="space-y-2">
                {lineItems.map((item, idx) => (
                  <div key={`${item.kode_bahan}-${idx}`} className="rounded-md border bg-background px-3 py-2">
                    <div className="mb-1 flex items-start justify-between gap-3">
                      <p className="font-semibold">{item.nama_bahan || item.kode_bahan}</p>
                      <p className="font-semibold">{formatIDR(item.subtotal)}</p>
                    </div>
                    <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                      <p>Kode: <span className="font-medium text-foreground">{item.kode_bahan}</span></p>
                      <p>Ukuran: <span className="font-medium text-foreground">{item.panjang} x {item.lebar} m</span></p>
                      <p>Luas: <span className="font-medium text-foreground">{item.area} m²</span></p>
                      <p>Qty: <span className="font-medium text-foreground">{item.quantity} pcs</span></p>
                      <p>Mata Ayam: <span className="font-medium text-foreground">{item.mata_ayam || '-'}</span></p>
                      <p>Harga Satuan: <span className="font-medium text-foreground">{formatIDR(item.harga_satuan)}</span></p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between border-t pt-2 text-base font-bold"><span>Total</span><span className="text-primary">{formatIDR(order.harga_total)}</span></div>
              {order.payment_status === 'dp' && (
                <>
                  <div className="flex justify-between text-amber-700"><span>DP Dibayar</span><span className="font-semibold">{formatIDR(order.dp_amount ?? 0)}</span></div>
                  <div className="flex justify-between font-bold text-destructive"><span>Sisa Pelunasan</span><span>{formatIDR(order.sisa ?? 0)}</span></div>
                </>
              )}
              {(order.dibayar ?? 0) > 0 && (
                <div className="flex justify-between border-t pt-2 font-semibold text-success"><span>Dibayar</span><span>{formatIDR(order.dibayar ?? 0)}</span></div>
              )}
            </div>

            {/* File actions */}
            <div className="grid grid-cols-1 gap-2 rounded-lg border bg-muted/40 p-3 sm:grid-cols-2">
              {fileActions.map((action, idx) => {
                const isLastOdd = fileActions.length % 2 === 1 && idx === fileActions.length - 1;
                return (
                  <Button
                    key={action.key}
                    size="sm"
                    className={`w-full ${action.className} ${isLastOdd ? 'sm:col-span-2' : ''}`}
                    onClick={action.onClick}
                  >
                    {action.icon} {action.label}
                  </Button>
                );
              })}
            </div>

            <div className="grid gap-4 border-t pt-4 sm:grid-cols-2">
              {/* Status Pengerjaan */}
              <div className="space-y-3 rounded-lg border p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status Pengerjaan</p>
                <Select value={prodStatus} onValueChange={(v) => setProdStatus(v as OrderStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ORDER_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button
                  className="w-full gradient-primary text-primary-foreground"
                  onClick={saveProdStatus}
                  disabled={!isProdChanged || prodSaving}
                >
                  {prodSaving ? 'Menyimpan...' : 'Update Pengerjaan'}
                </Button>
              </div>

              {/* Status Pembayaran */}
              <div className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status Pembayaran</p>
                  <PaymentBadge status={order.payment_status} />
                </div>

                {settledMethodLabel && (
                  <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-xs">
                    <span className="text-muted-foreground">Metode Pelunasan</span>
                    <span className="font-semibold text-foreground">{settledMethodLabel}</span>
                  </div>
                )}

                {canUploadProof ? (
                  <>
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground">Metode pelunasan</p>
                      <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as 'transfer' | 'cash')}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="transfer">Transfer (upload bukti)</SelectItem>
                          <SelectItem value="cash">Tunai</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {paymentMethod === 'cash'
                        ? (order.payment_status === 'dp'
                          ? `Konfirmasi pelunasan tunai (sisa ${formatIDR(order.sisa ?? 0)})`
                          : 'Konfirmasi pembayaran tunai tanpa bukti transfer')
                        : (order.payment_status === 'dp'
                          ? `Upload bukti pelunasan (sisa ${formatIDR(order.sisa ?? 0)})`
                          : 'Upload bukti transfer untuk konfirmasi pembayaran')}
                    </p>

                    <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png" className="hidden" onChange={handleProofChange} />

                    {paymentMethod === 'cash' ? (
                      <Button className="w-full" onClick={confirmCashPayment} disabled={proofSaving}>
                        <Wallet className="mr-2 h-4 w-4" />
                        {proofSaving ? 'Menyimpan...' : 'Konfirmasi Tunai'}
                      </Button>
                    ) : proofPreview ? (
                      <div className="space-y-2">
                        <div className="relative w-fit">
                          <img src={proofPreview} alt="Preview" className="max-h-32 rounded-md border object-cover" />
                          <button onClick={clearProof} className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white shadow">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                        <Button className="w-full" onClick={confirmPayment} disabled={proofSaving}>
                          <Wallet className="mr-2 h-4 w-4" />
                          {proofSaving ? 'Menyimpan...' : 'Konfirmasi Pembayaran'}
                        </Button>
                      </div>
                    ) : (
                      <Button variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="mr-2 h-4 w-4" /> Pilih Bukti (JPG/PNG)
                      </Button>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-success font-medium">Pembayaran telah lunas ✓</p>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showProof} onOpenChange={setShowProof}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>Bukti Transfer — {order.no_faktur}</DialogTitle></DialogHeader>
          {order.payment_proof && <img src={getFileUrl(order.payment_proof)} alt="Bukti transfer" className="w-full rounded-md" />}
        </DialogContent>
      </Dialog>
    </>
  );
};
