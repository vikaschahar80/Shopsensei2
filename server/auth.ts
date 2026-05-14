import jwt from 'jsonwebtoken';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { storage } from './storage';
import { users, type User } from '../shared/schema';

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

// Google OAuth Configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback';

// JWT Token Management
export const generateToken = (userId: string, email: string, isAdmin: boolean = false) => {
  return jwt.sign(
    { userId, email, isAdmin },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

export const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; email: string; isAdmin: boolean };
  } catch (error) {
    return null;
  }
};

// Authentication Middleware
export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }

  try {
    const user = await storage.getUser(decoded.userId);
    if (!user) {
      return res.status(403).json({ message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Authentication error' });
  }
};

// Admin Middleware
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!(req.user as any)?.isAdmin) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// Password Hashing
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
};

export const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

// Google OAuth Strategy Setup
export const setupGoogleStrategy = () => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.warn('Google OAuth credentials not found. Google login will be disabled.');
    // Still set up a placeholder strategy to prevent "Unknown authentication strategy" errors
    passport.use('google', new GoogleStrategy({
      clientID: 'placeholder',
      clientSecret: 'placeholder',
      callbackURL: GOOGLE_CALLBACK_URL,
      scope: ['profile', 'email']
    }, async (accessToken, refreshToken, profile, done) => {
      return done(new Error('Google OAuth is not configured. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.'), undefined);
    }));
    return;
  }

  passport.use('google', new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: GOOGLE_CALLBACK_URL,
    scope: ['profile', 'email']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const googleId = profile.id;
      const email = profile.emails?.[0]?.value;
      const firstName = profile.name?.givenName;
      const lastName = profile.name?.familyName;
      const avatar = profile.photos?.[0]?.value;

      if (!email) {
        return done(new Error('Email not provided by Google'), undefined);
      }

      // Check if user already exists
      let user = await storage.getUserByGoogleId(googleId);
      
      if (!user) {
        // Check if user exists with same email
        user = await storage.getUserByEmail(email);
        
        if (user) {
          // Update existing user with Google info
          user = await storage.updateUserGoogleInfo(user.id, {
            googleId,
            googleEmail: email,
            avatar,
            firstName,
            lastName,
            isEmailVerified: true,
            lastLogin: new Date()
          });
        } else {
          // Create new user
          const username = email.split('@')[0] + '_' + Math.random().toString(36).substr(2, 5);
          user = await storage.createGoogleUser({
            username,
            email,
            googleId,
            googleEmail: email,
            avatar,
            firstName,
            lastName,
            isEmailVerified: true,
            lastLogin: new Date()
          });
        }
      } else {
        // Update last login
        user = await storage.updateUserLastLogin(user.id);
      }

      return done(null, user);
    } catch (error) {
      return done(error, undefined);
    }
  }));

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
};

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
