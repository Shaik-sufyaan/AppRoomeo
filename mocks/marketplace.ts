import { MarketplaceListing } from "@/types";
import { mockUsers } from "./users";

export const mockMarketplaceListings: MarketplaceListing[] = [
  {
    id: "ml1",
    title: "Modern Grey Couch - Like New",
    price: 450,
    description: "Barely used grey sectional couch. Moving out and need to sell quickly. Very comfortable, no stains or tears.",
    category: "furniture",
    images: [
      "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800",
    ],
    seller: mockUsers[0],
    location: "Downtown San Jose",
    timestamp: Date.now() - 86400000,
    saved: false,
    sold: false,
  },
  {
    id: "ml2",
    title: "Kitchen Appliance Bundle",
    price: 200,
    description: "Blender, toaster, coffee maker, and electric kettle. All in excellent condition. Perfect for new apartment.",
    category: "household",
    images: [
      "https://images.unsplash.com/photo-1556911220-bff31c812dba?w=800",
    ],
    seller: mockUsers[1],
    location: "Sunnyvale",
    timestamp: Date.now() - 172800000,
    saved: false,
    sold: false,
  },
  {
    id: "ml3",
    title: "Queen Size Bed Frame & Mattress",
    price: 350,
    description: "Solid wood bed frame with memory foam mattress. 1 year old, excellent condition. Must pick up.",
    category: "furniture",
    images: [
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800",
    ],
    seller: mockUsers[2],
    location: "San Jose State Area",
    timestamp: Date.now() - 259200000,
    saved: false,
    sold: false,
  },
  {
    id: "ml4",
    title: "Desk & Office Chair Set",
    price: 180,
    description: "Perfect for remote work setup. Ergonomic chair and spacious desk with drawers.",
    category: "furniture",
    images: [
      "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=800",
    ],
    seller: mockUsers[3],
    location: "Palo Alto",
    timestamp: Date.now() - 345600000,
    saved: false,
    sold: false,
  },
];
