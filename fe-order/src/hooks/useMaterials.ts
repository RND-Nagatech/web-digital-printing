import { useQuery } from '@tanstack/react-query';
import { ProdukService } from '@/services/produk.service';

export const useMaterials = () =>
  useQuery({
    queryKey: ['materials'],
    queryFn: ProdukService.getMaterials,
    staleTime: 10 * 1000,
    refetchInterval: 10 * 1000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });

export const useMataAyam = () =>
  useQuery({ queryKey: ['mata-ayam'], queryFn: ProdukService.getMataAyamOptions, staleTime: 5 * 60 * 1000 });
