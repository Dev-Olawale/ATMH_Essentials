import type { CategoryIconName } from "@/components/category-icon";

export type Subcategory = {
  slug: string;
  name: string;
  children?: Subcategory[];
};

export type Category = Subcategory & {
  icon: CategoryIconName;
  /** From the poster only; the owner has not yet confirmed it for launch (CLAUDE.md §4). */
  needsConfirmation?: boolean;
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function subs(names: string[], slugPrefix = ""): Subcategory[] {
  return names.map((name) => ({ name, slug: slugify(`${slugPrefix} ${name}`) }));
}

export const categories: Category[] = [
  {
    slug: "cleaning-and-household",
    name: "Cleaning & Household",
    icon: "SprayCan",
    children: subs([
      "Detergents",
      "Bar soap",
      "Bleach",
      "Disinfectants",
      "Toilet & floor cleaners",
      "Dishwashing liquid",
      "Sponges & scouring pads",
      "Brushes",
      "Brooms",
      "Dustpans",
      "Mops",
      "Buckets",
      "Gloves",
      "Air fresheners",
      "Waste bags",
      "Matches & lighters",
      "Mosquito repellents",
    ]),
  },
  {
    slug: "laundry",
    name: "Laundry",
    icon: "WashingMachine",
    children: subs([
      "Laundry detergent",
      "Fabric softeners",
      "Stain removers",
      "Laundry blue",
      "Clothes pegs",
      "Laundry baskets",
    ]),
  },
  {
    slug: "bathroom-and-toilet",
    name: "Bathroom & Toilet",
    icon: "Bath",
    children: subs([
      "Toilet paper",
      "Paper towels",
      "Toilet brushes",
      "Toilet fresheners",
      "Bath sponges",
      "Handwash",
      "Small waste bins",
    ]),
  },
  {
    slug: "kitchen-and-food-storage",
    name: "Kitchen & Food Storage",
    icon: "CookingPot",
    children: subs([
      "Aluminium foil",
      "Cling film",
      "Food storage bags",
      "Kitchen towels",
      "Scrubbing pads",
    ]),
  },
  {
    slug: "skincare-and-body-care",
    name: "Skincare & Body Care",
    icon: "Sparkles",
    children: [
      {
        slug: "body",
        name: "Body",
        children: subs(
          [
            "Lotions",
            "Creams",
            "Oils",
            "Petroleum jelly",
            "Body washes",
            "Bath soaps",
            "Scrubs",
            "Sunscreens",
          ],
          "body",
        ),
      },
      {
        slug: "face",
        name: "Face",
        children: subs(
          [
            "Cleansers",
            "Moisturizers",
            "Sunscreens",
            "Toners",
            "Micellar water",
            "Lip balms",
            "Serums",
          ],
          "face",
        ),
      },
    ],
  },
  {
    slug: "personal-care-and-hygiene",
    name: "Personal Care & Hygiene",
    icon: "HandHeart",
    children: subs([
      "Deodorants",
      "Roll-ons",
      "Sanitary pads",
      "Cotton wool",
      "Cotton buds",
      "Hand sanitizers",
      "Handwash",
      "Wet wipes",
    ]),
  },
  {
    slug: "baby-care",
    name: "Baby Care",
    icon: "Baby",
    // Soaps, lotions and oils only apply if stocked (CLAUDE.md §4).
    children: subs(["Diapers", "Baby wipes", "Baby soaps", "Baby lotions", "Baby oils"]),
  },
  {
    slug: "hair-care-and-accessories",
    name: "Hair Care & Accessories",
    icon: "Scissors",
    children: subs(["Attachments", "Wools", "Hair creams", "Sprays", "Oils", "Accessories"]),
  },
  { slug: "fragrances", name: "Fragrances", icon: "FlaskRound", needsConfirmation: true },
  { slug: "grooming", name: "Grooming", icon: "Smile", needsConfirmation: true },
  { slug: "feminine-care", name: "Feminine Care", icon: "Flower2", needsConfirmation: true },
  {
    slug: "everyday-disposables",
    name: "Everyday Disposables",
    icon: "PackageOpen",
    needsConfirmation: true,
  },
];

export function categoryHref(slug: string): string {
  return `/categories/${slug}`;
}

export function getCategory(slug: string): Category | undefined {
  return categories.find((category) => category.slug === slug);
}
