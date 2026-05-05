import { useFormContext } from 'react-hook-form';
import { Textarea } from '@/components/ui/textarea';
import type { OrderFormValues } from '../orderSchema';

export const NotesSection = () => {
  const { register, formState: { errors } } = useFormContext<OrderFormValues>();
  return (
    <div>
      <Textarea
        rows={4}
        placeholder="Contoh: tolong dikirim besok, packing rapat, dll."
        {...register('notes')}
      />
      {errors.notes && <p className="mt-1 text-sm text-destructive">{errors.notes.message}</p>}
    </div>
  );
};
