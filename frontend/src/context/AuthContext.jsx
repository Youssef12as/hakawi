import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const validateAndSetSession = async () => {
      try {
        // 1. Get cached local session
        const { data: { session: localSession } } = await supabase.auth.getSession();
        if (!localSession || !isMounted) {
          if (isMounted) {
            setUser(null);
            setSession(null);
            setLoading(false);
          }
          return;
        }

        // 2. CRITICAL: Validate with the Supabase Auth server if the user actually exists
        const { data: { user: serverUser }, error: userError } = await supabase.auth.getUser();

        if (userError || !serverUser) {
          console.warn('User deleted from auth or session invalid on server. Signing out...');
          await supabase.auth.signOut();
          if (isMounted) {
            setUser(null);
            setSession(null);
            setLoading(false);
          }
          return;
        }

        // 3. Verify user exists in public.profiles table in DB
        const { data: profile, error: profileErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', serverUser.id)
          .maybeSingle();

        if (!profile && !profileErr) {
          console.warn('User deleted from public.profiles table in DB. Signing out...');
          await supabase.auth.signOut();
          if (isMounted) {
            setUser(null);
            setSession(null);
            setLoading(false);
          }
          return;
        }

        if (isMounted) {
          const mergedUser = {
            ...serverUser,
            profile: profile || null,
            user_metadata: {
              ...serverUser.user_metadata,
              full_name: profile?.display_name || serverUser.user_metadata?.full_name,
              avatar_url: profile?.avatar_url || serverUser.user_metadata?.avatar_url,
            },
          };
          setSession(localSession);
          setUser(mergedUser);
          setLoading(false);
        }
      } catch (err) {
        console.error('Session validation error:', err);
        if (isMounted) {
          setUser(null);
          setSession(null);
          setLoading(false);
        }
      }
    };

    validateAndSetSession();

    // Listen for auth changes (login, logout, token refresh, OAuth redirect)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!isMounted) return;

      if (event === 'SIGNED_OUT' || !currentSession) {
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        const { data: { user: serverUser }, error } = await supabase.auth.getUser();
        if (error || !serverUser) {
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', serverUser.id)
          .maybeSingle();

        if (!profile && event === 'SIGNED_IN') {
          console.warn('Profile does not exist in DB for signed-in user. Signing out...');
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }

        const mergedUser = {
          ...serverUser,
          profile: profile || null,
          user_metadata: {
            ...serverUser.user_metadata,
            full_name: profile?.display_name || serverUser.user_metadata?.full_name,
            avatar_url: profile?.avatar_url || serverUser.user_metadata?.avatar_url,
          },
        };
        setSession(currentSession);
        setUser(mergedUser);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Email & Password Sign Up
  const signUpWithEmail = async (email, password, fullName = '', avatarUrl = null) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          avatar_url: avatarUrl,
        },
      },
    });
    if (error) throw error;

    // Explicitly ensure profile is created in public.profiles table
    if (data?.user?.id) {
      const { error: profileErr } = await supabase
        .from('profiles')
        .upsert({
          id: data.user.id,
          display_name: fullName || email.split('@')[0],
          avatar_url: avatarUrl || '',
          updated_at: new Date().toISOString(),
        });
      if (profileErr) {
        console.warn('Profile creation in DB warning:', profileErr);
      }
    }

    return data;
  };

  // Update Profile (name, avatar, etc.) in BOTH DB table and Supabase Auth
  const updateProfile = async ({ fullName, avatarUrl }) => {
    const currentUserId = user?.id;
    if (!currentUserId) throw new Error('لا يوجد مستخدم مسجل');

    const authUpdates = {};
    const profileUpdates = {
      updated_at: new Date().toISOString(),
    };

    if (fullName !== undefined) {
      authUpdates.full_name = fullName;
      profileUpdates.display_name = fullName;
    }
    if (avatarUrl !== undefined) {
      authUpdates.avatar_url = avatarUrl;
      profileUpdates.avatar_url = avatarUrl;
    }

    // 1. Explicitly update public.profiles table in the database
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: currentUserId,
        ...profileUpdates,
      });

    if (profileError) {
      console.error('Error updating public.profiles in DB:', profileError);
      throw new Error(`فشل تحديث بيانات الملف الشخصي في قاعدة البيانات: ${profileError.message}`);
    }

    // 2. Update Supabase Auth user metadata
    let authUser = user;
    try {
      const { data: authData, error: authError } = await supabase.auth.updateUser({
        data: authUpdates,
      });
      if (authError) {
        console.warn('Auth metadata update notice:', authError);
      } else if (authData?.user) {
        authUser = authData.user;
      }
    } catch (authEx) {
      console.warn('Auth metadata update caught notice:', authEx);
    }

    const updatedUser = {
      ...authUser,
      profile: {
        ...(user?.profile || {}),
        ...profileUpdates,
      },
      user_metadata: {
        ...(authUser?.user_metadata || user?.user_metadata),
        ...authUpdates,
      },
    };

    setUser(updatedUser);
    return updatedUser;
  };

  // Update Password directly for logged-in user
  const updatePassword = async (newPassword) => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) throw error;
    return data;
  };

  // Email & Password Sign In
  const signInWithEmail = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;

    if (data?.user) {
      // Check if user's profile still exists in public.profiles in the DB
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();

      if (!profile && !profileErr) {
        // User was deleted from DB!
        await supabase.auth.signOut();
        throw new Error('هذا الحساب غير موجود');
      }

      const mergedUser = {
        ...data.user,
        profile: profile || null,
        user_metadata: {
          ...data.user.user_metadata,
          full_name: profile?.display_name || data.user.user_metadata?.full_name,
          avatar_url: profile?.avatar_url || data.user.user_metadata?.avatar_url,
        },
      };

      setSession(data.session);
      setUser(mergedUser);
    }
    return data;
  };

  // OAuth Sign In (Google or Facebook)
  const signInWithOAuth = async (provider) => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) throw error;
    return data;
  };

  const signInWithGoogle = () => signInWithOAuth('google');
  const signInWithFacebook = () => signInWithOAuth('facebook');

  // Sign Out
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setSession(null);
  };

  // Password reset request
  const resetPassword = async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/settings`,
    });
    if (error) throw error;
    return data;
  };

  const value = {
    user,
    session,
    loading,
    signUpWithEmail,
    signInWithEmail,
    signInWithOAuth,
    signInWithGoogle,
    signInWithFacebook,
    updateProfile,
    updatePassword,
    signOut,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
