import type { Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import passport from "passport";
import cors from "cors";
import { storage } from "./storage";
import { 
  generateToken, 
  verifyToken, 
  authenticateToken, 
  requireAdmin, 
  hashPassword, 
  comparePassword,
  setupGoogleStrategy 
} from "./auth";
import { 
  insertUserSchema, 
  insertProductSchema, 
  insertCartItemSchema, 
  insertOrderSchema,
  insertUserBehaviorSchema 
} from "../shared/schema";
import { z } from "zod";

// Stripe configuration - replace with your actual keys
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";

if (!STRIPE_SECRET_KEY || STRIPE_SECRET_KEY === "") {
  console.warn('Warning: STRIPE_SECRET_KEY not found. Payment functionality will not work.');
  console.log('Please replace the placeholder key with your actual Stripe secret key');
}

const stripe = STRIPE_SECRET_KEY && STRIPE_SECRET_KEY !== "" ? new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2025-07-30.basil",
}) : null;

export function registerRoutes(app: Express): Server {
  
  // Setup CORS
  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
  }));

  // Health check route
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString(), env: process.env.NODE_ENV });
  });

  // Setup Passport and Google OAuth
  app.use(passport.initialize());
  setupGoogleStrategy();

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Normalize email and username
      const email = userData.email.toLowerCase().trim();
      const username = userData.username.toLowerCase().trim();
      
      // Check if user already exists
      const existingUserByEmail = await storage.getUserByEmail(email);
      if (existingUserByEmail) {
        return res.status(400).json({ message: "User with this email already exists" });
      }

      const existingUserByUsername = await storage.getUserByUsername(username);
      if (existingUserByUsername) {
        return res.status(400).json({ message: "Username is already taken" });
      }

      // Hash password
      if (!userData.password) {
        return res.status(400).json({ message: "Password is required" });
      }
      const hashedPassword = await hashPassword(userData.password);
      const user = await storage.createUser({ 
        ...userData, 
        email, 
        username, 
        password: hashedPassword 
      });
      
      // Generate JWT token
      const token = generateToken(user.id, user.email, user.isAdmin || false);
      const { password: _, ...userWithoutPassword } = user;
      
      res.json({ user: userWithoutPassword, token });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const normalizedEmail = email.toLowerCase().trim();
      const user = await storage.getUserByEmail(normalizedEmail);
      
      if (!user || !user.password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValidPassword = await comparePassword(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Generate JWT token
      const token = generateToken(user.id, user.email, user.isAdmin || false);
      const { password: _, ...userWithoutPassword } = user;
      
      res.json({ user: userWithoutPassword, token });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Google OAuth routes
  app.get("/api/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

  app.get("/api/auth/google/callback", 
    passport.authenticate("google", { session: false, failureRedirect: "/login" }),
    async (req, res) => {
      try {
        const user = req.user as any;
        if (!user) {
          return res.redirect("/login?error=authentication_failed");
        }

        // Generate JWT token
        const token = generateToken(user.id, user.email, user.isAdmin || false);
        const { password: _, ...userWithoutPassword } = user;

        // Redirect to frontend with token
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        res.redirect(`${frontendUrl}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify(userWithoutPassword))}`);
      } catch (error) {
        console.error('Google OAuth callback error:', error);
        res.redirect("/login?error=token_generation_failed");
      }
    }
  );

  // Verify token route
  app.get("/api/auth/verify", authenticateToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "User not found" });
      }
      const { password: _, ...userWithoutPassword } = req.user as any;
      res.json({ user: userWithoutPassword, valid: true });
    } catch (error: any) {
      res.status(401).json({ message: "Invalid token" });
    }
  });

  // Logout route
  app.post("/api/auth/logout", (req, res) => {
    res.json({ message: "Logged out successfully" });
  });

  // Categories routes
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error: any) {
      console.error('Categories error:', error.message);
      res.json([]); // Return empty array instead of 500
    }
  });

  // Products routes
  app.get("/api/products", async (req, res) => {
    try {
      const { categoryId, search, minPrice, maxPrice } = req.query;
      const filters = {
        categoryId: categoryId as string,
        search: search as string,
        minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
      };
      
      const products = await storage.getProducts(filters);
      res.json(products);
    } catch (error: any) {
      console.error('Products error:', error.message);
      res.json([]); // Return empty array instead of 500
    }
  });

  // Recommendations and Popular products (Must be BEFORE :id routes)
  app.get("/api/products/popular", async (req, res) => {
    try {
      const popularProducts = await storage.getPopularProducts();
      res.json(popularProducts);
    } catch (error: any) {
      console.error('Popular products error:', error.message);
      res.json([]); // Return empty array instead of 500
    }
  });

  app.get("/api/recommendations/:userId", async (req, res) => {
    try {
      const recommendations = await storage.getRecommendedProducts(req.params.userId);
      res.json(recommendations);
    } catch (error: any) {
      console.error('Recommendations error:', error.message);
      res.json([]); // Return empty array instead of 500
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/products", async (req, res) => {
    try {
      const productData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(productData);
      res.json(product);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/products/:id", async (req, res) => {
    try {
      const updates = insertProductSchema.partial().parse(req.body);
      const product = await storage.updateProduct(req.params.id, updates);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteProduct(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Cart routes
  app.get("/api/cart/:userId", async (req, res) => {
    try {
      const cartItems = await storage.getCartItems(req.params.userId);
      res.json(cartItems);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/cart", async (req, res) => {
    try {
      const cartItemData = insertCartItemSchema.parse(req.body);
      const cartItem = await storage.addToCart(cartItemData);
      res.json(cartItem);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/cart/:id", async (req, res) => {
    try {
      const { quantity } = req.body;
      const cartItem = await storage.updateCartItem(req.params.id, quantity);
      if (!cartItem) {
        return res.status(404).json({ message: "Cart item not found" });
      }
      res.json(cartItem);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/cart/:id", async (req, res) => {
    try {
      const deleted = await storage.removeFromCart(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Cart item not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/cart/user/:userId", async (req, res) => {
    try {
      await storage.clearCart(req.params.userId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // User behavior tracking
  app.post("/api/behavior", async (req, res) => {
    try {
      const behaviorData = insertUserBehaviorSchema.parse(req.body);
      const behavior = await storage.trackUserBehavior(behaviorData);
      res.json(behavior);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Orders routes
  app.get("/api/orders", async (req, res) => {
    try {
      const { userId } = req.query;
      const orders = await storage.getOrders(userId as string);
      res.json(orders);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/orders", async (req, res) => {
    try {
      const orderData = insertOrderSchema.parse(req.body);
      const order = await storage.createOrder(orderData);
      res.json(order);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/orders/:id/status", async (req, res) => {
    try {
      const { status } = req.body;
      const order = await storage.updateOrderStatus(req.params.id, status);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      res.json(order);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Stripe payment integration
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ 
          message: "Stripe is not configured. Please add STRIPE_SECRET_KEY environment variable." 
        });
      }

      const { amount, currency = "usd" } = req.body;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        metadata: {
          source: "shopai-ecommerce"
        }
      });

      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      res.status(500).json({ message: "Error creating payment intent: " + error.message });
    }
  });

  // Analytics for admin
  app.get("/api/analytics", async (req, res) => {
    try {
      const orders = await storage.getOrders();
      const products = await storage.getProducts();
      const popularProducts = await storage.getPopularProducts();
      
      const totalSales = orders.reduce((sum, order) => sum + parseFloat(order.total), 0);
      const totalOrders = orders.length;
      const totalProducts = products.length;
      
      const recentOrders = orders
        .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
        .slice(0, 10);

      res.json({
        totalSales: totalSales.toFixed(2),
        totalOrders,
        totalProducts,
        recentOrders,
        popularProducts: popularProducts.slice(0, 5),
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
