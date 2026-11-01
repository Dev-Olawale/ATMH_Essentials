/**
 * SAMPLE DATA: for development only.
 * Products, prices and stock levels are illustrative, not the ATMH catalogue.
 * Replace with the owner's product list (CLAUDE.md §7) before launch.
 * All money values are integers in kobo.
 */

export type ProductTag = "bestseller" | "new";

export type ProductVariant = {
  sku: string;
  label: string;
  priceKobo: number;
  compareAtKobo?: number;
  stockQty: number;
};

export type ProductCategoryRef = {
  category: string;
  subcategory?: string;
};

export type Product = {
  slug: string;
  name: string;
  brand: string;
  /** Many-to-many: a product can appear in several categories. The first is its primary one. */
  categories: ProductCategoryRef[];
  description: string;
  images: string[];
  variants: ProductVariant[];
  lowStockThreshold: number;
  tags: ProductTag[];
  active: boolean;
};

export const products: Product[] = [
  {
    slug: "ariel-detergent-powder",
    name: "Ariel Detergent Powder",
    brand: "Ariel",
    categories: [
      { category: "cleaning-and-household", subcategory: "detergents" },
      { category: "laundry", subcategory: "laundry-detergent" },
    ],
    description: "Tough-on-stains washing powder for hand and machine wash.",
    images: [],
    variants: [
      { sku: "ARL-PWD-900", label: "900g", priceKobo: 280000, stockQty: 40 },
      { sku: "ARL-PWD-2K", label: "2kg", priceKobo: 590000, compareAtKobo: 650000, stockQty: 25 },
    ],
    lowStockThreshold: 6,
    tags: ["bestseller"],
    active: true,
  },
  {
    slug: "morning-fresh-dishwashing-liquid",
    name: "Morning Fresh Dishwashing Liquid",
    brand: "Morning Fresh",
    categories: [{ category: "cleaning-and-household", subcategory: "dishwashing-liquid" }],
    description: "Concentrated lemon dish liquid that cuts through grease.",
    images: [],
    variants: [
      { sku: "MFR-DSH-450", label: "450ml", priceKobo: 165000, stockQty: 60 },
      { sku: "MFR-DSH-900", label: "900ml", priceKobo: 310000, stockQty: 35 },
    ],
    lowStockThreshold: 8,
    tags: ["bestseller"],
    active: true,
  },
  {
    slug: "hypo-bleach",
    name: "Hypo Bleach",
    brand: "Hypo",
    categories: [{ category: "cleaning-and-household", subcategory: "bleach" }],
    description: "Household bleach for whitening and disinfecting surfaces.",
    images: [],
    variants: [
      { sku: "HYP-BLC-500", label: "500ml", priceKobo: 95000, stockQty: 50 },
      { sku: "HYP-BLC-1L", label: "1L", priceKobo: 170000, stockQty: 30 },
    ],
    lowStockThreshold: 8,
    tags: [],
    active: true,
  },
  {
    slug: "harpic-toilet-cleaner",
    name: "Harpic Power Plus Toilet Cleaner",
    brand: "Harpic",
    categories: [
      { category: "cleaning-and-household", subcategory: "toilet-and-floor-cleaners" },
      { category: "bathroom-and-toilet" },
    ],
    description: "Thick toilet cleaner that removes stains and limescale.",
    images: [],
    variants: [{ sku: "HRP-TLT-500", label: "500ml", priceKobo: 245000, stockQty: 28 }],
    lowStockThreshold: 6,
    tags: ["bestseller"],
    active: true,
  },
  {
    slug: "dettol-antiseptic-liquid",
    name: "Dettol Antiseptic Liquid",
    brand: "Dettol",
    categories: [{ category: "cleaning-and-household", subcategory: "disinfectants" }],
    description: "Trusted antiseptic for first aid, laundry and household hygiene.",
    images: [],
    variants: [
      { sku: "DTL-ANT-250", label: "250ml", priceKobo: 320000, stockQty: 22 },
      { sku: "DTL-ANT-500", label: "500ml", priceKobo: 590000, stockQty: 18 },
    ],
    lowStockThreshold: 5,
    tags: [],
    active: true,
  },
  {
    slug: "sunlight-bar-soap",
    name: "Sunlight Laundry Bar Soap",
    brand: "Sunlight",
    categories: [{ category: "cleaning-and-household", subcategory: "bar-soap" }],
    description: "Long-lasting multipurpose bar for laundry and household cleaning.",
    images: [],
    variants: [{ sku: "SUN-BAR-150", label: "150g", priceKobo: 60000, stockQty: 90 }],
    lowStockThreshold: 12,
    tags: [],
    active: true,
  },
  {
    slug: "raid-mosquito-spray",
    name: "Raid Mosquito Spray",
    brand: "Raid",
    categories: [{ category: "cleaning-and-household", subcategory: "mosquito-repellents" }],
    description: "Fast-acting aerosol for mosquitoes and flying insects.",
    images: [],
    variants: [{ sku: "RAD-SPR-300", label: "300ml", priceKobo: 310000, stockQty: 20 }],
    lowStockThreshold: 5,
    tags: ["new"],
    active: true,
  },
  {
    slug: "downy-fabric-softener",
    name: "Downy Fabric Softener",
    brand: "Downy",
    categories: [{ category: "laundry", subcategory: "fabric-softeners" }],
    description: "Leaves clothes soft with a fresh, long-lasting scent.",
    images: [],
    variants: [
      { sku: "DWN-SFT-500", label: "500ml", priceKobo: 280000, stockQty: 24 },
      { sku: "DWN-SFT-1L", label: "1L", priceKobo: 520000, stockQty: 14 },
    ],
    lowStockThreshold: 5,
    tags: ["new"],
    active: true,
  },
  {
    slug: "plastic-clothes-pegs",
    name: "Plastic Clothes Pegs (24 pack)",
    brand: "HomeBasics",
    categories: [{ category: "laundry", subcategory: "clothes-pegs" }],
    description: "Strong, colourful pegs that hold up outdoors.",
    images: [],
    variants: [{ sku: "HBS-PEG-24", label: "24 pack", priceKobo: 120000, stockQty: 35 }],
    lowStockThreshold: 6,
    tags: [],
    active: true,
  },
  {
    slug: "rose-soft-toilet-paper",
    name: "Soft 2-Ply Toilet Paper",
    brand: "Rose",
    categories: [{ category: "bathroom-and-toilet", subcategory: "toilet-paper" }],
    description: "Soft, absorbent two-ply rolls for everyday use.",
    images: [],
    variants: [
      { sku: "RSE-TP-4", label: "4 rolls", priceKobo: 180000, stockQty: 45 },
      { sku: "RSE-TP-12", label: "12 rolls", priceKobo: 480000, compareAtKobo: 540000, stockQty: 30 },
    ],
    lowStockThreshold: 8,
    tags: ["bestseller"],
    active: true,
  },
  {
    slug: "dettol-liquid-handwash",
    name: "Dettol Liquid Handwash",
    brand: "Dettol",
    categories: [
      { category: "bathroom-and-toilet", subcategory: "handwash" },
      { category: "personal-care-and-hygiene", subcategory: "handwash" },
    ],
    description: "Gentle, germ-protection handwash for the whole family.",
    images: [],
    variants: [{ sku: "DTL-HWS-200", label: "200ml", priceKobo: 210000, stockQty: 32 }],
    lowStockThreshold: 6,
    tags: [],
    active: true,
  },
  {
    slug: "aluminium-foil-roll",
    name: "Aluminium Foil Roll",
    brand: "Bakeway",
    categories: [{ category: "kitchen-and-food-storage", subcategory: "aluminium-foil" }],
    description: "Heavy-duty foil for cooking, baking and keeping food fresh.",
    images: [],
    variants: [{ sku: "BKW-FOIL-30", label: "30cm x 8m", priceKobo: 250000, stockQty: 18 }],
    lowStockThreshold: 4,
    tags: ["new"],
    active: true,
  },
  {
    slug: "cling-film-roll",
    name: "Cling Film Roll",
    brand: "Bakeway",
    categories: [{ category: "kitchen-and-food-storage", subcategory: "cling-film" }],
    description: "Food-safe wrap that seals bowls and leftovers tight.",
    images: [],
    variants: [{ sku: "BKW-CLNG-30", label: "30cm x 30m", priceKobo: 220000, stockQty: 21 }],
    lowStockThreshold: 4,
    tags: [],
    active: true,
  },
  {
    slug: "vaseline-petroleum-jelly",
    name: "Vaseline Original Petroleum Jelly",
    brand: "Vaseline",
    categories: [{ category: "skincare-and-body-care", subcategory: "body-petroleum-jelly" }],
    description: "Pure jelly that locks in moisture and protects dry skin.",
    images: [],
    variants: [
      { sku: "VSL-JLY-100", label: "100ml", priceKobo: 150000, stockQty: 55 },
      { sku: "VSL-JLY-250", label: "250ml", priceKobo: 320000, stockQty: 30 },
    ],
    lowStockThreshold: 8,
    tags: ["bestseller"],
    active: true,
  },
  {
    slug: "nivea-body-lotion",
    name: "Nivea Nourishing Body Lotion",
    brand: "Nivea",
    categories: [{ category: "skincare-and-body-care", subcategory: "body-lotions" }],
    description: "Deep moisture for dry skin, with a light, non-greasy feel.",
    images: [],
    variants: [
      { sku: "NIV-LTN-250", label: "250ml", priceKobo: 420000, stockQty: 26 },
      { sku: "NIV-LTN-400", label: "400ml", priceKobo: 650000, compareAtKobo: 720000, stockQty: 17 },
    ],
    lowStockThreshold: 5,
    tags: ["bestseller"],
    active: true,
  },
  {
    slug: "garnier-micellar-water",
    name: "Garnier Micellar Cleansing Water",
    brand: "Garnier",
    categories: [{ category: "skincare-and-body-care", subcategory: "face-micellar-water" }],
    description: "Removes make-up and cleanses without rinsing or rubbing.",
    images: [],
    variants: [{ sku: "GRN-MCL-400", label: "400ml", priceKobo: 780000, stockQty: 12 }],
    lowStockThreshold: 3,
    tags: ["new"],
    active: true,
  },
  {
    slug: "nivea-lip-balm",
    name: "Nivea Original Lip Balm",
    brand: "Nivea",
    categories: [{ category: "skincare-and-body-care", subcategory: "face-lip-balms" }],
    description: "Everyday lip care that keeps lips soft and smooth.",
    images: [],
    variants: [{ sku: "NIV-LIP-48", label: "4.8g", priceKobo: 180000, stockQty: 38 }],
    lowStockThreshold: 6,
    tags: [],
    active: true,
  },
  {
    slug: "rexona-roll-on",
    name: "Rexona Women Roll-On",
    brand: "Rexona",
    categories: [{ category: "personal-care-and-hygiene", subcategory: "roll-ons" }],
    description: "48-hour protection with a fresh, clean scent.",
    images: [],
    variants: [{ sku: "RXN-ROL-50", label: "50ml", priceKobo: 240000, stockQty: 42 }],
    lowStockThreshold: 8,
    tags: ["bestseller"],
    active: true,
  },
  {
    slug: "always-ultra-sanitary-pads",
    name: "Always Ultra Sanitary Pads",
    brand: "Always",
    categories: [{ category: "personal-care-and-hygiene", subcategory: "sanitary-pads" }],
    description: "Thin, absorbent pads with wings for all-day comfort.",
    images: [],
    variants: [
      { sku: "ALW-PAD-8", label: "8 pads", priceKobo: 150000, stockQty: 50 },
      { sku: "ALW-PAD-16", label: "16 pads", priceKobo: 280000, stockQty: 28 },
    ],
    lowStockThreshold: 8,
    tags: [],
    active: true,
  },
  {
    slug: "cotton-buds",
    name: "Cotton Buds (200 pack)",
    brand: "SoftCare",
    categories: [{ category: "personal-care-and-hygiene", subcategory: "cotton-buds" }],
    description: "Soft-tipped buds for everyday hygiene and beauty.",
    images: [],
    variants: [{ sku: "SFC-BUD-200", label: "200 pack", priceKobo: 95000, stockQty: 36 }],
    lowStockThreshold: 6,
    tags: ["new"],
    active: true,
  },
  {
    slug: "molfix-baby-diapers",
    name: "Molfix Baby Diapers",
    brand: "Molfix",
    categories: [{ category: "baby-care", subcategory: "diapers" }],
    description: "Soft, breathable diapers with up to 12-hour dryness.",
    images: [],
    variants: [
      { sku: "MLF-DPR-M", label: "Medium, 34 pack", priceKobo: 780000, stockQty: 24 },
      { sku: "MLF-DPR-L", label: "Large, 28 pack", priceKobo: 820000, stockQty: 20 },
    ],
    lowStockThreshold: 5,
    tags: ["bestseller"],
    active: true,
  },
  {
    slug: "pampers-baby-wipes",
    name: "Pampers Fresh Clean Baby Wipes",
    brand: "Pampers",
    categories: [{ category: "baby-care", subcategory: "baby-wipes" }],
    description: "Gentle, lightly scented wipes for delicate skin.",
    images: [],
    variants: [{ sku: "PMP-WPS-52", label: "52 wipes", priceKobo: 210000, stockQty: 33 }],
    lowStockThreshold: 6,
    tags: ["new"],
    active: true,
  },
  {
    slug: "xpression-braiding-attachment",
    name: "X-Pression Braiding Attachment",
    brand: "X-Pression",
    categories: [{ category: "hair-care-and-accessories", subcategory: "attachments" }],
    description: "Soft, tangle-free attachment for braids and twists.",
    images: [],
    variants: [{ sku: "XPR-ATT-1B", label: "Colour 1B", priceKobo: 180000, stockQty: 40 }],
    lowStockThreshold: 8,
    tags: ["new"],
    active: true,
  },
  {
    slug: "dark-and-lovely-hair-cream",
    name: "Dark and Lovely Moisture Hair Cream",
    brand: "Dark and Lovely",
    categories: [{ category: "hair-care-and-accessories", subcategory: "hair-creams" }],
    description: "Daily moisturising cream for soft, manageable hair.",
    images: [],
    variants: [{ sku: "DNL-CRM-250", label: "250ml", priceKobo: 360000, stockQty: 19 }],
    lowStockThreshold: 4,
    tags: ["new"],
    active: true,
  },
];

export function getProductsByTag(tag: ProductTag, limit?: number): Product[] {
  const tagged = products.filter((product) => product.active && product.tags.includes(tag));
  return limit === undefined ? tagged : tagged.slice(0, limit);
}
