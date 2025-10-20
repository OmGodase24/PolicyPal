export interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  lastLoginAt?: Date;
  lastNameChangeAt?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Reward system fields
  totalPoints?: number;
  level?: number;
  badges?: string[];
  currentStreak?: number;
  longestStreak?: number;
  unlockedFeatures?: string[];

  // Password reset fields
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  passwordResetAttempts?: number;
  lastPasswordResetAt?: Date;
  lastProfilePasswordChangeAt?: Date;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}