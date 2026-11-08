
import { initializeApp } from "firebase/app";
import {
  getAuth,
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";

const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
});

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const changePassword = async (currentPassword, newPassword) => {
  const user = auth.currentUser;

  if (!user || !user.email) {
    throw new Error("No authenticated user found.");
  }

  const credential = EmailAuthProvider.credential(
    user.email,
    currentPassword
  );

  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
};
