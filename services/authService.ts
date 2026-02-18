import { User } from '../types';

const STORAGE_KEY = 'dermascan_user_session';
const USERS_DB_KEY = 'dermascan_users_db';

// Simulate a database delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to ensure we always have a database structure
const initializeDB = () => {
  const usersRaw = localStorage.getItem(USERS_DB_KEY);
  if (!usersRaw) {
    // Seed with a default demo user for convenience
    const defaultUsers = {
      'doctor@clinic.com': { password: 'password123', name: 'Dr. Demo' }
    };
    localStorage.setItem(USERS_DB_KEY, JSON.stringify(defaultUsers));
  }
};

export const authService = {
  login: async (email: string, password: string, rememberMe: boolean = true): Promise<User> => {
    initializeDB();
    await delay(800); // Fake network delay
    
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();

    const usersRaw = localStorage.getItem(USERS_DB_KEY);
    const users = usersRaw ? JSON.parse(usersRaw) : {};
    
    const userRecord = users[normalizedEmail];

    if (!userRecord) {
      throw new Error('Account not found. Please register first.');
    }

    if (userRecord.password !== normalizedPassword) {
      throw new Error('Incorrect password. Please try again.');
    }

    const user = { email: normalizedEmail, name: userRecord.name };
      
    if (rememberMe) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      sessionStorage.removeItem(STORAGE_KEY);
    } else {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      localStorage.removeItem(STORAGE_KEY);
    }
      
    return user;
  },

  register: async (email: string, password: string, name: string): Promise<User> => {
    initializeDB();
    await delay(800);
    
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();
    const normalizedName = name.trim();

    const usersRaw = localStorage.getItem(USERS_DB_KEY);
    const users = usersRaw ? JSON.parse(usersRaw) : {};

    if (users[normalizedEmail]) {
      throw new Error('User already exists with this email.');
    }

    users[normalizedEmail] = { password: normalizedPassword, name: normalizedName };
    localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
    
    const user = { email: normalizedEmail, name: normalizedName };
    // Default to persistent session on register
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    return user;
  },

  resetPassword: async (email: string): Promise<void> => {
    await delay(1000);
    const normalizedEmail = email.trim().toLowerCase();
    
    const usersRaw = localStorage.getItem(USERS_DB_KEY);
    const users = usersRaw ? JSON.parse(usersRaw) : {};

    if (!users[normalizedEmail]) {
      throw new Error('No account found with this email address');
    }
    
    // In a real app, we would send an email here.
    return;
  },

  logout: async (): Promise<void> => {
    await delay(300);
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
  },

  getCurrentUser: (): User | null => {
    const session = sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY);
    return session ? JSON.parse(session) : null;
  }
};