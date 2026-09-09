import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { PrismaClient, Role } from "@prisma/client";
import { authenticateToken, AuthRequest, generateTokens, verifyRefreshToken } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

// Constants
const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 12;

// REGISTER
router.post("/register", async (req: Request, res: Response) => {
  const { username, email, password, fullName, phone, role } = req.body;

  if (!username || !email || !password || !fullName || !phone) {
    return res.status(400).json({ message: "Username, email, password, full name, and phone required" });
  }

  // Check if user exists by username or email
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { username },
        { email }
      ]
    },
  });

  if (existingUser) {
    return res.status(409).json({ message: "User already exists" });
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  // Create customer profile first
  const customerProfile = await prisma.customerProfile.create({
    data: {
      fullName,
      phone,
    },
  });

  // Create KYC record
  const kycRecord = await prisma.kycRecord.create({
    data: {
      fullName,
      phone,
      email,
      address: "",
    },
  });

  // Create user with related records
  const user = await prisma.user.create({
    data: {
      username,
      email,
      passwordHash: hashedPassword,
      role: (role as Role) || "CUSTOMER",
      customerProfileId: customerProfile.id,
      kycRecordId: kycRecord.id,
    },
  });

  // Update customer profile and KYC record with userId
  await prisma.customerProfile.update({
    where: { id: customerProfile.id },
    data: { userId: user.id },
  });

  await prisma.kycRecord.update({
    where: { id: kycRecord.id },
    data: { userId: user.id },
  });

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(user.id, user.email, user.role as Role);

  res.status(201).json({
    message: "User registered successfully",
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
  });
});

// LOGIN
router.post("/login", async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password required" });
  }

  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      customerProfile: true,
      kycRecord: true,
    },
  });

  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  // Verify password
  const validPassword = await bcrypt.compare(password, user.passwordHash);

  if (!validPassword) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  // Check if account is active
  if (user.status !== "ACTIVE") {
    return res.status(403).json({ 
      message: "Account is not active. Please contact support.",
      status: user.status 
    });
  }

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(user.id, user.email, user.role as Role);

  res.json({
    message: "Logged in successfully",
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      fullName: user.customerProfile?.fullName,
      kycStatus: user.kycRecord?.idVerificationStatus,
    },
  });
});

// REFRESH TOKEN
router.post("/refresh", async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ message: "Refresh token required" });
  }

  try {
    const decoded = verifyRefreshToken(refreshToken);

    // Fetch user
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (user.status !== "ACTIVE") {
      return res.status(403).json({ message: "Account is not active" });
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(
      user.id,
      user.email,
      user.role as Role
    );

    res.json({
      accessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    res.status(401).json({ message: "Invalid refresh token" });
  }
});

// LOGOUT
router.post("/logout", authenticateToken, async (req: AuthRequest, res: Response) => {
  // In a production system, you would invalidate the refresh token
  // This could be done by maintaining a blacklist in Redis
  res.json({ message: "Logged out successfully" });
});

// GET current user
router.get("/me", authenticateToken, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    include: {
      customerProfile: true,
      kycRecord: true,
    },
  });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res.json({ 
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      customerProfile: user.customerProfile,
      kycRecord: user.kycRecord,
    }
  });
});

export default router;