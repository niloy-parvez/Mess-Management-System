import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import config from "../config";

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

export const generateToken = (payload: {
  id: string;
  email: string;
  role: "admin" | "member";
}): string => {
  return jwt.sign(payload, config.jwtSecret as string, {
    expiresIn: config.jwtExpiry as jwt.SignOptions["expiresIn"],
  });
};

export const verifyToken = (token: string) => {
  return jwt.verify(token, config.jwtSecret);
};

export const resolveRequesterId = (req: { user?: { id: string; profileId?: string } }): string | undefined => {
  // Always use the canonical Supabase auth.users id for all write operations.
  // Legacy public.users profile ids may still exist in the schema, but they should
  // not be used for created_by/verified_by/member mapping in the current architecture.
  return req.user?.id;
};
