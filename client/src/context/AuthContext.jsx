import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged, signOut, signInWithPopup,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  updateProfile, sendEmailVerification, sendPasswordResetEmail,
} from "firebase/auth";
import { auth, googleProvider } from "../config/firebase";
import api from "../services/api";
import { getStoredRef, clearStoredRef } from "../utils/referral";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  const register = async ({ fullName, email, password, phone, country, referralCode }) => {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: fullName });
  await sendEmailVerification(cred.user);
  await api.post("/auth/sync", { fullName, phone, country, referralCode: referralCode || "" });
  clearStoredRef();
  return cred.user;
};

  const login = async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    await api.post("/auth/sync", {});
    return cred.user;
  };

  const loginWithGoogle = async () => {
  const cred = await signInWithPopup(auth, googleProvider);
  await api.post("/auth/sync", { referralCode: getStoredRef() });  // ignored for existing users
  clearStoredRef();
  return cred.user;
};

  const resendVerification = () => sendEmailVerification(auth.currentUser);
  const resetPassword = (email) => sendPasswordResetEmail(auth, email);
  const logout = () => signOut(auth);

  const refreshUser = async () => {
    await auth.currentUser.reload();
    setUser({ ...auth.currentUser });
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, register, login, loginWithGoogle, logout,
               resendVerification, resetPassword, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}