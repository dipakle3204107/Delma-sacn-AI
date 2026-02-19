import { supabase } from '../lib/supabaseClient';
import { User } from '../types';

// Helper to map Supabase user to our app's User type
const mapUser = (supabaseUser: any): User => {
  if (!supabaseUser) throw new Error('No user data');
  // Support both 'name' (metadata) and 'full_name' (often from OAuth)
  const name = supabaseUser.user_metadata?.name || 
               supabaseUser.user_metadata?.full_name || 
               supabaseUser.email?.split('@')[0] || 
               'User';
               
  return {
    email: supabaseUser.email || '',
    name: name,
  };
};

const handleAuthError = (error: any) => {
  console.error("Auth Error details:", error);
  const msg = (error.message || '').toLowerCase();
  
  if (msg.includes('rate limit') || error.status === 429) {
    throw new Error('Too many attempts. Please wait 60 seconds before trying again.');
  }
  if (msg.includes('security purposes')) {
    throw new Error('For security, please wait a moment before trying again.');
  }
  if (msg.includes('invalid login credentials')) {
    throw new Error('Incorrect email or password. Please check your credentials or register if you are a new user.');
  }
  if (msg.includes('user not found')) {
    throw new Error('No account found with this email. Please register first.');
  }
  if (msg.includes('unsupported provider') || msg.includes('provider is not enabled')) {
    throw new Error('Google Sign-In is currently disabled by the administrator. Please use Email and Password.');
  }
  
  throw new Error(error.message || 'Authentication failed');
};

export const authService = {
  login: async (email: string, password: string, rememberMe: boolean = true): Promise<User> => {
    // 1. Authenticate with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      handleAuthError(error);
    }

    if (data.user) {
      // 2. Log Login Time into 'user_activity_logs'
      try {
        await supabase.from('user_activity_logs').insert([
          { 
            user_id: data.user.id, 
            login_at: new Date().toISOString() 
          }
        ]);
      } catch (logError) {
        // We warn but don't block login if logging fails (e.g. table doesn't exist yet)
        console.warn("Failed to log login activity:", logError);
      }
    }

    // Safely handle potential null user if something edge-case happens, though error usually catches it
    if (!data.user) throw new Error("Login succeeded but user data is missing.");

    return mapUser(data.user);
  },

  signInWithGoogle: async (): Promise<void> => {
    // Use skipBrowserRedirect to manually handle the navigation. 
    // This allows us to try to break out of iframes (StackBlitz/Replit/CodeSandbox)
    // to avoid "www.google.com refused to connect" errors.
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        skipBrowserRedirect: true, 
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      handleAuthError(error);
      return;
    }

    if (data?.url) {
      // Try to redirect the top-level window to break out of preview iframes
      try {
        // Check if we are in an iframe
        if (window.top && window.top !== window.self) {
          window.top.location.href = data.url;
        } else {
          window.location.href = data.url;
        }
      } catch (e) {
        // Fallback if cross-origin policies block access to window.top
        window.location.href = data.url;
      }
    }
  },

  register: async (email: string, password: string, name: string): Promise<User> => {
    // 1. Sign Up with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    });

    if (error) {
      handleAuthError(error);
    }

    // If email confirmation is enabled in Supabase, data.user might be returned but session null.
    // If confirmation is required, Supabase sends an email.
    
    if (!data.user) {
      throw new Error('Registration initiated, but no user data returned. Check Supabase logs.');
    }
    
    // Check if session is null (implies email confirmation is on and pending)
    if (data.user && !data.session) {
        throw new Error('Registration successful! Please check your email to confirm your account before logging in.');
    }

    // 2. Create entry in 'profiles' table
    // Only do this if we have a session (user is confirmed or auto-confirm is ON)
    if (data.user) {
        try {
          // Check if profile exists first to avoid duplicate key errors if retrying
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', data.user.id)
            .single();

          if (!existingProfile) {
              await supabase.from('profiles').insert([
                {
                  id: data.user.id,
                  full_name: name,
                  email: email
                }
              ]);
          }
        } catch (profileError) {
          console.warn("Failed to create/check user profile record:", profileError);
        }
    }

    return mapUser(data.user);
  },

  resetPassword: async (email: string): Promise<void> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    
    if (error) {
      handleAuthError(error);
    }
  },

  logout: async (): Promise<void> => {
    // 1. Get current user before signing out to update their log
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      // 2. Update the latest open log entry with logout_at time
      try {
        // Find the most recent login for this user that hasn't been closed
        const { data: logs } = await supabase
          .from('user_activity_logs')
          .select('id')
          .eq('user_id', user.id)
          .is('logout_at', null)
          .order('login_at', { ascending: false })
          .limit(1);

        if (logs && logs.length > 0) {
            await supabase
              .from('user_activity_logs')
              .update({ logout_at: new Date().toISOString() })
              .eq('id', logs[0].id);
        }
      } catch (logError) {
        console.warn("Failed to log logout activity:", logError);
      }
    }

    // 3. Perform SignOut
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error.message);
    }
  },

  getCurrentSession: async (): Promise<User | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      return mapUser(session.user);
    }
    return null;
  }
};