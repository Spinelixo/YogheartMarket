"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useMockData } from "@/context/MockContext";
import { useAuth } from "@/context/AuthContext";
import { processImageFile, cropImageToSquareWithPosition } from "@/utils/imageProcessor";
import { clsx } from "clsx";
import {
  User, Camera, ArrowRight, ChevronLeft, Plus, X, Loader2, MoveVertical
} from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const { uploadImageToStorage } = useMockData();
  const { user, userData, loading: authLoading } = useAuth();

  const localOnboardingComplete =
    typeof window !== "undefined" &&
    localStorage.getItem("mesh_onboarding_complete") === "true";

  // Active step: 1 (Name), 2 (Birthday), 3 (Photos)
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Step 1: Name
  const [name, setName] = useState("");
  const isInitialized = useRef(false);

  // Step 2: Birthday
  const [dobDay, setDobDay] = useState("");
  const [dobMonth, setDobMonth] = useState("");
  const [dobYear, setDobYear] = useState("");
  const dayInputRef = useRef<HTMLInputElement>(null);
  const monthInputRef = useRef<HTMLInputElement>(null);
  const yearInputRef = useRef<HTMLInputElement>(null);

  // Step 3: Photos
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);
  const [photoSlotTarget, setPhotoSlotTarget] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mainPhotoPosY, setMainPhotoPosY] = useState(50); // 0 = top, 50 = center, 100 = bottom
  const isDraggingMainRef = useRef(false);
  const dragStartYRef = useRef(0);
  const dragStartPosRef = useRef(50);

  // Redirect if already onboarded
  useEffect(() => {
    if (userData?.onboardingComplete || localOnboardingComplete) {
      router.replace("/");
    }
  }, [userData, localOnboardingComplete, router]);

  // Prefill existing user data if available
  useEffect(() => {
    if (userData && !isInitialized.current) {
      isInitialized.current = true;
      if (userData.name && userData.name !== "User") {
        setName(userData.name);
      }
      if (userData.dob) {
        const parts = userData.dob.split("-");
        if (parts.length === 3) {
          setDobYear(parts[0]);
          setDobMonth(parts[1]);
          setDobDay(parts[2]);
        }
      }
      if (userData.photos && userData.photos.length > 0) {
        setPhotos(userData.photos);
      } else if (userData.avatar) {
        setPhotos([userData.avatar]);
      }
    }
  }, [userData]);

  // ─── DOB HELPERS ────────────────────────────────────────────────────────
  const handleDayChange = (val: string) => {
    const cleaned = val.replace(/[^0-9]/g, "");
    setDobDay(cleaned);
    if (cleaned.length === 2 && monthInputRef.current) {
      monthInputRef.current.focus();
    }
  };

  const handleMonthChange = (val: string) => {
    const cleaned = val.replace(/[^0-9]/g, "");
    setDobMonth(cleaned);
    if (cleaned.length === 2 && yearInputRef.current) {
      yearInputRef.current.focus();
    }
  };

  const handleYearChange = (val: string) => {
    const cleaned = val.replace(/[^0-9]/g, "");
    setDobYear(cleaned);
  };

  const getAgeFromDob = (): number | null => {
    const m = parseInt(dobMonth, 10);
    const d = parseInt(dobDay, 10);
    const y = parseInt(dobYear, 10);
    if (!m || !d || !y || m < 1 || m > 12 || d < 1 || d > 31 || y < 1900) {
      return null;
    }
    const dob = new Date(y, m - 1, d);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  };

  const validateDob = (): boolean => {
    const age = getAgeFromDob();
    if (age === null) {
      setErrorMsg("Please enter a valid date of birth.");
      return false;
    }
    if (age < 18) {
      setErrorMsg("You must be 18 or older to join Yogheart.");
      return false;
    }
    if (age > 120) {
      setErrorMsg("Please enter a valid date of birth.");
      return false;
    }
    return true;
  };

  // ─── STEP TRANSITIONS ───────────────────────────────────────────────────
  const goForward = (nextStep: number) => {
    setErrorMsg("");
    setDirection("forward");
    setStep(nextStep);
  };

  const goBack = () => {
    setErrorMsg("");
    setDirection("back");
    if (step > 1) {
      setStep(step - 1);
    }
  };

  // ─── PHOTO SELECTION ────────────────────────────────────────────────────
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const targetIdx = photoSlotTarget;
    setUploadingSlot(targetIdx);
    setErrorMsg("");

    try {
      // 1. Process client-side to optimized base64 for instant preview
      const { dataUrl } = await processImageFile(file);

      // Instant optimistic update in local state (no hanging!)
      setPhotos((prev) => {
        const next = [...prev];
        next[targetIdx] = dataUrl;
        return next;
      });
      setUploadingSlot(null);

      // 2. Non-blocking background upload to Firebase Storage with a 3.5s timeout
      const uid = user?.uid;
      if (uid && uploadImageToStorage) {
        Promise.race([
          uploadImageToStorage(
            dataUrl,
            `photos/${uid}/photo_${targetIdx}_${Date.now()}`
          ),
          new Promise<string>((_, reject) =>
            setTimeout(() => reject(new Error("Storage timeout")), 3500)
          ),
        ])
          .then((downloadUrl) => {
            setPhotos((prev) => {
              const next = [...prev];
              next[targetIdx] = downloadUrl;
              return next;
            });
          })
          .catch((err) => {
            console.warn("Storage upload deferred/skipped; using local image data:", err);
          });
      }
    } catch (err) {
      console.error("Photo processing failed:", err);
      setUploadingSlot(null);
      setErrorMsg("Unable to process image. Please try another file.");
    }

    e.target.value = "";
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // ─── FINISH ONBOARDING ──────────────────────────────────────────────────
  const handleFinish = async () => {
    if (loading) return;
    setLoading(true);
    setErrorMsg("");

    try {
      const uid = user?.uid;
      const age = getAgeFromDob() || 18;
      const dobString =
        dobYear && dobMonth && dobDay
          ? `${dobYear}-${dobMonth.padStart(2, "0")}-${dobDay.padStart(2, "0")}`
          : "";

      const validPhotos = photos.filter(Boolean);
      let mainAvatar = validPhotos[0] || null;

      // If user provided a main photo, apply their custom framing before saving
      if (mainAvatar) {
        try {
          mainAvatar = await cropImageToSquareWithPosition(mainAvatar, mainPhotoPosY);
          validPhotos[0] = mainAvatar;
        } catch (cropErr) {
          console.warn("Avatar cropping skipped, using original:", cropErr);
        }
      }

      const trimmedName = name.trim() || "User";

      if (uid) {
        await setDoc(
          doc(db, "users", uid),
          {
            name: trimmedName,
            age,
            dob: dobString,
            avatar: mainAvatar,
            photoURL: mainAvatar,
            photos: validPhotos,
            avatarPosY: mainPhotoPosY,
            onboardingComplete: true,
            updatedAt: new Date().toISOString(),
            marketplaceStore: {
              storeName: trimmedName,
              avatar: mainAvatar,
              bio: "Active seller on Yogheart Marketplace.",
              joinedYear: new Date().getFullYear().toString(),
              rating: 5.0,
              reviewCount: 0,
              responseRate: "Fast Replies (~10m)"
            }
          },
          { merge: true }
        );

        // Automatically create Store Feed posts for all extra photos uploaded
        const extraPhotos = validPhotos.slice(1);
        for (let i = 0; i < extraPhotos.length; i++) {
          const extraPhoto = extraPhotos[i];
          if (!extraPhoto) continue;
          try {
            const moodId = crypto.randomUUID();
            await setDoc(doc(db, "moods", moodId), {
              userId: uid,
              userName: trimmedName,
              userAvatar: mainAvatar,
              userColor: "bg-emerald-100",
              type: "photo",
              mediaUrl: extraPhoto,
              caption: "Store feed update ✨",
              createdAt: new Date(Date.now() - (extraPhotos.length - i) * 2000).toISOString(),
              likes: [],
              comments: [],
            });
          } catch (postErr) {
            console.warn("Failed to create storefront feed post for extra photo:", postErr);
          }
        }
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("mesh_onboarding_complete", "true");
      }
      router.replace("/");
    } catch (err) {
      console.error("Failed to complete onboarding:", err);
      // Fallback: Ensure user is not blocked even if offline/permission issue
      if (typeof window !== "undefined") {
        localStorage.setItem("mesh_onboarding_complete", "true");
      }
      router.replace("/");
    } finally {
      setLoading(false);
    }
  };

  // Progress percentage (3 steps: 33%, 66%, 100%)
  const progressPercent = Math.round((step / 3) * 100);

  return (
    <div className="min-h-screen w-full flex flex-col bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-sans relative select-none">
      {/* ── Top Header with Progress Bar ── */}
      <header className="w-full max-w-md mx-auto pt-6 px-6 pb-4 shrink-0">
        <div className="flex items-center justify-between h-10 mb-4">
          {step > 1 ? (
            <button
              type="button"
              onClick={goBack}
              className="p-2 -ml-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Go back"
            >
              <ChevronLeft size={24} />
            </button>
          ) : (
            <div className="w-8" />
          )}

          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Step {step} of 3
          </span>

          {step === 3 ? (
            <button
              type="button"
              onClick={handleFinish}
              disabled={loading}
              className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline px-2 py-1"
            >
              Skip
            </button>
          ) : (
            <div className="w-8" />
          )}
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-emerald-500 rounded-full"
            initial={{ width: "33%" }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </header>

      {/* ── Main Content Area ── */}
      <main className="flex-1 flex flex-col max-w-md mx-auto w-full px-6 overflow-y-auto">
        <AnimatePresence mode="wait">
          {/* ═══════════════ STEP 1: NAME ═══════════════ */}
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex-1 flex flex-col justify-between py-6"
            >
              <div className="flex-1 flex flex-col justify-center">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/40 rounded-3xl mx-auto flex items-center justify-center mb-4 text-emerald-600 dark:text-emerald-400 shadow-sm border border-emerald-100 dark:border-emerald-900/40">
                    <User size={30} />
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold mb-2 tracking-tight">
                    What should we call you?
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 px-4">
                    This is how you&apos;ll appear to buyers and sellers on Yogheart Market.
                  </p>
                </div>

                <div className="w-full max-w-sm mx-auto">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (errorMsg) setErrorMsg("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && name.trim()) {
                        goForward(2);
                      }
                    }}
                    placeholder="Your first name"
                    className="w-full text-center text-xl font-bold bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl py-4 focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white transition-all shadow-inner"
                    autoFocus
                  />
                  {errorMsg && (
                    <p className="text-sm text-red-500 font-medium text-center mt-3 animate-fade-in">
                      {errorMsg}
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-6 pb-8">
                <button
                  type="button"
                  onClick={() => {
                    if (!name.trim()) {
                      setErrorMsg("Please enter your name to continue");
                      return;
                    }
                    goForward(2);
                  }}
                  disabled={!name.trim()}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-2xl font-bold text-base shadow-lg shadow-emerald-600/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                >
                  Continue <ArrowRight size={18} />
                </button>
              </div>
            </motion.div>
          )}

          {/* ═══════════════ STEP 2: BIRTHDAY ═══════════════ */}
          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex-1 flex flex-col justify-between py-6"
            >
              <div className="flex-1 flex flex-col justify-center">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/40 rounded-3xl mx-auto flex items-center justify-center mb-4 text-2xl shadow-sm border border-amber-100 dark:border-amber-900/40">
                    🎂
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold mb-2 tracking-tight">
                    When&apos;s your birthday?
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 px-6 leading-relaxed">
                    Your age and birthdate stay private. We use this to fight against fraud or system abuse.
                  </p>
                </div>

                <div className="flex gap-3 justify-center mb-4">
                  <div className="flex flex-col items-center">
                    <input
                      ref={dayInputRef}
                      type="text"
                      inputMode="numeric"
                      maxLength={2}
                      value={dobDay}
                      onChange={(e) => {
                        handleDayChange(e.target.value);
                        if (errorMsg) setErrorMsg("");
                      }}
                      placeholder="DD"
                      className="w-20 text-center text-xl font-bold bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl py-4 focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white transition-all"
                      autoFocus
                    />
                    <span className="text-[11px] font-medium text-gray-400 mt-1.5 uppercase">Day</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <input
                      ref={monthInputRef}
                      type="text"
                      inputMode="numeric"
                      maxLength={2}
                      value={dobMonth}
                      onChange={(e) => {
                        handleMonthChange(e.target.value);
                        if (errorMsg) setErrorMsg("");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Backspace" && !dobMonth && dayInputRef.current) {
                          dayInputRef.current.focus();
                        }
                      }}
                      placeholder="MM"
                      className="w-20 text-center text-xl font-bold bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl py-4 focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white transition-all"
                    />
                    <span className="text-[11px] font-medium text-gray-400 mt-1.5 uppercase">Month</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <input
                      ref={yearInputRef}
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      value={dobYear}
                      onChange={(e) => {
                        handleYearChange(e.target.value);
                        if (errorMsg) setErrorMsg("");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Backspace" && !dobYear && monthInputRef.current) {
                          monthInputRef.current.focus();
                        } else if (e.key === "Enter") {
                          if (validateDob()) goForward(3);
                        }
                      }}
                      placeholder="YYYY"
                      className="w-28 text-center text-xl font-bold bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl py-4 focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white transition-all"
                    />
                    <span className="text-[11px] font-medium text-gray-400 mt-1.5 uppercase">Year</span>
                  </div>
                </div>

                {errorMsg && (
                  <p className="text-sm text-red-500 font-medium text-center mt-2 animate-fade-in">
                    {errorMsg}
                  </p>
                )}
              </div>

              <div className="pt-6 pb-8">
                <button
                  type="button"
                  onClick={() => {
                    if (validateDob()) {
                      goForward(3);
                    }
                  }}
                  disabled={!dobMonth || !dobDay || !dobYear}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-2xl font-bold text-base shadow-lg shadow-emerald-600/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                >
                  Continue <ArrowRight size={18} />
                </button>
              </div>
            </motion.div>
          )}

          {/* ═══════════════ STEP 3: PHOTOS ═══════════════ */}
          {step === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex-1 flex flex-col justify-between py-6"
            >
              <div>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-violet-50 dark:bg-violet-950/40 rounded-3xl mx-auto flex items-center justify-center mb-4 text-violet-600 dark:text-violet-400 shadow-sm border border-violet-100 dark:border-violet-900/40">
                    <Camera size={30} />
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold mb-2 tracking-tight">
                    Show your best self
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 px-4">
                    Add a photo for your marketplace profile. Clear lighting works best 😊
                  </p>
                </div>

                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoSelect}
                />

                {/* 6-Slot Photo Grid */}
                <div className="grid grid-cols-3 gap-3 mb-3">
                  {[0, 1, 2, 3, 4, 5].map((idx) => {
                    const photoUrl = photos[idx];
                    const isUploading = uploadingSlot === idx;

                    return (
                      <div
                        key={idx}
                        className={clsx(
                          "relative rounded-2xl border-2 border-dashed overflow-hidden transition-all select-none",
                          idx === 0
                            ? "col-span-2 row-span-2 aspect-square"
                            : "aspect-square",
                          photoUrl
                            ? (idx === 0 ? "border-transparent shadow-sm cursor-grab active:cursor-grabbing touch-none" : "border-transparent shadow-sm")
                            : "border-gray-200 dark:border-gray-700 hover:border-emerald-500 bg-gray-50 dark:bg-gray-800/50 cursor-pointer"
                        )}
                        onPointerDown={(e) => {
                          if (idx === 0 && photoUrl) {
                            isDraggingMainRef.current = true;
                            dragStartYRef.current = e.clientY;
                            dragStartPosRef.current = mainPhotoPosY;
                            (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
                          }
                        }}
                        onPointerMove={(e) => {
                          if (idx === 0 && isDraggingMainRef.current) {
                            const deltaY = e.clientY - dragStartYRef.current;
                            const deltaPercent = (deltaY / 220) * -100;
                            const nextPos = Math.max(0, Math.min(100, Math.round(dragStartPosRef.current + deltaPercent)));
                            setMainPhotoPosY(nextPos);
                          }
                        }}
                        onPointerUp={(e) => {
                          if (idx === 0 && isDraggingMainRef.current) {
                            isDraggingMainRef.current = false;
                            try {
                              (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
                            } catch {}
                          }
                        }}
                        onPointerCancel={(e) => {
                          if (idx === 0 && isDraggingMainRef.current) {
                            isDraggingMainRef.current = false;
                            try {
                              (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
                            } catch {}
                          }
                        }}
                        onClick={() => {
                          if (!photoUrl && !isUploading) {
                            setPhotoSlotTarget(idx);
                            fileInputRef.current?.click();
                          }
                        }}
                      >
                        {photoUrl ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={photoUrl}
                              alt={`Profile photo ${idx + 1}`}
                              className="w-full h-full object-cover select-none pointer-events-none"
                              style={idx === 0 ? { objectPosition: `50% ${mainPhotoPosY}%` } : undefined}
                              draggable={false}
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removePhoto(idx);
                              }}
                              aria-label="Remove photo"
                              className="absolute top-2 right-2 w-7 h-7 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white backdrop-blur-sm transition-all z-10"
                            >
                              <X size={14} />
                            </button>
                            {idx === 0 && (
                              <>
                                <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-sm text-white text-[10px] font-semibold rounded-lg flex items-center gap-1 shadow-sm pointer-events-none z-10">
                                  <MoveVertical size={12} className="text-emerald-400" />
                                  <span>Drag to adjust</span>
                                </div>
                                <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-sm text-white text-[10px] font-semibold rounded-md z-10 pointer-events-none">
                                  Main photo
                                </span>
                              </>
                            )}
                          </>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 p-2 text-center">
                            {isUploading ? (
                              <Loader2 className="animate-spin text-emerald-500" size={24} />
                            ) : (
                              <>
                                <Plus size={idx === 0 ? 32 : 22} className="text-gray-400 dark:text-gray-500 mb-1" />
                                <span className="text-[11px] font-medium">
                                  {idx === 0 ? "Add main photo" : "Add photo"}
                                </span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Framing Slider for Main Photo */}
                {photos[0] && (
                  <div className="mb-4 px-3.5 py-2 bg-gray-50 dark:bg-zinc-800/60 rounded-2xl border border-gray-200/80 dark:border-zinc-700/80 flex items-center gap-3 animate-fade-in">
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      <MoveVertical size={13} className="text-emerald-500" />
                      <span>Framing</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={mainPhotoPosY}
                      onChange={(e) => setMainPhotoPosY(Number(e.target.value))}
                      className="w-full accent-emerald-600 h-1.5 bg-gray-200 dark:bg-zinc-700 rounded-lg cursor-pointer"
                      aria-label="Adjust vertical photo position"
                    />
                    <button
                      type="button"
                      onClick={() => setMainPhotoPosY(50)}
                      className="text-[10px] font-bold text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors uppercase tracking-wider"
                    >
                      Center
                    </button>
                  </div>
                )}

                {errorMsg && (
                  <p className="text-sm text-red-500 font-medium text-center mt-2 animate-fade-in">
                    {errorMsg}
                  </p>
                )}
              </div>

              {/* Bottom CTAs */}
              <div className="pt-4 pb-8 space-y-3">
                <button
                  type="button"
                  onClick={handleFinish}
                  disabled={loading}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-base shadow-lg shadow-emerald-600/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      <span>Setting up your account...</span>
                    </>
                  ) : (
                    <>
                      <span>Finish & Start Shopping</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleFinish}
                  disabled={loading}
                  className="w-full py-3 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Skip for now
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
