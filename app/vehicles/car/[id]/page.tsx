import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import CarDetailClient from "./CarDetailClient";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

type DummyCar = {
  id: string;
  slug: string;
  title: string;
  description: string;
  price: number;
  province: string;
  city: string;
  area: string;
  bodyType: string;
  transmission: string;
  fuel: string;
  year: string;
  mileage: string;
  status: string;
  images: string[];
};

const DUMMY_CARS: DummyCar[] = [
  {
    id: "car-001",
    slug: "toyota-fortuner-vrz-2023",
    title: "Toyota Fortuner VRZ 2023",
    description:
      "A premium SUV in excellent condition with a bold road presence, strong diesel performance, and a comfortable cabin for family or business use.",
    price: 685000000,
    province: "DKI Jakarta",
    city: "Jakarta Selatan",
    area: "Jakarta Selatan",
    bodyType: "SUV",
    transmission: "Automatic",
    fuel: "Diesel",
    year: "2023",
    mileage: "18.000 km",
    status: "available",
    images: [
      "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1200&q=80",
    ],
  },
  {
    id: "car-002",
    slug: "honda-hrv-se-2022",
    title: "Honda HR-V SE 2022",
    description:
      "A stylish and practical crossover with clean lines, efficient petrol engine, and a smooth automatic drive suited for city and daily family use.",
    price: 382000000,
    province: "Jawa Barat",
    city: "Bandung",
    area: "Bandung",
    bodyType: "SUV",
    transmission: "Automatic",
    fuel: "Petrol",
    year: "2022",
    mileage: "24.000 km",
    status: "available",
    images: [
      "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80",
    ],
  },
  {
    id: "car-003",
    slug: "bmw-320i-sport-2021",
    title: "BMW 320i Sport 2021",
    description:
      "A sporty executive sedan with premium interior finishing, refined handling, and a confident look for buyers seeking a more elevated driving experience.",
    price: 799000000,
    province: "Jawa Timur",
    city: "Surabaya",
    area: "Surabaya",
    bodyType: "Sedan",
    transmission: "Automatic",
    fuel: "Petrol",
    year: "2021",
    mileage: "21.500 km",
    status: "available",
    images: [
      "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?auto=format&fit=crop&w=1200&q=80",
    ],
  },
  {
    id: "car-004",
    slug: "hyundai-ioniq-5-prime-2024",
    title: "Hyundai Ioniq 5 Prime 2024",
    description:
      "A futuristic electric car with strong visual identity, quiet ride quality, and a spacious interior, ideal for buyers looking for a modern EV lifestyle.",
    price: 845000000,
    province: "Banten",
    city: "BSD City",
    area: "BSD City",
    bodyType: "EV",
    transmission: "Automatic",
    fuel: "Electric",
    year: "2024",
    mileage: "6.000 km",
    status: "available",
    images: [
      "https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1486496572940-2bb2341fdbdf?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1200&q=80",
    ],
  },
];

function cleanText(value?: string | null) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function trimToLength(value: string, max: number) {
  const cleaned = cleanText(value);
  if (!cleaned) return "";
  if (cleaned.length <= max) return cleaned;

  const sliced = cleaned.slice(0, max).trim();
  const lastSpace = sliced.lastIndexOf(" ");

  return `${(lastSpace > 80 ? sliced.slice(0, lastSpace) : sliced).trim()}…`;
}

function formatPriceIDR(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value) || value <= 0) return "";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function buildFallbackTitle(car: DummyCar) {
  return trimToLength(
    `${cleanText(car.title)} | ${cleanText(car.area || car.city || car.province)} | Tetamo`,
    70
  );
}

function buildFallbackDescription(car: DummyCar) {
  const parts = [
    cleanText(car.title),
    cleanText(car.bodyType),
    cleanText(car.area || car.city || car.province),
    formatPriceIDR(car.price),
    cleanText(car.description),
  ].filter(Boolean);

  return trimToLength(parts.join(". "), 160);
}

function getCarBySlugOrId(routeValue: string) {
  return (
    DUMMY_CARS.find((item) => item.slug === routeValue) ||
    DUMMY_CARS.find((item) => item.id === routeValue) ||
    null
  );
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id: routeValue } = await params;
  const car = getCarBySlugOrId(routeValue);
  const finalPathPart = cleanText(car?.slug) || routeValue;
  const canonical = `https://www.tetamo.com/vehicles/car/${finalPathPart}`;

  if (!car) {
    return {
      title: "Car Not Found | Tetamo",
      description: "This car is no longer available on Tetamo.",
      alternates: { canonical },
      robots: { index: false, follow: false },
    };
  }

  const title = buildFallbackTitle(car);
  const description = buildFallbackDescription(car);

  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "Tetamo",
      type: "website",
      images: car.images[0]
        ? [
            {
              url: car.images[0],
              width: 1200,
              height: 630,
              alt: title,
            },
          ]
        : undefined,
    },
  };
}

export default async function Page({ params }: PageProps) {
  const { id: routeValue } = await params;
  const car = getCarBySlugOrId(routeValue);

  if (!car?.id) {
    notFound();
  }

  if (car.slug && routeValue !== car.slug) {
    redirect(`/vehicles/car/${car.slug}`);
  }

  return <CarDetailClient id={car.id} />;
}