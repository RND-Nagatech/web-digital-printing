import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOrderStore } from '@/store/orderStore';

const MAX_SIZE = 50 * 1024 * 1024;
const ACCEPT = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'application/pdf': ['.pdf'],
  'application/zip': ['.zip'],
};

export const DesignUploadSection = () => {
  const designFile = useOrderStore((s) => s.designFile);
  const setDesignFile = useOrderStore((s) => s.setDesignFile);
  const [error, setError] = useState<string | undefined>();
  const [previewUrl, setPreviewUrl] = useState<string | undefined>();

  const onDrop = useCallback((accepted: File[], rejected: any[]) => {
    setError(undefined);
    if (rejected.length > 0) {
      setError(rejected[0]?.errors?.[0]?.message ?? 'File ditolak');
      return;
    }
    const file = accepted[0];
    if (!file) return;
    if (file.size > MAX_SIZE) { setError('Ukuran maksimal 50MB'); return; }
    setDesignFile(file);
  }, [setDesignFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, maxSize: MAX_SIZE, multiple: false, accept: ACCEPT,
  });

  useEffect(() => {
    if (designFile && designFile.type.startsWith('image/')) {
      const url = URL.createObjectURL(designFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl(undefined);
  }, [designFile]);

  const sizeLabel = useMemo(
    () => designFile ? `${(designFile.size / 1024 / 1024).toFixed(2)} MB` : '',
    [designFile]
  );

  return (
    <div className="space-y-3">
      {!designFile && (
        <div
          {...getRootProps()}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors',
            isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-secondary/40'
          )}
        >
          <input {...getInputProps()} />
          <UploadCloud className="mb-2 h-10 w-10 text-primary" />
          <p className="font-medium">Drag & drop design di sini</p>
          <p className="mt-1 text-sm text-muted-foreground">atau klik untuk pilih file</p>
          <p className="mt-3 text-xs text-muted-foreground">PDF, JPG, PNG, ZIP — maks 50MB</p>
        </div>
      )}

      {designFile && (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary/40 p-3 animate-scale-in">
          {previewUrl ? (
            <img src={previewUrl} alt="preview" className="h-16 w-16 rounded-lg object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10">
              <FileIcon className="h-7 w-7 text-primary" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{designFile.name}</p>
            <p className="text-xs text-muted-foreground">{sizeLabel}</p>
          </div>
          <button
            type="button"
            onClick={() => setDesignFile(undefined)}
            className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            aria-label="Hapus file"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
};
