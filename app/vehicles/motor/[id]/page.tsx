import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import MotorDetailClient from "./MotorDetailClient";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

type DummyMotor = {
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

const DUMMY_MOTORS: DummyMotor[] = [
  {
    id: "motor-001",
    slug: "yamaha-xmax-connected-2024",
    title: "Yamaha XMAX Connected 2024",
    description:
      "A premium maxi scooter with modern styling, smooth automatic ride, and strong road presence for city and leisure use.",
    price: 69000000,
    province: "Bali",
    city: "Denpasar",
    area: "Denpasar",
    bodyType: "Scooter",
    transmission: "Automatic",
    fuel: "Petrol",
    year: "2024",
    mileage: "3.200 km",
    status: "available",
    images: [
      "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1609630875171-b1321377ee65?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1622185135505-2d7950039943?auto=format&fit=crop&w=1200&q=80",
    ],
  },
  {
    id: "motor-002",
    slug: "honda-adv-160-2024",
    title: "Honda ADV 160 2024",
    description:
      "A stylish urban adventure scooter with practical everyday comfort, elevated riding position, and sporty modern design.",
    price: 42000000,
    province: "Jawa Timur",
    city: "Surabaya",
    area: "Surabaya",
    bodyType: "Scooter",
    transmission: "Automatic",
    fuel: "Petrol",
    year: "2024",
    mileage: "1.900 km",
    status: "available",
    images: [
      "https://images.unsplash.com/photo-1622185135825-d5fc1d3f1c7d?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1609630875171-b1321377ee65?auto=format&fit=crop&w=1200&q=80",
    ],
  },
  {
    id: "motor-003",
    slug: "kawasaki-ninja-zx25r-2023",
    title: "Kawasaki Ninja ZX-25R 2023",
    description:
      "A performance-focused sport bike with aggressive styling, exciting manual ride feel, and strong enthusiast appeal.",
    price: 118000000,
    province: "DKI Jakarta",
    city: "Jakarta Selatan",
    area: "Jakarta Selatan",
    bodyType: "Sport",
    transmission: "Manual",
    fuel: "Petrol",
    year: "2023",
    mileage: "7.500 km",
    status: "available",
    images: [
      "https://images.unsplash.com/photo-1609630875171-b1321377ee65?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1517846693594-1567da72af75?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1200&q=80",
    ],
  },
  {
    id: "motor-004",
    slug: "vespa-primavera-s-2023",
    title: "Vespa Primavera S 2023",
    description:
      "A fashionable scooter with timeless Italian styling, premium visual identity, and a light, smooth city ride.",
    price: 51500000,
    province: "Bali",
    city: "Canggu",
    area: "Canggu",
    bodyType: "Scooter",
    transmission: "Automatic",
    fuel: "Petrol",
    year: "2023",
    mileage: "4.800 km",
    status: "available",
    images: [
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1622185135505-2d7950039943?auto=format&fit=crop&w=1200&q=80",
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

function buildFallbackTitle(motor: DummyMotor) {
  return trimToLength(
    `${cleanText(motor.title)} | ${cleanText(
      motor.area || motor.city || motor.province
    )} | Tetamo`,
    70
  );
}

function buildFallbackDescription(motor: DummyMotor) {
  const parts = [
    cleanText(motor.title),
    cleanText(motor.bodyType),
    cleanText(motor.area || motor.city || motor.province),
    formatPriceIDR(motor.price),
    cleanText(motor.description),
  ].filter(Boolean);

  return trimToLength(parts.join(". "), 160);
}

function getMotorBySlugOrId(routeValue: string) {
  return (
    DUMMY_MOTORS.find((item) => item.slug === routeValue) ||
    DUMMY_MOTORS.find((item) => item.id === routeValue) ||
    null
  );
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id: routeValue } = await params;
  const motor = getMotorBySlugOrId(routeValue);
  const finalPathPart = cleanText(motor?.slug) || routeValue;
  const canonical = `https://www.tetamo.com/vehicles/motor/${finalPathPart}`;

  if (!motor) {
    return {
      title: "Motorbike Not Found | Tetamo",
      description: "This motorbike is no longer available on Tetamo.",
      alternates: { canonical },
      robots: { index: false, follow: false },
    };
  }

  const title = buildFallbackTitle(motor);
  const description = buildFallbackDescription(motor);

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
      images: motor.images[0]
        ? [
            {
              url: motor.images[0],
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
  const motor = getMotorBySlugOrId(routeValue);

  if (!motor?.id) {
    notFound();
  }

  if (motor.slug && routeValue !== motor.slug) {
    redirect(`/vehicles/motor/${motor.slug}`);
  }

  return <MotorDetailClient id={motor.id} />;
}