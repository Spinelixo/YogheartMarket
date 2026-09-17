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
    isUserDataLoaded: boolean;
    logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function checkHasCachedAuth(): boolean {
    if (typeof window === "undefined") return false;
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith("firebase:authUser") || key === "mesh_session_token")) {
                return true;
            }
        }
    } catch (_) {}
    return false;
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(() => auth.currentUser || null);
    const [userData, setUserData] = useState<any>(null);
    const [resolvedUid, setResolvedUid] = useState<string | null>(() => auth.currentUser?.uid || null);
    const [loading, setLoading] = useState<boolean>(() => checkHasCachedAuth());
    const [isUserDataLoaded, setIsUserDataLoaded] = useState<boolean>(() => !auth.currentUser);
    const router = useRouter();

    useEffect(() => {
        let isSubscribed = true;

        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            if (!isSubscribed) return;

            if (currentUser) {
                setUser(currentUser);
                setResolvedUid(currentUser.uid);
                // Mark user doc as not yet loaded until Firestore snapshot responds
                setIsUserDataLoaded(false);
                // Immediately mark loading false so routes and screens don't stall
                setLoading(false);

                // Asynchronously check for legacy email-alias unification in background without blocking UI
                (async () => {
                    try {
                        if (!currentUser.email) return;
                        const normalizedEmail = currentUser.email.toLowerCase();
                        const directSnap = await getDoc(doc(db, "users", currentUser.uid));
                        if (!directSnap.exists()) {
                            let snapEmail = await getDocs(query(collection(db, "users"), where("email_lowercase", "==", normalizedEmail)));
                            if (snapEmail.empty) {
                                snapEmail = await getDocs(query(collection(db, "users"), where("email", "==", currentUser.email)));
                            }
                            if (!snapEmail.empty && isSubscribed) {
                                const matchingDoc = snapEmail.docs[0];
                                const matchedData = matchingDoc.data();
                                setResolvedUid(matchingDoc.id);
                                setUserData(matchedData);
                                setIsUserDataLoaded(true);
                                try {
                                    await setDoc(doc(db, "users", currentUser.uid), {
                                        ...matchedData,
                                        id: currentUser.uid,
                                        email: currentUser.email,
                                        email_lowercase: normalizedEmail
                                    }, { merge: true });
                                } catch (_) {}
                            }
                        }
                    } catch (err) {
                        console.error("AuthContext: background user resolution error:", err);
                    }
                })();
            } else {
                if (isSubscribed) {
                    setUser(null);
                    setUserData(null);
                    setResolvedUid(null);
                    setIsUserDataLoaded(true);
                    setLoading(false);
                }
            }
        });

        return () => {
            isSubscribed = false;
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
                setIsUserDataLoaded(true);
                setLoading(false);
            } else {
                if (docSnap.metadata.fromCache) {
                    console.log("AuthContext: user doc not found in cache, waiting for server...");
                    return;
                }
                console.log("AuthContext: user doc does not exist yet (onboarding/signup in progress).");
                setUserData(null);
                setIsUserDataLoaded(true);
                setLoading(false);
            }
        }, (error) => {
            console.error("AuthContext: user doc snapshot error:", error);
            setIsUserDataLoaded(true);
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
        <AuthContext.Provider value={{ user, userData, resolvedUid, loading, isUserDataLoaded, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within AuthProvider");
    return context;
};
