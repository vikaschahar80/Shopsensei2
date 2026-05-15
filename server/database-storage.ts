import { IStorage } from "./storage";
import { db } from "./db";
import { eq, and, desc, ilike, sql } from "drizzle-orm";
import {
  users, categories, products, cartItems, orders, userBehavior,
  type User, type InsertUser, type Category, type InsertCategory,
  type Product, type InsertProduct, type CartItem, type InsertCartItem,
  type Order, type InsertOrder, type UserBehavior, type InsertUserBehavior
} from "../shared/schema";

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async createGoogleUser(userData: Omit<InsertUser, 'password'> & { googleId: string; googleEmail: string; avatar?: string; firstName?: string; lastName?: string; isEmailVerified?: boolean; lastLogin?: Date }): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async updateUserGoogleInfo(userId: string, updates: { googleId: string; googleEmail: string; avatar?: string; firstName?: string; lastName?: string; isEmailVerified?: boolean; lastLogin?: Date }): Promise<User> {
    const [user] = await db.update(users).set(updates).where(eq(users.id, userId)).returning();
    return user;
  }

  async updateUserLastLogin(userId: string): Promise<User> {
    const [user] = await db.update(users).set({ lastLogin: new Date() }).where(eq(users.id, userId)).returning();
    return user;
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories);
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [created] = await db.insert(categories).values(category).returning();
    return created;
  }

  // Products
  async getProducts(filters?: { categoryId?: string; search?: string; minPrice?: number; maxPrice?: number }): Promise<Product[]> {
    let conditions = [];
    if (filters?.categoryId) conditions.push(eq(products.categoryId, filters.categoryId));
    if (filters?.search) conditions.push(ilike(products.name, `%${filters.search}%`));
    
    if (filters?.minPrice !== undefined) conditions.push(sql`${products.price} >= ${filters.minPrice}`);
    if (filters?.maxPrice !== undefined) conditions.push(sql`${products.price} <= ${filters.maxPrice}`);

    let query = db.select().from(products);
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    return await query.orderBy(desc(products.createdAt));
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [created] = await db.insert(products).values(product).returning();
    return created;
  }

  async updateProduct(id: string, updates: Partial<InsertProduct>): Promise<Product | undefined> {
    const [updated] = await db.update(products).set(updates).where(eq(products.id, id)).returning();
    return updated;
  }

  async deleteProduct(id: string): Promise<boolean> {
    const result = await db.delete(products).where(eq(products.id, id)).returning();
    return result.length > 0;
  }

  // Cart
  async getCartItems(userId: string): Promise<(CartItem & { product: Product })[]> {
    const items = await db.select({
      cartItem: cartItems,
      product: products
    })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .where(eq(cartItems.userId, userId));

    return items.map(row => ({
      ...row.cartItem,
      product: row.product
    }));
  }

  async addToCart(cartItem: InsertCartItem): Promise<CartItem> {
    const [existing] = await db.select().from(cartItems).where(
      and(eq(cartItems.userId, cartItem.userId!), eq(cartItems.productId, cartItem.productId!))
    );

    if (existing) {
      const [updated] = await db.update(cartItems)
        .set({ quantity: existing.quantity + (cartItem.quantity ?? 1) })
        .where(eq(cartItems.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await db.insert(cartItems).values(cartItem).returning();
    return created;
  }

  async updateCartItem(id: string, quantity: number): Promise<CartItem | undefined> {
    const [updated] = await db.update(cartItems).set({ quantity }).where(eq(cartItems.id, id)).returning();
    return updated;
  }

  async removeFromCart(id: string): Promise<boolean> {
    const result = await db.delete(cartItems).where(eq(cartItems.id, id)).returning();
    return result.length > 0;
  }

  async clearCart(userId: string): Promise<void> {
    await db.delete(cartItems).where(eq(cartItems.userId, userId));
  }

  // Orders
  async createOrder(order: InsertOrder): Promise<Order> {
    const [created] = await db.insert(orders).values(order).returning();
    return created;
  }

  async getOrders(userId?: string): Promise<Order[]> {
    if (userId) {
      return await db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));
    }
    return await db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  async updateOrderStatus(id: string, status: string): Promise<Order | undefined> {
    const [updated] = await db.update(orders).set({ status }).where(eq(orders.id, id)).returning();
    return updated;
  }

  // User Behavior
  async trackUserBehavior(behavior: InsertUserBehavior): Promise<UserBehavior> {
    const [created] = await db.insert(userBehavior).values(behavior).returning();
    return created;
  }

  async getUserBehavior(userId: string): Promise<UserBehavior[]> {
    return await db.select().from(userBehavior).where(eq(userBehavior.userId, userId)).orderBy(desc(userBehavior.timestamp));
  }

  async getPopularProducts(): Promise<Product[]> {
    return await db.select().from(products).orderBy(desc(products.reviewCount)).limit(6);
  }

  async getRecommendedProducts(userId: string): Promise<Product[]> {
    return await db.select().from(products).orderBy(desc(products.rating)).limit(6);
  }
}
