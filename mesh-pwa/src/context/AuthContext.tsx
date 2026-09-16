"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { onAuthStateChanged, User, signOut as firebaseSignOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, onSnapshot, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { useRouter } from "next/navigation";

type AuthContextType = {
    user: User | null;
    userData: any /* eslint-disable-line @typescript-eslint/no-explicit-any */; // Extended user profile from Firestore
    resolvedUid: string | null;
    loading: boolean;
    logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<any>(null);
    const [resolvedUid, setResolvedUid] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        let isSubscribed = true;
        let isFirstCheck = true;
        let pendingTimeout: NodeJS.Timeout | null = null;

        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            if (!isSubscribed) return;

            if (currentUser) {
                if (pendingTimeout) {
                    clearTimeout(pendingTimeout);
                    pendingTimeout = null;
                }
                isFirstCheck = false;
                setUser(currentUser);
                setLoading(true);

                try {
                    // Try to resolve the user document by checking UID, email, or phone number
                    let foundUid = currentUser.uid;
                    let foundData = null;

                    // 1. Direct UID document lookup
                    const directSnap = await getDoc(doc(db, "users", currentUser.uid));
                    if (directSnap.exists()) {
                        foundUid = currentUser.uid;
                        foundData = directSnap.data();
                    } else {
                        // 2. Lookup by email
                        if (currentUser.email) {
                            const normalizedEmail = currentUser.email.toLowerCase();
                            let snapEmail = await getDocs(query(collection(db, "users"), where("email_lowercase", "==", normalizedEmail)));
                            if (snapEmail.empty) {
                                snapEmail = await getDocs(query(collection(db, "users"), where("email", "==", currentUser.email)));
                            }
                            if (snapEmail.empty) {
                                snapEmail = await getDocs(query(collection(db, "users"), where("email", "==", normalizedEmail)));
                            }
                            if (!snapEmail.empty) {
                                const matchingDoc = snapEmail.docs[0];
                                foundUid = matchingDoc.id;
                                foundData = matchingDoc.data();
                                // Ensure currentUser.uid also has a direct document
                                try {
                                    await setDoc(doc(db, "users", currentUser.uid), {
                                        ...foundData,
                                        id: currentUser.uid,
                                        email: currentUser.email,
                                        email_lowercase: normalizedEmail
                                    }, { merge: true });
                                } catch (_) {}
                            }
                        }
                        // 3. Lookup by phone number (if signed in via Phone and not found yet)
                        if (foundUid === currentUser.uid && currentUser.phoneNumber) {
                            const qPhone = query(collection(db, "users"), where("phoneNumber", "==", currentUser.phoneNumber));
                            const snapPhone = await getDocs(qPhone);
                            if (!snapPhone.empty) {
                                const matchingDoc = snapPhone.docs[0];
                                foundUid = matchingDoc.id;
                                foundData = matchingDoc.data();
                            }
                        }
                    }

                    if (isSubscribed) {
                        setResolvedUid(foundUid);
                        if (foundData) {
                            setUserData(foundData);
                        }
                    }
                } catch (err) {
                    console.error("AuthContext: failed to resolve user UID:", err);
                    if (isSubscribed) {
                        setResolvedUid(currentUser.uid);
                    }
                }
            } else {
                if (pendingTimeout) {
                    clearTimeout(pendingTimeout);
                    pendingTimeout = null;
                }
                if (isSubscribed) {
                    setUser(null);
                    setUserData(null);
                    setResolvedUid(null);
                    setLoading(false);
                }
            }
        });

        return () => {
            isSubscribed = false;
            if (pendingTimeout) {
                clearTimeout(pendingTimeout);
            }
            unsubscribeAuth();
        };
    }, []);

    useEffect(() => {
        if (!user || !resolvedUid) return;

        const userDocRef = doc(db, "users", resolvedUid);

        const unsubscribeFirestore = onSnapshot(userDocRef, async (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setUserData(data);
                setLoading(false);
            } else {
                if (docSnap.metadata.fromCache) {
                    console.log("AuthContext: user doc not found in cache, waiting for server...");
                    return;
                }
                console.log("AuthContext: user doc does not exist yet (onboarding/signup in progress).");
                setUserData(null);
                setLoading(false);
            }
        }, (error) => {
            console.error("AuthContext: user doc snapshot error:", error);
            setLoading(false);
        });

        return () => unsubscribeFirestore();
    }, [user, resolvedUid]);

    async function logout() {
        if (typeof window !== "undefined") {
            localStorage.removeItem("mesh_session_token");
            localStorage.removeItem("mesh_onboarding_complete");
        }
        await firebaseSignOut(auth);
        router.push("/login");
    }

    return (
        <AuthContext.Provider value={{ user, userData, resolvedUid, loading, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within AuthProvider");
    return context;
};
