import { 
  type User, 
  type InsertUser,
  type Category,
  type InsertCategory,
  type Product,
  type InsertProduct,
  type CartItem,
  type InsertCartItem,
  type Order,
  type InsertOrder,
  type UserBehavior,
  type InsertUserBehavior
} from "../shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createGoogleUser(user: Omit<InsertUser, 'password'> & { googleId: string; googleEmail: string; avatar?: string; firstName?: string; lastName?: string; isEmailVerified?: boolean; lastLogin?: Date }): Promise<User>;
  updateUserGoogleInfo(userId: string, updates: { googleId: string; googleEmail: string; avatar?: string; firstName?: string; lastName?: string; isEmailVerified?: boolean; lastLogin?: Date }): Promise<User>;
  updateUserLastLogin(userId: string): Promise<User>;
  
  // Categories
  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  
  // Products
  getProducts(filters?: { categoryId?: string; search?: string; minPrice?: number; maxPrice?: number }): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, updates: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<boolean>;
  
  // Cart
  getCartItems(userId: string): Promise<(CartItem & { product: Product })[]>;
  addToCart(cartItem: InsertCartItem): Promise<CartItem>;
  updateCartItem(id: string, quantity: number): Promise<CartItem | undefined>;
  removeFromCart(id: string): Promise<boolean>;
  clearCart(userId: string): Promise<void>;
  
  // Orders
  createOrder(order: InsertOrder): Promise<Order>;
  getOrders(userId?: string): Promise<Order[]>;
  updateOrderStatus(id: string, status: string): Promise<Order | undefined>;
  
  // User Behavior (for AI recommendations)
  trackUserBehavior(behavior: InsertUserBehavior): Promise<UserBehavior>;
  getUserBehavior(userId: string): Promise<UserBehavior[]>;
  getPopularProducts(): Promise<Product[]>;
  getRecommendedProducts(userId: string): Promise<Product[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private categories: Map<string, Category> = new Map();
  private products: Map<string, Product> = new Map();
  private cartItems: Map<string, CartItem> = new Map();
  private orders: Map<string, Order> = new Map();
  private userBehavior: Map<string, UserBehavior> = new Map();

  constructor() {
    this.seedData();
  }

  private seedData() {
    // Seed categories
    const electronics = { id: randomUUID(), name: "Electronics", slug: "electronics" };
    const fashion = { id: randomUUID(), name: "Fashion", slug: "fashion" };
    const home = { id: randomUUID(), name: "Home & Garden", slug: "home-garden" };
    const sports = { id: randomUUID(), name: "Sports", slug: "sports" };
    const books = { id: randomUUID(), name: "Books", slug: "books" };
    
    this.categories.set(electronics.id, electronics);
    this.categories.set(fashion.id, fashion);
    this.categories.set(home.id, home);
    this.categories.set(sports.id, sports);
    this.categories.set(books.id, books);

    // Seed products
    const productsData = [
      {
        id: randomUUID(),
        name: "Premium Wireless Headphones",
        description: "Noise-canceling, 30hr battery life",
        price: "199.99",
        originalPrice: "249.99",
        imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200",
        categoryId: electronics.id,
        stock: 50,
        rating: "4.8",
        reviewCount: 128,
        tags: ["wireless", "noise-canceling", "premium"],
        features: { battery: "30hr", connectivity: "Bluetooth 5.0" },
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        name: "Smart Fitness Watch",
        description: "Health tracking, GPS enabled",
        price: "299.99",
        imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200",
        categoryId: electronics.id,
        stock: 30,
        rating: "4.6",
        reviewCount: 89,
        tags: ["fitness", "GPS", "health"],
        features: { battery: "7 days", waterproof: "5ATM" },
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        name: "RGB Mechanical Keyboard",
        description: "Cherry MX switches, customizable RGB",
        price: "149.99",
        originalPrice: "199.99",
        imageUrl: "https://images.unsplash.com/photo-1541140532154-b024d705b90a?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        categoryId: electronics.id,
        stock: 25,
        rating: "4.9",
        reviewCount: 256,
        tags: ["mechanical", "RGB", "gaming"],
        features: { switches: "Cherry MX", backlighting: "RGB" },
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        name: "4K Gaming Monitor",
        description: "27 inch 4K, 144Hz refresh rate",
        price: "399.99",
        originalPrice: "529.99",
        imageUrl: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        categoryId: electronics.id,
        stock: 15,
        rating: "4.7",
        reviewCount: 89,
        tags: ["4K", "144Hz", "gaming"],
        features: { resolution: "4K", refresh: "144Hz" },
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        name: "Ergonomic Laptop Stand",
        description: "Adjustable height, aluminum construction",
        price: "89.99",
        imageUrl: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200",
        categoryId: electronics.id,
        stock: 40,
        rating: "4.5",
        reviewCount: 67,
        tags: ["ergonomic", "adjustable", "aluminum"],
        features: { material: "Aluminum", adjustable: true },
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        name: "Precision Wireless Mouse",
        description: "Ergonomic design, long battery life",
        price: "49.99",
        imageUrl: "https://images.unsplash.com/photo-1527814050087-3793815479db?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200",
        categoryId: electronics.id,
        stock: 60,
        rating: "4.4",
        reviewCount: 143,
        tags: ["wireless", "ergonomic", "precision"],
        features: { battery: "12 months", dpi: "1600" },
        isActive: true,
        createdAt: new Date(),
      },
      // More Electronics Products
      {
        id: randomUUID(),
        name: "Bluetooth Speaker",
        description: "Portable waterproof speaker with deep bass",
        price: "79.99",
        originalPrice: "99.99",
        imageUrl: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200",
        categoryId: electronics.id,
        stock: 45,
        rating: "4.3",
        reviewCount: 92,
        tags: ["portable", "waterproof", "bluetooth"],
        features: { battery: "20hr", waterproof: "IPX7" },
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        name: "USB-C Hub",
        description: "7-in-1 adapter for laptops",
        price: "34.99",
        imageUrl: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200",
        categoryId: electronics.id,
        stock: 80,
        rating: "4.2",
        reviewCount: 156,
        tags: ["adapter", "USB-C", "laptop"],
        features: { ports: "7-in-1", compatibility: "Universal" },
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        name: "Wireless Charging Pad",
        description: "Fast wireless charging for smartphones",
        price: "29.99",
        imageUrl: "https://images.unsplash.com/photo-1586953208448-b95a79798f07?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200",
        categoryId: electronics.id,
        stock: 100,
        rating: "4.1",
        reviewCount: 203,
        tags: ["wireless", "charging", "fast"],
        features: { power: "15W", compatibility: "Qi" },
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        name: "Gaming Headset",
        description: "7.1 surround sound with noise-canceling mic",
        price: "89.99",
        originalPrice: "129.99",
        imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200",
        categoryId: electronics.id,
        stock: 35,
        rating: "4.6",
        reviewCount: 178,
        tags: ["gaming", "surround", "microphone"],
        features: { audio: "7.1", mic: "Noise-canceling" },
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        name: "Tablet Stand",
        description: "Adjustable aluminum stand for tablets",
        price: "24.99",
        imageUrl: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200",
        categoryId: electronics.id,
        stock: 70,
        rating: "4.0",
        reviewCount: 89,
        tags: ["tablet", "adjustable", "aluminum"],
        features: { material: "Aluminum", adjustable: true },
        isActive: true,
        createdAt: new Date(),
      },
      // Fashion Products
      {
        id: randomUUID(),
        name: "Premium Cotton T-Shirt",
        description: "100% organic cotton, comfortable fit",
        price: "24.99",
        imageUrl: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200",
        categoryId: fashion.id,
        stock: 150,
        rating: "4.5",
        reviewCount: 234,
        tags: ["cotton", "organic", "comfortable"],
        features: { material: "100% Cotton", fit: "Regular" },
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        name: "Denim Jacket",
        description: "Classic denim jacket with modern fit",
        price: "89.99",
        originalPrice: "119.99",
        imageUrl: "https://images.unsplash.com/photo-1544022613-e87ca75a784a?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200",
        categoryId: fashion.id,
        stock: 40,
        rating: "4.7",
        reviewCount: 156,
        tags: ["denim", "jacket", "classic"],
        features: { material: "Denim", style: "Classic" },
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        name: "Leather Sneakers",
        description: "Premium leather sneakers with comfort sole",
        price: "129.99",
        imageUrl: "https://images.unsplash.com/photo-1549298916-b41d501d3772?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200",
        categoryId: fashion.id,
        stock: 60,
        rating: "4.8",
        reviewCount: 189,
        tags: ["leather", "sneakers", "comfort"],
        features: { material: "Leather", sole: "Comfort" },
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        name: "Wool Sweater",
        description: "Soft wool sweater for cold weather",
        price: "69.99",
        imageUrl: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200",
        categoryId: fashion.id,
        stock: 80,
        rating: "4.4",
        reviewCount: 112,
        tags: ["wool", "warm", "sweater"],
        features: { material: "Wool", warmth: "High" },
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        name: "Silk Scarf",
        description: "Elegant silk scarf with floral pattern",
        price: "39.99",
        imageUrl: "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200",
        categoryId: fashion.id,
        stock: 120,
        rating: "4.6",
        reviewCount: 78,
        tags: ["silk", "elegant", "floral"],
        features: { material: "Silk", pattern: "Floral" },
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        name: "Designer Handbag",
        description: "Luxury leather handbag with gold hardware",
        price: "299.99",
        originalPrice: "399.99",
        imageUrl: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200",
        categoryId: fashion.id,
        stock: 25,
        rating: "4.9",
        reviewCount: 67,
        tags: ["luxury", "leather", "designer"],
        features: { material: "Leather", hardware: "Gold" },
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        name: "Sunglasses",
        description: "Polarized sunglasses with UV protection",
        price: "149.99",
        imageUrl: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200",
        categoryId: fashion.id,
        stock: 45,
        rating: "4.5",
        reviewCount: 134,
        tags: ["polarized", "UV", "stylish"],
        features: { protection: "UV400", polarization: true },
        isActive: true,
        createdAt: new Date(),
      },
      // Home & Garden Products
      {
        id: randomUUID(),
        name: "Smart LED Bulb",
        description: "WiFi-enabled smart bulb with voice control",
        price: "19.99",
        imageUrl: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200",
        categoryId: home.id,
        stock: 200,
        rating: "4.3",
        reviewCount: 445,
        tags: ["smart", "LED", "WiFi"],
        features: { connectivity: "WiFi", control: "Voice" },
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        name: "Ceramic Plant Pot",
        description: "Beautiful ceramic pot for indoor plants",
        price: "34.99",
        imageUrl: "https://images.unsplash.com/photo-1485955900006-10f4d324d411?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200",
        categoryId: home.id,
        stock: 90,
        rating: "4.6",
        reviewCount: 167,
        tags: ["ceramic", "plants", "indoor"],
        features: { material: "Ceramic", drainage: true },
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        name: "Kitchen Knife Set",
        description: "Professional 8-piece knife set",
        price: "199.99",
        originalPrice: "249.99",
        imageUrl: "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200",
        categoryId: home.id,
        stock: 30,
        rating: "4.8",
        reviewCount: 89,
        tags: ["kitchen", "professional", "sharp"],
        features: { pieces: "8", material: "Stainless Steel" },
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        name: "Throw Pillow",
        description: "Soft decorative pillow for sofa",
        price: "24.99",
        imageUrl: "https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200",
        categoryId: home.id,
        stock: 120,
        rating: "4.2",
        reviewCount: 234,
        tags: ["decorative", "soft", "sofa"],
        features: { material: "Polyester", size: "18x18" },
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        name: "Wall Clock",
        description: "Modern minimalist wall clock",
        price: "49.99",
        imageUrl: "https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200",
        categoryId: home.id,
        stock: 75,
        rating: "4.4",
        reviewCount: 156,
        tags: ["modern", "minimalist", "wall"],
        features: { style: "Minimalist", battery: "AA" },
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        name: "Coffee Maker",
        description: "Programmable coffee maker with thermal carafe",
        price: "89.99",
        imageUrl: "https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200",
        categoryId: home.id,
        stock: 55,
        rating: "4.7",
        reviewCount: 198,
        tags: ["coffee", "programmable", "thermal"],
        features: { capacity: "12 cups", programmable: true },
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        name: "Garden Hose",
        description: "Heavy-duty expandable garden hose",
        price: "39.99",
        imageUrl: "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200",
        categoryId: home.id,
        stock: 85,
        rating: "4.1",
        reviewCount: 123,
        tags: ["garden", "expandable", "heavy-duty"],
        features: { length: "50ft", expandable: true },
        isActive: true,
        createdAt: new Date(),
      },
      // Sports Products
      {
        id: randomUUID(),
        name: "Yoga Mat",
        description: "Non-slip yoga mat with carrying strap",
        price: "29.99",
        imageUrl: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200",
        categoryId: sports.id,
        stock: 100,
        rating: "4.5",
        reviewCount: 289,
        tags: ["yoga", "non-slip", "fitness"],
        features: { thickness: "6mm", material: "PVC" },
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        name: "Dumbbell Set",
        description: "Adjustable dumbbell set 5-50 lbs",
        price: "299.99",
        originalPrice: "399.99",
        imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200",
        categoryId: sports.id,
        stock: 20,
        rating: "4.8",
        reviewCount: 67,
        tags: ["dumbbells", "adjustable", "strength"],
        features: { weight: "5-50 lbs", adjustable: true },
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        name: "Running Shoes",
        description: "Lightweight running shoes with cushioning",
        price: "119.99",
        imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200",
        categoryId: sports.id,
        stock: 70,
        rating: "4.6",
        reviewCount: 234,
        tags: ["running", "lightweight", "cushioning"],
        features: { weight: "Light", cushioning: "High" },
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        name: "Basketball",
        description: "Official size basketball with grip",
        price: "49.99",
        imageUrl: "https://images.unsplash.com/photo-1546519638-68e109498ffc?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200",
        categoryId: sports.id,
        stock: 60,
        rating: "4.3",
        reviewCount: 145,
        tags: ["basketball", "official", "grip"],
        features: { size: "Official", material: "Leather" },
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        name: "Tennis Racket",
        description: "Professional tennis racket with case",
        price: "159.99",
        imageUrl: "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200",
        categoryId: sports.id,
        stock: 35,
        rating: "4.7",
        reviewCount: 89,
        tags: ["tennis", "professional", "racket"],
        features: { level: "Professional", includes: "Case" },
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        name: "Swimming Goggles",
        description: "Anti-fog swimming goggles with UV protection",
        price: "24.99",
        imageUrl: "https://images.unsplash.com/photo-1530549387789-4c1017266635?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200",
        categoryId: sports.id,
        stock: 80,
        rating: "4.4",
        reviewCount: 167,
        tags: ["swimming", "anti-fog", "UV"],
        features: { protection: "UV", antiFog: true },
        isActive: true,
        createdAt: new Date(),
      },
      // Books Products
      {
        id: randomUUID(),
        name: "The Great Gatsby",
        description: "F. Scott Fitzgerald's masterpiece of the Jazz Age",
        price: "10.99",
        originalPrice: "14.99",
        imageUrl: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200",
        categoryId: books.id,
        stock: 25,
        rating: "4.5",
        reviewCount: 89,
        tags: ["classic", "fiction", "jazz-age"],
        features: { author: "F. Scott Fitzgerald", genre: "Classic Fiction" },
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        name: "1984",
        description: "George Orwell's dystopian masterpiece",
        price: "8.99",
        imageUrl: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200",
        categoryId: books.id,
        stock: 30,
        rating: "4.7",
        reviewCount: 156,
        tags: ["dystopian", "classic", "political"],
        features: { author: "George Orwell", genre: "Dystopian Fiction" },
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        name: "To Kill a Mockingbird",
        description: "Harper Lee's Pulitzer Prize-winning novel",
        price: "12.99",
        originalPrice: "16.99",
        imageUrl: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200",
        categoryId: books.id,
        stock: 20,
        rating: "4.8",
        reviewCount: 234,
        tags: ["classic", "coming-of-age", "social-justice"],
        features: { author: "Harper Lee", genre: "Classic Fiction" },
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        name: "The Catcher in the Rye",
        description: "J.D. Salinger's iconic coming-of-age story",
        price: "9.99",
        imageUrl: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200",
        categoryId: books.id,
        stock: 15,
        rating: "4.4",
        reviewCount: 78,
        tags: ["classic", "coming-of-age", "young-adult"],
        features: { author: "J.D. Salinger", genre: "Classic Fiction" },
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        name: "Pride and Prejudice",
        description: "Jane Austen's beloved romantic comedy",
        price: "11.99",
        imageUrl: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200",
        categoryId: books.id,
        stock: 35,
        rating: "4.6",
        reviewCount: 189,
        tags: ["romance", "classic", "historical"],
        features: { author: "Jane Austen", genre: "Romance" },
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        name: "The Hobbit",
        description: "J.R.R. Tolkien's fantasy adventure",
        price: "13.99",
        originalPrice: "18.99",
        imageUrl: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200",
        categoryId: books.id,
        stock: 28,
        rating: "4.9",
        reviewCount: 312,
        tags: ["fantasy", "adventure", "tolkien"],
        features: { author: "J.R.R. Tolkien", genre: "Fantasy" },
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        name: "The Alchemist",
        description: "Paulo Coelho's inspirational journey",
        price: "7.99",
        imageUrl: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200",
        categoryId: books.id,
        stock: 40,
        rating: "4.3",
        reviewCount: 145,
        tags: ["inspirational", "philosophy", "journey"],
        features: { author: "Paulo Coelho", genre: "Philosophical Fiction" },
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        name: "The Little Prince",
        description: "Antoine de Saint-Exupéry's timeless tale",
        price: "6.99",
        imageUrl: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200",
        categoryId: books.id,
        stock: 50,
        rating: "4.7",
        reviewCount: 267,
        tags: ["children", "philosophy", "classic"],
        features: { author: "Antoine de Saint-Exupéry", genre: "Children's Literature" },
        isActive: true,
        createdAt: new Date(),
      },
    ];

    productsData.forEach(product => {
      const normalizedProduct: Product = {
        ...product,
        originalPrice: product.originalPrice || null,
        categoryId: product.categoryId || null,
        stock: product.stock || null,
        rating: product.rating || null,
        reviewCount: product.reviewCount || null,
        tags: product.tags || null,
        features: product.features || null,
        isActive: product.isActive ?? true,
        createdAt: product.createdAt || new Date()
      };
      this.products.set(product.id, normalizedProduct);
    });

    // Create admin user
    const adminId = randomUUID();
    const adminUser: User = {
      id: adminId,
      username: "admin",
      email: "admin@shopai.com",
      password: "admin123",
      googleId: null,
      googleEmail: null,
      avatar: null,
      firstName: null,
      lastName: null,
      isAdmin: true,
      isEmailVerified: false,
      lastLogin: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(adminId, adminUser);

    // Seed comprehensive user behavior data for better recommendations
    const sampleUserIds = [adminId, "guest-123", "guest-456", "guest", "user-1", "user-2", "user-3"];
    const allProductIds = Array.from(this.products.keys());
    
    sampleUserIds.forEach(userId => {
      // Each user interacts with 15-25 random products
      const userProductCount = Math.floor(Math.random() * 11) + 15; // 15-25 products
      const shuffledProducts = [...allProductIds].sort(() => Math.random() - 0.5);
      const userProducts = shuffledProducts.slice(0, userProductCount);
      
      userProducts.forEach((productId, index) => {
        // Create multiple interactions per product for more realistic data
        const interactionCount = Math.floor(Math.random() * 3) + 1; // 1-3 interactions per product
        
        for (let i = 0; i < interactionCount; i++) {
          const behavior: UserBehavior = {
            id: randomUUID(),
            userId,
            productId,
            action: Math.random() < 0.4 ? 'view' : Math.random() < 0.7 ? 'add_to_cart' : 'purchase',
            timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random time in last 30 days
          };
          this.userBehavior.set(behavior.id, behavior);
        }
      });
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.googleId === googleId);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id, 
      password: insertUser.password || null,
      googleId: null,
      googleEmail: null,
      avatar: null,
      firstName: null,
      lastName: null,
      isAdmin: false,
      isEmailVerified: false,
      lastLogin: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async createGoogleUser(userData: Omit<InsertUser, 'password'> & { googleId: string; googleEmail: string; avatar?: string; firstName?: string; lastName?: string; isEmailVerified?: boolean; lastLogin?: Date }): Promise<User> {
    const id = randomUUID();
    const user: User = {
      id,
      username: userData.username,
      email: userData.email,
      password: null, // OAuth users don't have passwords
      googleId: userData.googleId,
      googleEmail: userData.googleEmail,
      avatar: userData.avatar || null,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      isAdmin: false,
      isEmailVerified: userData.isEmailVerified || false,
      lastLogin: userData.lastLogin || new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserGoogleInfo(userId: string, updates: { googleId: string; googleEmail: string; avatar?: string; firstName?: string; lastName?: string; isEmailVerified?: boolean; lastLogin?: Date }): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');
    
    const updatedUser: User = {
      ...user,
      googleId: updates.googleId,
      googleEmail: updates.googleEmail,
      avatar: updates.avatar || user.avatar,
      firstName: updates.firstName || user.firstName,
      lastName: updates.lastName || user.lastName,
      isEmailVerified: updates.isEmailVerified || user.isEmailVerified,
      lastLogin: updates.lastLogin || user.lastLogin,
      updatedAt: new Date()
    };
    
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async updateUserLastLogin(userId: string): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');
    
    const updatedUser: User = {
      ...user,
      lastLogin: new Date(),
      updatedAt: new Date()
    };
    
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async getCategories(): Promise<Category[]> {
    return Array.from(this.categories.values());
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const id = randomUUID();
    const category: Category = { ...insertCategory, id };
    this.categories.set(id, category);
    return category;
  }

  async getProducts(filters?: { categoryId?: string; search?: string; minPrice?: number; maxPrice?: number }): Promise<Product[]> {
    let products = Array.from(this.products.values()).filter(p => p.isActive);
    
    if (filters?.categoryId) {
      products = products.filter(p => p.categoryId === filters.categoryId);
    }
    
    if (filters?.search) {
      const search = filters.search.toLowerCase();
      products = products.filter(p => 
        p.name.toLowerCase().includes(search) ||
        p.description.toLowerCase().includes(search) ||
        p.tags?.some(tag => tag.toLowerCase().includes(search))
      );
    }
    
    if (filters?.minPrice) {
      products = products.filter(p => parseFloat(p.price) >= filters.minPrice!);
    }
    
    if (filters?.maxPrice) {
      products = products.filter(p => parseFloat(p.price) <= filters.maxPrice!);
    }
    
    return products;
  }

  async getProduct(id: string): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const id = randomUUID();
    const product: Product = { 
      ...insertProduct, 
      id, 
      originalPrice: insertProduct.originalPrice || null,
      categoryId: insertProduct.categoryId || null,
      stock: insertProduct.stock || null,
      rating: insertProduct.rating || null,
      reviewCount: insertProduct.reviewCount || null,
      tags: insertProduct.tags || null,
      features: insertProduct.features || null,
      isActive: insertProduct.isActive ?? true,
      createdAt: new Date() 
    };
    this.products.set(id, product);
    return product;
  }

  async updateProduct(id: string, updates: Partial<InsertProduct>): Promise<Product | undefined> {
    const product = this.products.get(id);
    if (!product) return undefined;
    
    const updatedProduct = { ...product, ...updates };
    this.products.set(id, updatedProduct);
    return updatedProduct;
  }

  async deleteProduct(id: string): Promise<boolean> {
    return this.products.delete(id);
  }

  async getCartItems(userId: string): Promise<(CartItem & { product: Product })[]> {
    const items = Array.from(this.cartItems.values()).filter(item => item.userId === userId);
    return items.map(item => ({
      ...item,
      product: this.products.get(item.productId!)!
    })).filter(item => item.product);
  }

  async addToCart(insertCartItem: InsertCartItem): Promise<CartItem> {
    // Check if item already exists
    const existingItem = Array.from(this.cartItems.values())
      .find(item => item.userId === insertCartItem.userId && item.productId === insertCartItem.productId);
    
    if (existingItem) {
      // Update quantity
      existingItem.quantity += insertCartItem.quantity || 1;
      return existingItem;
    }
    
    const id = randomUUID();
    const cartItem: CartItem = { 
      ...insertCartItem, 
      id, 
      userId: insertCartItem.userId || null,
      productId: insertCartItem.productId || null,
      quantity: insertCartItem.quantity || 1,
      createdAt: new Date() 
    };
    this.cartItems.set(id, cartItem);
    return cartItem;
  }

  async updateCartItem(id: string, quantity: number): Promise<CartItem | undefined> {
    const item = this.cartItems.get(id);
    if (!item) return undefined;
    
    if (quantity <= 0) {
      this.cartItems.delete(id);
      return undefined;
    }
    
    item.quantity = quantity;
    return item;
  }

  async removeFromCart(id: string): Promise<boolean> {
    return this.cartItems.delete(id);
  }

  async clearCart(userId: string): Promise<void> {
    const userItems = Array.from(this.cartItems.entries())
      .filter(([_, item]) => item.userId === userId);
    
    userItems.forEach(([id]) => this.cartItems.delete(id));
  }

    async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const id = randomUUID();
    const order: Order = {
      ...insertOrder,
      id,
      userId: insertOrder.userId || null,
      status: insertOrder.status || "pending",
      stripePaymentIntentId: insertOrder.stripePaymentIntentId || null,
      shippingAddress: insertOrder.shippingAddress || null,
      createdAt: new Date()
    };
    this.orders.set(id, order);
    return order;
  }

  async getOrders(userId?: string): Promise<Order[]> {
    const orders = Array.from(this.orders.values());
    if (userId) {
      return orders.filter(order => order.userId === userId);
    }
    return orders;
  }

  async updateOrderStatus(id: string, status: string): Promise<Order | undefined> {
    const order = this.orders.get(id);
    if (!order) return undefined;
    
    order.status = status;
    return order;
  }

  async trackUserBehavior(insertBehavior: InsertUserBehavior): Promise<UserBehavior> {
    const id = randomUUID();
    const behavior: UserBehavior = { 
      ...insertBehavior, 
      id, 
      userId: insertBehavior.userId || null,
      productId: insertBehavior.productId || null,
      timestamp: new Date() 
    };
    this.userBehavior.set(id, behavior);
    return behavior;
  }

  async getUserBehavior(userId: string): Promise<UserBehavior[]> {
    return Array.from(this.userBehavior.values())
      .filter(b => b.userId === userId);
  }

  async getPopularProducts(): Promise<Product[]> {
    // Get products with most views/purchases
    const productViews = new Map<string, number>();
    
    Array.from(this.userBehavior.values()).forEach(behavior => {
      if (behavior.productId) { // Only process behaviors with valid productId
        const current = productViews.get(behavior.productId) || 0;
        const weight = behavior.action === 'purchase' ? 3 : behavior.action === 'add_to_cart' ? 2 : 1;
        productViews.set(behavior.productId, current + weight);
      }
    });
    
    let sortedProducts = Array.from(productViews.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([productId]) => this.products.get(productId))
      .filter(p => p && p.isActive) as Product[];
    
    // If no products from behavior data, return random active products
    if (sortedProducts.length === 0) {
      const allActiveProducts = Array.from(this.products.values()).filter(p => p.isActive);
      sortedProducts = allActiveProducts
        .sort(() => Math.random() - 0.5)
        .slice(0, 10);
    }
    
    return sortedProducts;
  }

  async getRecommendedProducts(userId: string): Promise<Product[]> {
    const userBehaviors = await this.getUserBehavior(userId);
    const userProductIds = new Set(userBehaviors.map(b => b.productId).filter(Boolean) as string[]);
    const allProducts = Array.from(this.products.values()).filter(p => p.isActive);
    
    // Get recent cart additions (last 24 hours) for better recommendations
    const recentCartAdditions = Array.from(this.userBehavior.values())
      .filter(b => b.userId === userId && b.action === 'add_to_cart')
      .filter(b => {
        const behaviorTime = new Date(b.timestamp!).getTime();
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        return behaviorTime > oneDayAgo;
      });
    
    // If user has recent cart additions, prioritize those categories
    if (recentCartAdditions.length > 0) {
      const recentProductIds = recentCartAdditions.map(b => b.productId).filter(Boolean) as string[];
      const recentProducts = recentProductIds
        .map(id => this.products.get(id))
        .filter(p => p && p.isActive) as Product[];
      
      const recentCategories = new Set(recentProducts.map(p => p.categoryId).filter(Boolean));
      
      // Get products from recent categories, excluding already added products
      const categoryBasedRecommendations = allProducts
        .filter(p => 
          recentCategories.has(p.categoryId) && 
          !recentProductIds.includes(p.id) &&
          !userProductIds.has(p.id)
        )
        .sort(() => Math.random() - 0.5)
        .slice(0, 4);
      
      // Add some diverse recommendations
      const diverseRecommendations = allProducts
        .filter(p => 
          !recentCategories.has(p.categoryId) && 
          !recentProductIds.includes(p.id) &&
          !userProductIds.has(p.id)
        )
        .sort(() => Math.random() - 0.5)
        .slice(0, 2);
      
      return [...categoryBasedRecommendations, ...diverseRecommendations];
    }
    
    // If user has no behavior data, return a diverse mix from different categories
    if (userBehaviors.length === 0) {
      // Get all categories
      const allCategories = Array.from(new Set(allProducts.map(p => p.categoryId).filter(Boolean)));
      
      // Get 1-2 products from each category for diversity
      const categoryProducts: Product[] = [];
      allCategories.forEach(categoryId => {
        const categoryProductsList = allProducts
          .filter(p => p.categoryId === categoryId)
          .sort(() => Math.random() - 0.5)
          .slice(0, 2);
        categoryProducts.push(...categoryProductsList);
      });
      
      // Shuffle and return 6 products
      return categoryProducts
        .sort(() => Math.random() - 0.5)
        .slice(0, 6);
    }
    
    // Collaborative filtering: find products that other users with similar behavior liked
    const similarUserIds = new Set<string>();
    
    // Find users who interacted with same products
    Array.from(this.userBehavior.values()).forEach(behavior => {
      if (behavior.productId && userProductIds.has(behavior.productId) && behavior.userId && behavior.userId !== userId) {
        similarUserIds.add(behavior.userId);
      }
    });
    
    // Get products liked by similar users
    const recommendedProductIds = new Map<string, number>();
    
    Array.from(this.userBehavior.values()).forEach(behavior => {
      if (behavior.userId && similarUserIds.has(behavior.userId) && behavior.productId && !userProductIds.has(behavior.productId)) {
        const current = recommendedProductIds.get(behavior.productId) || 0;
        const weight = behavior.action === 'purchase' ? 3 : behavior.action === 'add_to_cart' ? 2 : 1;
        recommendedProductIds.set(behavior.productId, current + weight);
      }
    });
    
    let recommendations = Array.from(recommendedProductIds.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 6)
      .map(([productId]) => this.products.get(productId))
      .filter(p => p && p.isActive) as Product[];
    
    // Ensure category diversity in recommendations
    const recommendationCategories = new Set(recommendations.map(p => p.categoryId).filter(Boolean));
    const allCategories = Array.from(new Set(allProducts.map(p => p.categoryId).filter(Boolean)));
    
    // If we have too many products from one category, replace some with diverse options
    if (recommendations.length > 0 && recommendationCategories.size < Math.min(3, allCategories.length)) {
      const categoryCounts = new Map<string, number>();
      recommendations.forEach(p => {
        if (p.categoryId) {
          categoryCounts.set(p.categoryId, (categoryCounts.get(p.categoryId) || 0) + 1);
        }
      });
      
      // Find categories that are over-represented
      const overRepresentedCategories = Array.from(categoryCounts.entries())
        .filter(([, count]) => count > 2)
        .map(([categoryId]) => categoryId);
      
      // Replace some over-represented products with diverse ones
      if (overRepresentedCategories.length > 0) {
        const diverseReplacements: Product[] = [];
        const underrepresentedCategories = allCategories.filter(cat => 
          cat && !overRepresentedCategories.includes(cat) && !recommendationCategories.has(cat)
        );
        
        underrepresentedCategories.forEach(categoryId => {
          if (categoryId) { // Add null check
            const categoryProduct = allProducts
              .filter(p => p.categoryId === categoryId && !userProductIds.has(p.id))
              .sort(() => Math.random() - 0.5)[0];
            if (categoryProduct) {
              diverseReplacements.push(categoryProduct);
            }
          }
        });
        
        // Replace some recommendations with diverse ones
        const productsToReplace = Math.min(diverseReplacements.length, 2);
        if (productsToReplace > 0) {
          recommendations = [
            ...recommendations.slice(0, -productsToReplace),
            ...diverseReplacements.slice(0, productsToReplace)
          ];
        }
      }
    }
    
    // If not enough collaborative recommendations, add diverse products from different categories
    if (recommendations.length < 6) {
      const missingCount = 6 - recommendations.length;
      const usedCategories = new Set(recommendations.map(p => p.categoryId).filter(Boolean));
      const availableCategories = allCategories.filter(cat => !usedCategories.has(cat));
      
      const diverseProducts: Product[] = [];
      availableCategories.forEach(categoryId => {
        if (diverseProducts.length < missingCount && categoryId) { // Add null check
          const categoryProduct = allProducts
            .filter(p => p.categoryId === categoryId && !userProductIds.has(p.id))
            .sort(() => Math.random() - 0.5)[0];
          if (categoryProduct) {
            diverseProducts.push(categoryProduct);
          }
        }
      });
      
      recommendations = [...recommendations, ...diverseProducts].slice(0, 6);
    }
    
    // If still not enough, add random products
    if (recommendations.length < 6) {
      const remainingProducts = allProducts.filter(p => 
        !recommendations.some(rec => rec.id === p.id) && !userProductIds.has(p.id)
      );
      const randomProducts = remainingProducts
        .sort(() => Math.random() - 0.5)
        .slice(0, 6 - recommendations.length);
      recommendations = [...recommendations, ...randomProducts];
    }
    
    return recommendations;
  }
}

export const storage = new MemStorage();
