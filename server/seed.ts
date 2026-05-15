import 'dotenv/config';
import { db } from './db';
import { users, categories, products } from '../shared/schema';
import { MemStorage } from './storage';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log("Starting database seeding...");
  
  const mem = new MemStorage();
  
  const memCategories: any[] = Array.from((mem as any).categories.values());
  const memProducts: any[] = Array.from((mem as any).products.values());
  
  console.log(`Found ${memCategories.length} categories and ${memProducts.length} products to seed.`);
  
  try {
    if (memCategories.length > 0) {
      await db.insert(categories).values(memCategories).onConflictDoNothing();
      console.log("✅ Categories seeded successfully.");
    }
    
    if (memProducts.length > 0) {
      const productsToInsert = memProducts.map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price.toString(),
        originalPrice: p.originalPrice ? p.originalPrice.toString() : null,
        imageUrl: p.imageUrl,
        categoryId: p.categoryId,
        stock: p.stock,
        rating: p.rating ? p.rating.toString() : "0",
        reviewCount: p.reviewCount,
        tags: p.tags,
        features: p.features,
        isActive: p.isActive,
        createdAt: p.createdAt
      }));
      await db.insert(products).values(productsToInsert).onConflictDoNothing();
      console.log("✅ Products seeded successfully.");
    }
    
    // Seed admin user
    const saltRounds = 12;
    const adminPassword = await bcrypt.hash('admin123', saltRounds);
    
    await db.insert(users).values({
      username: "admin",
      email: "admin@shopai.com",
      password: adminPassword,
      isAdmin: true,
      isEmailVerified: true
    }).onConflictDoNothing();
    
    console.log("✅ Admin user seeded successfully.");
    console.log("Seeding completed. You can exit now.");
    process.exit(0);
  } catch (err) {
    console.error("Seeding failed:", err);
    process.exit(1);
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
