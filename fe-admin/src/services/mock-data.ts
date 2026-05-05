import { Material, ChickenEye, Banner } from "@/types/material";
import { Order, CashEntry, AutoReplyRule } from "@/types/order";
import { User } from "@/types/user";

export const mockUsers: User[] = [
  { id: "u1", name: "Admin Utama", email: "admin@printflow.id", phone: "081234567890", role: "admin", active: true, createdAt: "2025-01-10" },
  { id: "u2", name: "Bapak Owner", email: "owner@printflow.id", phone: "081234567891", role: "owner", active: true, createdAt: "2025-01-12" },
  { id: "u3", name: "Sinta Kasir", email: "kasir@printflow.id", phone: "081234567892", role: "kasir", active: true, createdAt: "2025-02-01" },
  { id: "u4", name: "Budi Operator", email: "budi@printflow.id", phone: "081234567893", role: "kasir", active: true, createdAt: "2025-02-15" },
  { id: "u5", name: "Rina Desainer", email: "rina@printflow.id", phone: "081234567894", role: "kasir", active: false, createdAt: "2025-03-02" },
];

export const mockMaterials: Material[] = [
  { id: "m1", name: "Flexi China 280gr", category: "Banner", unit: "m²", pricePerUnit: 18000, stock: 240, minStock: 50, active: true, createdAt: "2025-01-05" },
  { id: "m2", name: "Flexi Korea 340gr", category: "Banner", unit: "m²", pricePerUnit: 25000, stock: 120, minStock: 40, active: true, createdAt: "2025-01-05" },
  { id: "m3", name: "Stiker Vinyl Glossy", category: "Stiker", unit: "m²", pricePerUnit: 35000, stock: 80, minStock: 20, active: true, createdAt: "2025-01-06" },
  { id: "m4", name: "Stiker Oneway", category: "Stiker", unit: "m²", pricePerUnit: 55000, stock: 30, minStock: 15, active: true, createdAt: "2025-01-06" },
  { id: "m5", name: "Albatros 230gr", category: "Bahan Indoor", unit: "m²", pricePerUnit: 32000, stock: 60, minStock: 20, active: true, createdAt: "2025-01-07" },
  { id: "m6", name: "Backlite Film", category: "Bahan Indoor", unit: "m²", pricePerUnit: 75000, stock: 18, minStock: 10, active: true, createdAt: "2025-01-08" },
  { id: "m7", name: "Art Paper 150gr A3+", category: "Digital", unit: "lembar", pricePerUnit: 3500, stock: 1200, minStock: 200, active: true, createdAt: "2025-01-09" },
];

export const mockChickenEyes: ChickenEye[] = [
  { id: "e1", name: "Mata Ayam Standard", size: "11mm", price: 1500, stock: 800, active: true, createdAt: "2025-01-05" },
  { id: "e2", name: "Mata Ayam Besar", size: "16mm", price: 2500, stock: 400, active: true, createdAt: "2025-01-05" },
  { id: "e3", name: "Mata Ayam Premium", size: "11mm", price: 3000, stock: 200, active: true, createdAt: "2025-01-06" },
];

export const mockBanners: Banner[] = [
  { id: "b1", title: "Promo Cetak Banner Murah", imageUrl: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800", link: "/promo/banner", position: 1, active: true, createdAt: "2025-04-01" },
  { id: "b2", title: "Diskon Stiker 20%", imageUrl: "https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800", link: "/promo/stiker", position: 2, active: true, createdAt: "2025-04-05" },
  { id: "b3", title: "Free Desain Setiap Order", imageUrl: "https://images.unsplash.com/photo-1626785774625-ddcddc3445e9?w=800", position: 3, active: false, createdAt: "2025-04-10" },
];

const today = new Date();
const daysAgo = (n: number) => new Date(today.getTime() - n * 86400000).toISOString();

export const mockOrders: Order[] = Array.from({ length: 18 }).map((_, i) => {
  const w = 1 + (i % 4);
  const h = 2 + (i % 3);
  const qty = 1 + (i % 3);
  const price = 25000;
  const subtotal = w * h * qty * price;
  const discount = i % 5 === 0 ? 10000 : 0;
  const total = subtotal - discount;
  const statuses: Order["status"][] = ["pending", "paid", "production", "ready", "completed", "cancelled"];
  const status = statuses[i % statuses.length];
  return {
    id: `o${i + 1}`,
    invoiceNo: `INV-2026${String(1000 + i)}`,
    customerName: ["Andi", "Bagus", "Citra", "Dewi", "Eka", "Faisal", "Gita"][i % 7] + " " + ["Pratama", "Wijaya", "Sari", "Putra"][i % 4],
    customerPhone: "0812" + String(34567000 + i).slice(0, 8),
    items: [
      {
        id: `it${i}`,
        materialId: "m2",
        materialName: "Flexi Korea 340gr",
        width: w,
        height: h,
        quantity: qty,
        pricePerUnit: price,
        subtotal,
        notes: i % 3 === 0 ? "Pakai mata ayam tiap sudut" : undefined,
      },
    ],
    subtotal,
    discount,
    total,
    paid: status === "pending" ? 0 : total,
    status,
    paymentProof: status !== "pending" && status !== "cancelled" ? "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600" : undefined,
    notes: i % 4 === 0 ? "Tolong dipercepat ya" : undefined,
    createdAt: daysAgo(i),
    updatedAt: daysAgo(i),
    createdBy: "u3",
  };
});

export const mockCashEntries: CashEntry[] = Array.from({ length: 14 }).map((_, i) => ({
  id: `c${i + 1}`,
  date: daysAgo(i),
  type: i % 3 === 0 ? "expense" : "income",
  category: i % 3 === 0 ? "Operasional" : "Penjualan",
  amount: i % 3 === 0 ? 150000 + i * 10000 : 350000 + i * 25000,
  description: i % 3 === 0 ? "Beli tinta & bahan" : `Pembayaran ${["banner", "stiker", "spanduk"][i % 3]}`,
  reference: i % 3 === 0 ? undefined : `INV-2026${1000 + i}`,
  createdBy: "u3",
}));

export const mockAutoReplies: AutoReplyRule[] = [
  { id: "ar1", keyword: "harga", reply: "Halo kak 👋, untuk daftar harga lengkap bisa cek di link ini ya: printflow.id/harga", active: true, matchType: "contains" },
  { id: "ar2", keyword: "lokasi", reply: "Kami berlokasi di Jl. Merdeka No. 12. Buka setiap hari jam 08.00–21.00.", active: true, matchType: "contains" },
  { id: "ar3", keyword: "menu", reply: "Layanan kami: Banner, Stiker, Cetak Indoor, Cetak Digital. Mau yang mana kak?", active: false, matchType: "exact" },
];
