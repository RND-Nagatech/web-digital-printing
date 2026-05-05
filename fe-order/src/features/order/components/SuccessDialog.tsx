import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Clock } from 'lucide-react';
import { formatIDR } from '@/utils/format';
import type { Order } from '@/types';

interface Props {
  order?: Order;
  onClose: () => void;
  onNew: () => void;
  onPrint: () => void;
}

export const SuccessDialog = ({ order, onClose, onNew, onPrint }: Props) => {
  const open = Boolean(order);
  const isPaid = order?.payment_status === 'paid';
  const isDp = order?.payment_status === 'dp';
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
            {isPaid
              ? <CheckCircle2 className="h-8 w-8 text-success" />
              : <Clock className="h-8 w-8 text-warning" />}
          </div>
          <DialogTitle className="text-center text-xl">
            {isPaid ? 'Order Berhasil Dibuat!' : isDp ? 'DP Diterima' : 'Order Tersimpan'}
          </DialogTitle>
          <DialogDescription className="text-center">
            {isPaid
              ? 'Pembayaran kami terima. Order akan segera diproses.'
              : isDp
                ? `DP diterima. Lunasi sisa pembayaran ${order?.sisa ? formatIDR(order.sisa) : ''} sebelum barang diambil.`
                : 'Silakan lakukan pembayaran maksimal 1×24 jam agar order diproses.'}
          </DialogDescription>
        </DialogHeader>
        {order && (
          <div className="space-y-2 rounded-xl bg-secondary/50 p-4 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">No. Faktur</span><span className="font-mono font-semibold">{order.no_faktur}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Pembayaran</span><span className="font-semibold capitalize">{order.payment_status === 'paid' ? 'Lunas' : order.payment_status === 'dp' ? 'DP' : 'Belum Bayar'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-semibold text-primary">{formatIDR(order.total)}</span></div>
          </div>
        )}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Button variant="outline" className="w-full" onClick={onClose}>Tutup</Button>
          <Button variant="destructive" className="w-full" onClick={onPrint}>Cetak Nota</Button>
          <Button className="w-full" onClick={onNew}>Order Lagi</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
