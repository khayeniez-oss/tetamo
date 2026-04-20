export type CarSeoItem = {
  id: string;
  slug: string;
  title: string;
  priceValue: number;
  province: string;
  area: string;
  year: string;
  bodyType: string;
  fuel: string;
  transmission: string;
  mileage: string;
  image: string;
};

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://www.tetamo.com";

export const CAR_SEO_ITEMS: CarSeoItem[] = [
  {
    id: "car-001",
    slug: "toyota-fortuner-vrz-2023",
    title: "Toyota Fortuner VRZ 2023",
    priceValue: 685000000,
    province: "DKI Jakarta",
    area: "Jakarta Selatan",
    year: "2023",
    bodyType: "SUV",
    fuel: "Diesel",
    transmission: "Automatic",
    mileage: "18.000 km",
    image:
      "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "car-002",
    slug: "honda-hrv-se-2022",
    title: "Honda HR-V SE 2022",
    priceValue: 382000000,
    province: "Jawa Barat",
    area: "Bandung",
    year: "2022",
    bodyType: "SUV",
    fuel: "Petrol",
    transmission: "Automatic",
    mileage: "24.000 km",
    image:
      "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "car-003",
    slug: "bmw-320i-sport-2021",
    title: "BMW 320i Sport 2021",
    priceValue: 799000000,
    province: "Jawa Timur",
    area: "Surabaya",
    year: "2021",
    bodyType: "Sedan",
    fuel: "Petrol",
    transmission: "Automatic",
    mileage: "21.500 km",
    image:
      "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "car-004",
    slug: "hyundai-ioniq-5-prime-2024",
    title: "Hyundai Ioniq 5 Prime 2024",
    priceValue: 845000000,
    province: "Banten",
    area: "BSD City",
    year: "2024",
    bodyType: "EV",
    fuel: "Electric",
    transmission: "Automatic",
    mileage: "6.000 km",
    image:
      "https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "car-005",
    slug: "toyota-alphard-2020",
    title: "Toyota Alphard 2020",
    priceValue: 1035000000,
    province: "Bali",
    area: "Denpasar",
    year: "2020",
    bodyType: "MPV",
    fuel: "Petrol",
    transmission: "Automatic",
    mileage: "32.000 km",
    image:
      "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "car-006",
    slug: "mercedes-benz-c200-avantgarde-2020",
    title: "Mercedes-Benz C200 Avantgarde 2020",
    priceValue: 675000000,
    province: "DKI Jakarta",
    area: "Jakarta Barat",
    year: "2020",
    bodyType: "Sedan",
    fuel: "Petrol",
    transmission: "Automatic",
    mileage: "29.000 km",
    image:
      "https://images.unsplash.com/photo-1504215680853-026ed2a45def?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "car-007",
    slug: "mazda-cx5-elite-2022",
    title: "Mazda CX-5 Elite 2022",
    priceValue: 528000000,
    province: "Bali",
    area: "Denpasar",
    year: "2022",
    bodyType: "SUV",
    fuel: "Petrol",
    transmission: "Automatic",
    mileage: "17.000 km",
    image:
      "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "car-008",
    slug: "audi-a5-sportback-2021",
    title: "Audi A5 Sportback 2021",
    priceValue: 910000000,
    province: "DKI Jakarta",
    area: "Jakarta Utara",
    year: "2021",
    bodyType: "Sport",
    fuel: "Petrol",
    transmission: "Automatic",
    mileage: "19.000 km",
    image:
      "https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "car-009",
    slug: "byd-seal-premium-2024",
    title: "BYD Seal Premium 2024",
    priceValue: 635000000,
    province: "Jawa Barat",
    area: "Bekasi",
    year: "2024",
    bodyType: "EV",
    fuel: "Electric",
    transmission: "Automatic",
    mileage: "4.500 km",
    image:
      "https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=1200&q=80",
  },
];

export function findCarSeoItem(idOrSlug: string) {
  const key = String(idOrSlug || "").trim().toLowerCase();

  return (
    CAR_SEO_ITEMS.find(
      (item) =>
        item.id.toLowerCase() === key || item.slug.toLowerCase() === key
    ) || null
  );
}

export function formatPriceIdr(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function buildCarTitle(item: CarSeoItem) {
  return `${item.title} for Sale in ${item.area} | Tetamo`;
}

export function buildCarDescription(item: CarSeoItem) {
  return `${item.title} in ${item.area}, ${item.province}. ${item.year} ${item.bodyType}, ${item.transmission}, ${item.fuel}, ${item.mileage}. Price ${formatPriceIdr(item.priceValue)} on Tetamo.`;
}