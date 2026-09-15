"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { auth, db } from "@/lib/firebase";
import { doc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useMockData } from "@/context/MockContext";
import { useAuth } from "@/context/AuthContext";
import { processImageFile } from "@/utils/imageProcessor";
import { clsx } from "clsx";
import { useModalHistory } from "@/hooks/useModalHistory";

import { formatPhoneAsYouType, isValidMobileNumber, toE164 } from "@/lib/phone";
import {
  Search, ChevronDown, ChevronLeft, Check, Loader2, ArrowRight,
  User, Heart, Mail, Camera, MapPin, Plus, X,
  Briefcase, Baby, Cigarette, Wine, Sparkles, Globe
} from "lucide-react";

// ─── COMPREHENSIVE COUNTRY LIST ─────────────────────────────────────────
const COUNTRIES = [
  { name: "Afghanistan", code: "AF", dial: "+93" },
  { name: "Albania", code: "AL", dial: "+355" },
  { name: "Algeria", code: "DZ", dial: "+213" },
  { name: "Andorra", code: "AD", dial: "+376" },
  { name: "Angola", code: "AO", dial: "+244" },
  { name: "Antigua and Barbuda", code: "AG", dial: "+1268" },
  { name: "Argentina", code: "AR", dial: "+54" },
  { name: "Armenia", code: "AM", dial: "+374" },
  { name: "Australia", code: "AU", dial: "+61" },
  { name: "Austria", code: "AT", dial: "+43" },
  { name: "Azerbaijan", code: "AZ", dial: "+994" },
  { name: "Bahamas", code: "BS", dial: "+1242" },
  { name: "Bahrain", code: "BH", dial: "+973" },
  { name: "Bangladesh", code: "BD", dial: "+880" },
  { name: "Barbados", code: "BB", dial: "+1246" },
  { name: "Belarus", code: "BY", dial: "+375" },
  { name: "Belgium", code: "BE", dial: "+32" },
  { name: "Belize", code: "BZ", dial: "+501" },
  { name: "Benin", code: "BJ", dial: "+229" },
  { name: "Bhutan", code: "BT", dial: "+975" },
  { name: "Bolivia", code: "BO", dial: "+591" },
  { name: "Bosnia and Herzegovina", code: "BA", dial: "+387" },
  { name: "Botswana", code: "BW", dial: "+267" },
  { name: "Brazil", code: "BR", dial: "+55" },
  { name: "Brunei", code: "BN", dial: "+673" },
  { name: "Bulgaria", code: "BG", dial: "+359" },
  { name: "Burkina Faso", code: "BF", dial: "+226" },
  { name: "Burundi", code: "BI", dial: "+257" },
  { name: "Cabo Verde", code: "CV", dial: "+238" },
  { name: "Cambodia", code: "KH", dial: "+855" },
  { name: "Cameroon", code: "CM", dial: "+237" },
  { name: "Canada", code: "CA", dial: "+1" },
  { name: "Central African Republic", code: "CF", dial: "+236" },
  { name: "Chad", code: "TD", dial: "+235" },
  { name: "Chile", code: "CL", dial: "+56" },
  { name: "China", code: "CN", dial: "+86" },
  { name: "Colombia", code: "CO", dial: "+57" },
  { name: "Comoros", code: "KM", dial: "+269" },
  { name: "Congo (DRC)", code: "CD", dial: "+243" },
  { name: "Congo (Republic)", code: "CG", dial: "+242" },
  { name: "Costa Rica", code: "CR", dial: "+506" },
  { name: "Croatia", code: "HR", dial: "+385" },
  { name: "Cuba", code: "CU", dial: "+53" },
  { name: "Cyprus", code: "CY", dial: "+357" },
  { name: "Czech Republic", code: "CZ", dial: "+420" },
  { name: "Denmark", code: "DK", dial: "+45" },
  { name: "Djibouti", code: "DJ", dial: "+253" },
  { name: "Dominica", code: "DM", dial: "+1767" },
  { name: "Dominican Republic", code: "DO", dial: "+1809" },
  { name: "Ecuador", code: "EC", dial: "+593" },
  { name: "Egypt", code: "EG", dial: "+20" },
  { name: "El Salvador", code: "SV", dial: "+503" },
  { name: "Equatorial Guinea", code: "GQ", dial: "+240" },
  { name: "Eritrea", code: "ER", dial: "+291" },
  { name: "Estonia", code: "EE", dial: "+372" },
  { name: "Eswatini", code: "SZ", dial: "+268" },
  { name: "Ethiopia", code: "ET", dial: "+251" },
  { name: "Fiji", code: "FJ", dial: "+679" },
  { name: "Finland", code: "FI", dial: "+358" },
  { name: "France", code: "FR", dial: "+33" },
  { name: "Gabon", code: "GA", dial: "+241" },
  { name: "Gambia", code: "GM", dial: "+220" },
  { name: "Georgia", code: "GE", dial: "+995" },
  { name: "Germany", code: "DE", dial: "+49" },
  { name: "Ghana", code: "GH", dial: "+233" },
  { name: "Greece", code: "GR", dial: "+30" },
  { name: "Grenada", code: "GD", dial: "+1473" },
  { name: "Guatemala", code: "GT", dial: "+502" },
  { name: "Guinea", code: "GN", dial: "+224" },
  { name: "Guinea-Bissau", code: "GW", dial: "+245" },
  { name: "Guyana", code: "GY", dial: "+592" },
  { name: "Haiti", code: "HT", dial: "+509" },
  { name: "Honduras", code: "HN", dial: "+504" },
  { name: "Hong Kong", code: "HK", dial: "+852" },
  { name: "Hungary", code: "HU", dial: "+36" },
  { name: "Iceland", code: "IS", dial: "+354" },
  { name: "India", code: "IN", dial: "+91" },
  { name: "Indonesia", code: "ID", dial: "+62" },
  { name: "Iran", code: "IR", dial: "+98" },
  { name: "Iraq", code: "IQ", dial: "+964" },
  { name: "Ireland", code: "IE", dial: "+353" },
  { name: "Israel", code: "IL", dial: "+972" },
  { name: "Italy", code: "IT", dial: "+39" },
  { name: "Ivory Coast", code: "CI", dial: "+225" },
  { name: "Jamaica", code: "JM", dial: "+1876" },
  { name: "Japan", code: "JP", dial: "+81" },
  { name: "Jordan", code: "JO", dial: "+962" },
  { name: "Kazakhstan", code: "KZ", dial: "+7" },
  { name: "Kenya", code: "KE", dial: "+254" },
  { name: "Kiribati", code: "KI", dial: "+686" },
  { name: "Kosovo", code: "XK", dial: "+383" },
  { name: "Kuwait", code: "KW", dial: "+965" },
  { name: "Kyrgyzstan", code: "KG", dial: "+996" },
  { name: "Laos", code: "LA", dial: "+856" },
  { name: "Latvia", code: "LV", dial: "+371" },
  { name: "Lebanon", code: "LB", dial: "+961" },
  { name: "Lesotho", code: "LS", dial: "+266" },
  { name: "Liberia", code: "LR", dial: "+231" },
  { name: "Libya", code: "LY", dial: "+218" },
  { name: "Liechtenstein", code: "LI", dial: "+423" },
  { name: "Lithuania", code: "LT", dial: "+370" },
  { name: "Luxembourg", code: "LU", dial: "+352" },
  { name: "Macao", code: "MO", dial: "+853" },
  { name: "Madagascar", code: "MG", dial: "+261" },
  { name: "Malawi", code: "MW", dial: "+265" },
  { name: "Malaysia", code: "MY", dial: "+60" },
  { name: "Maldives", code: "MV", dial: "+960" },
  { name: "Mali", code: "ML", dial: "+223" },
  { name: "Malta", code: "MT", dial: "+356" },
  { name: "Marshall Islands", code: "MH", dial: "+692" },
  { name: "Mauritania", code: "MR", dial: "+222" },
  { name: "Mauritius", code: "MU", dial: "+230" },
  { name: "Mexico", code: "MX", dial: "+52" },
  { name: "Micronesia", code: "FM", dial: "+691" },
  { name: "Moldova", code: "MD", dial: "+373" },
  { name: "Monaco", code: "MC", dial: "+377" },
  { name: "Mongolia", code: "MN", dial: "+976" },
  { name: "Montenegro", code: "ME", dial: "+382" },
  { name: "Morocco", code: "MA", dial: "+212" },
  { name: "Mozambique", code: "MZ", dial: "+258" },
  { name: "Myanmar", code: "MM", dial: "+95" },
  { name: "Namibia", code: "NA", dial: "+264" },
  { name: "Nauru", code: "NR", dial: "+674" },
  { name: "Nepal", code: "NP", dial: "+977" },
  { name: "Netherlands", code: "NL", dial: "+31" },
  { name: "New Zealand", code: "NZ", dial: "+64" },
  { name: "Nicaragua", code: "NI", dial: "+505" },
  { name: "Niger", code: "NE", dial: "+227" },
  { name: "Nigeria", code: "NG", dial: "+234" },
  { name: "North Korea", code: "KP", dial: "+850" },
  { name: "North Macedonia", code: "MK", dial: "+389" },
  { name: "Norway", code: "NO", dial: "+47" },
  { name: "Oman", code: "OM", dial: "+968" },
  { name: "Pakistan", code: "PK", dial: "+92" },
  { name: "Palau", code: "PW", dial: "+680" },
  { name: "Palestine", code: "PS", dial: "+970" },
  { name: "Panama", code: "PA", dial: "+507" },
  { name: "Papua New Guinea", code: "PG", dial: "+675" },
  { name: "Paraguay", code: "PY", dial: "+595" },
  { name: "Peru", code: "PE", dial: "+51" },
  { name: "Philippines", code: "PH", dial: "+63" },
  { name: "Poland", code: "PL", dial: "+48" },
  { name: "Portugal", code: "PT", dial: "+351" },
  { name: "Qatar", code: "QA", dial: "+974" },
  { name: "Romania", code: "RO", dial: "+40" },
  { name: "Russia", code: "RU", dial: "+7" },
  { name: "Rwanda", code: "RW", dial: "+250" },
  { name: "Saint Kitts and Nevis", code: "KN", dial: "+1869" },
  { name: "Saint Lucia", code: "LC", dial: "+1758" },
  { name: "Saint Vincent", code: "VC", dial: "+1784" },
  { name: "Samoa", code: "WS", dial: "+685" },
  { name: "San Marino", code: "SM", dial: "+378" },
  { name: "São Tomé and Príncipe", code: "ST", dial: "+239" },
  { name: "Saudi Arabia", code: "SA", dial: "+966" },
  { name: "Senegal", code: "SN", dial: "+221" },
  { name: "Serbia", code: "RS", dial: "+381" },
  { name: "Seychelles", code: "SC", dial: "+248" },
  { name: "Sierra Leone", code: "SL", dial: "+232" },
  { name: "Singapore", code: "SG", dial: "+65" },
  { name: "Slovakia", code: "SK", dial: "+421" },
  { name: "Slovenia", code: "SI", dial: "+386" },
  { name: "Solomon Islands", code: "SB", dial: "+677" },
  { name: "Somalia", code: "SO", dial: "+252" },
  { name: "South Africa", code: "ZA", dial: "+27" },
  { name: "South Korea", code: "KR", dial: "+82" },
  { name: "South Sudan", code: "SS", dial: "+211" },
  { name: "Spain", code: "ES", dial: "+34" },
  { name: "Sri Lanka", code: "LK", dial: "+94" },
  { name: "Sudan", code: "SD", dial: "+249" },
  { name: "Suriname", code: "SR", dial: "+597" },
  { name: "Sweden", code: "SE", dial: "+46" },
  { name: "Switzerland", code: "CH", dial: "+41" },
  { name: "Syria", code: "SY", dial: "+963" },
  { name: "Taiwan", code: "TW", dial: "+886" },
  { name: "Tajikistan", code: "TJ", dial: "+992" },
  { name: "Tanzania", code: "TZ", dial: "+255" },
  { name: "Thailand", code: "TH", dial: "+66" },
  { name: "Timor-Leste", code: "TL", dial: "+670" },
  { name: "Togo", code: "TG", dial: "+228" },
  { name: "Tonga", code: "TO", dial: "+676" },
  { name: "Trinidad and Tobago", code: "TT", dial: "+1868" },
  { name: "Tunisia", code: "TN", dial: "+216" },
  { name: "Turkey", code: "TR", dial: "+90" },
  { name: "Turkmenistan", code: "TM", dial: "+993" },
  { name: "Tuvalu", code: "TV", dial: "+688" },
  { name: "Uganda", code: "UG", dial: "+256" },
  { name: "Ukraine", code: "UA", dial: "+380" },
  { name: "United Arab Emirates", code: "AE", dial: "+971" },
  { name: "United Kingdom", code: "GB", dial: "+44" },
  { name: "United States", code: "US", dial: "+1" },
  { name: "Uruguay", code: "UY", dial: "+598" },
  { name: "Uzbekistan", code: "UZ", dial: "+998" },
  { name: "Vanuatu", code: "VU", dial: "+678" },
  { name: "Vatican City", code: "VA", dial: "+379" },
  { name: "Venezuela", code: "VE", dial: "+58" },
  { name: "Vietnam", code: "VN", dial: "+84" },
  { name: "Yemen", code: "YE", dial: "+967" },
  { name: "Zambia", code: "ZM", dial: "+260" },
  { name: "Zimbabwe", code: "ZW", dial: "+263" },
];

// ─── CONSTANTS ──────────────────────────────────────────────────────────
const RELATIONSHIP_GOALS = [
  { emoji: "💍", label: "Love that leads to Forever", sub: "Long-term relationship" },
  { emoji: "💒", label: "Wife/Hubby me now", sub: "Marriage-minded" },
  { emoji: "🌊", label: "See where things go", sub: "Casual dating / Open" },
  { emoji: "🤝", label: "New friends & connections", sub: "Platonic / Social" },
];

const EDUCATION_OPTIONS = ["High School", "Associate's", "Bachelor's", "Master's", "Doctorate", "Trade School", "Self-taught", "Prefer not to say"];

const KIDS_OPTIONS = ["Have kids", "Don't have kids", "Want kids someday", "Open to kids", "Not looking for kids"];
const SMOKING_OPTIONS = ["Non-smoker", "Occasional smoker", "Heavy smoker", "Trying to quit"];
const DRINKING_OPTIONS = ["Social drinker", "Frequent", "Never", "Sobriety journey"];

const HOBBIES = [
  "Tech / Coding", "Music Production", "Fitness / Gym", "Fashion", "Travel",
  "Foodie", "Gaming", "Photography", "Hiking", "Coffee",
  "Art", "Design", "Cooking", "Reading", "Dancing",
  "Yoga", "Sports", "Movies", "Volunteering", "Pets",
];

const TRANSLATIONS = {
  "English": {
    welcome: "Hey Yoghearts, welcome to the batch.",
    agreeText: "By signing up, you agree to Yogheart's ",
    and: " and ",
    privacy: "Privacy Policies",
    terms: "Terms of Service",
    period: ".",
    infoText: "We use your information to create your account, deliver our services, and help keep Yogheart safe and secure. In settings, you can access, manage, and delete your account information. ",
    learnMore: "Learn more",
    agreeBtn: "Agree and continue",
  },
  "Français": {
    welcome: "Bienvenue sur Yogheart",
    agreeText: "En vous inscrivant, vous acceptez la ",
    and: " et les ",
    privacy: "Politique de confidentialité",
    terms: "Conditions d'utilisation",
    period: " de Yogheart.",
    infoText: "Nous utilisons vos informations pour créer votre compte, fournir nos services et assurer la sécurité de Yogheart. Dans les paramètres, vous pouvez accéder, gérer et supprimer vos informations. ",
    learnMore: "En savoir plus",
    agreeBtn: "Accepter et continuer",
  }
};

export default function OnboardingPage() {
  const router = useRouter();
  const { postMood, uploadImageToStorage } = useMockData();
  const { user, userData, loading: authLoading } = useAuth();
  const localOnboardingComplete = typeof window !== "undefined" && localStorage.getItem("mesh_onboarding_complete") === "true";
  const hasPhone = !!(userData?.phoneNumber || user?.phoneNumber);
  const isAlreadyOnboarded = !!user && hasPhone && (!!userData?.onboardingComplete || userData?.isAdmin || localOnboardingComplete);

  const [step, setStep] = useState(2);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState<"forward" | "back">("forward");

  // Step 1 & 2 — Welcome and Phone
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES.find(c => c.code === "US")!);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const [showCountrySheet, setShowCountrySheet] = useState(false);
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [phoneFocused, setPhoneFocused] = useState(false);
  
  // Accessibility states
  const [accessibilityOpen, setAccessibilityOpen] = useState(false);
  const [largeFont, setLargeFont] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  
  // Help/Terms Modals state
  const [activeModal, setActiveModal] = useState<"help" | "terms" | "privacy" | null>(null);

  // Swipe-to-dismiss states for Country Sheet
  const [popupDragY, setPopupDragY] = useState(0);
  const [isPopupDragging, setIsPopupDragging] = useState(false);
  const popupDragStartY = useRef(0);

  const handlePopupTouchStart = (e: React.TouchEvent) => {
    popupDragStartY.current = e.touches[0].clientY;
    setIsPopupDragging(true);
  };
  const handlePopupTouchMove = (e: React.TouchEvent) => {
    if (!isPopupDragging) return;
    const deltaY = e.touches[0].clientY - popupDragStartY.current;
    if (deltaY > 0) setPopupDragY(deltaY);
  };
  const handlePopupTouchEnd = (closeModalFn: () => void) => {
    setIsPopupDragging(false);
    if (popupDragY > 120) {
      closeModalFn();
    }
    setPopupDragY(0);
  };

  // Step 5 — Name
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const isInitialized = useRef(false);

  useEffect(() => {
    if (user && !email) {
      setEmail(user.email || "");
    }
  }, [user, email]);

  // Step 6 — DOB
  const [dobMonth, setDobMonth] = useState("");
  const [dobDay, setDobDay] = useState("");
  const [dobYear, setDobYear] = useState("");

  // Step 7 — Gender
  const [gender, setGender] = useState("");
  const [showGender, setShowGender] = useState(true);

  // Step 8 — Show me
  const [showMe, setShowMe] = useState("");

  // Step 9 — Relationship goal
  const [relationshipGoal, setRelationshipGoal] = useState("");

  // Step 10 — Work & Education
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [education, setEducation] = useState("");

  // Step 11 — Lifestyle
  const [kids, setKids] = useState("");
  const [smoking, setSmoking] = useState("");
  const [drinking, setDrinking] = useState("");

  // Step 12 — Hobbies & Interests
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  // Step 13 — Photos
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoSlotTarget, setPhotoSlotTarget] = useState(0);

  // DOB input refs
  const dayInputRef = useRef<HTMLInputElement>(null);
  const monthInputRef = useRef<HTMLInputElement>(null);
  const yearInputRef = useRef<HTMLInputElement>(null);

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

  // Step 14 — Location & Discovery
  const [locationText, setLocationText] = useState("");
  const [radiusPref, setRadiusPref] = useState<"Local" | "Global">("Local");

  useModalHistory("countrySheet", showCountrySheet, () => setShowCountrySheet(false));


  // Global
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");



  // ─── Pre-fill from existing data ────────────────────────────────────
  useEffect(() => {
    if (user && userData && !isInitialized.current) {
      isInitialized.current = true;
      if (userData.name) setName(userData.name === "User" ? "" : userData.name);
      if (userData.interests?.length) setSelectedInterests(userData.interests);
      
      if (userData.dob) {
        const parts = userData.dob.split("-");
        if (parts.length === 3) {
          setDobYear(parts[0]);
          setDobMonth(parts[1]);
          setDobDay(parts[2]);
        }
      } else if (userData.age && userData.age !== 24) {
        // Only reverse-derive from age if it's a non-default custom age
        const y = new Date().getFullYear() - userData.age;
        setDobYear(y.toString());
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userData]);

  // Lock body scroll and disable pull-to-refresh when Country Sheet is open
  useEffect(() => {
    if (showCountrySheet) {
      document.body.style.overflow = "hidden";
      document.body.style.overscrollBehaviorY = "none";
    } else {
      document.body.style.overflow = "";
      document.body.style.overscrollBehaviorY = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.overscrollBehaviorY = "";
    };
  }, [showCountrySheet]);

  // Window touchmove interceptor when dragging
  useEffect(() => {
    if (isPopupDragging) {
      const handleTouchMove = (e: TouchEvent) => {
        if (e.cancelable) e.preventDefault();
      };
      window.addEventListener("touchmove", handleTouchMove, { passive: false });
      return () => {
        window.removeEventListener("touchmove", handleTouchMove);
      };
    }
  }, [isPopupDragging]);



  // Auth redirect / start step logic — only jump when not mid-animation
  // (prevents cutting short the smooth OTP → Name transition)
  useEffect(() => {
    const hasPhone = !!(userData?.phoneNumber || user?.phoneNumber);
    const isGoogleUser = !!(user && user.email);
    const targetStartStep = user ? (isGoogleUser ? 5 : (hasPhone ? 4 : 2)) : 2;
    if (!authLoading && user && !isAlreadyOnboarded && step < targetStartStep && !isAnimating) {
      setStep(targetStartStep);
    }
  }, [user, authLoading, userData, isAlreadyOnboarded, step, isAnimating]);

  // ─── STEP TRANSITIONS ───────────────────────────────────────────────
  const goForward = (target?: number) => {
    setDirection("forward");
    setIsAnimating(true);
    setErrorMsg("");
    setTimeout(() => {
      setStep(target ?? step + 1);
      setIsAnimating(false);
    }, 200);
  };

  const goBack = async (e?: React.MouseEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    const hasPhone = !!(userData?.phoneNumber || user?.phoneNumber);
    const isGoogleUser = !!(user && user.email);
    const targetStartStep = user ? (isGoogleUser ? 5 : (hasPhone ? 4 : 2)) : 1;
    if (step <= targetStartStep || step === 2) {
        if (typeof window !== "undefined") {
            localStorage.setItem("mesh_signing_out", "true");
        }
        if (auth.currentUser) {
            await auth.signOut();
        }
        window.location.href = "/login";
        return;
    }
    setDirection("back");
    setIsAnimating(true);
    setErrorMsg("");
    setTimeout(() => {
      setStep(step - 1);
      setIsAnimating(false);
    }, 200);
  };


  const handleNextPhone = () => {
    const fullPhone = `${selectedCountry.dial}${phoneNumber.replace(/\D/g, "")}`;
    if (!isValidMobileNumber(fullPhone, selectedCountry.code)) {
      setErrorMsg("Please enter a valid mobile phone number");
      return;
    }
    setErrorMsg("");
    goForward(4);
  };


  const handleNextEmail = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setErrorMsg("Please enter your email address");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setErrorMsg("Please enter a valid email address");
      return;
    }
    setLoading(true);
    try {
      const normalizedEmail = trimmed.toLowerCase();
      const q = query(collection(db, "users"), where("email_lowercase", "==", normalizedEmail));
      const querySnapshot = await getDocs(q);
      
      let isUsedByOther = false;
      querySnapshot.forEach((docSnap) => {
         if (!auth.currentUser || docSnap.id !== auth.currentUser.uid) {
             isUsedByOther = true;
         }
      });
      
      if (isUsedByOther) {
        setErrorMsg("This email is already in use. Please sign in or use a different email.");
        setLoading(false);
        return;
      }
      
      setErrorMsg("");
      goForward();
    } catch (err) {
      console.error("Email check error:", err);
      setErrorMsg("Error verifying email. Please try again.");
    }
    setLoading(false);
  };



  // ─── DOB VALIDATION ─────────────────────────────────────────
  const getAgeFromDob = (): number | null => {
    const m = parseInt(dobMonth);
    const d = parseInt(dobDay);
    const y = parseInt(dobYear);
    if (!m || !d || !y || m < 1 || m > 12 || d < 1 || d > 31 || y < 1900) return null;
    const dob = new Date(y, m - 1, d);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age--;
    return age;
  };

  const validateDob = () => {
    const age = getAgeFromDob();
    if (age === null) { setErrorMsg("Please enter a valid date of birth."); return false; }
    if (age < 18) { setErrorMsg("You must be 18 or older to join Yogheart."); return false; }
    if (age > 120) { setErrorMsg("Please enter a valid date of birth."); return false; }
    return true;
  };

  // ─── STEP 12: PHOTO UPLOAD ──────────────────────────────────────────
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const { dataUrl } = await processImageFile(file);
      const uid = user?.uid;
      if (uid) {
        const downloadUrl = await uploadImageToStorage(dataUrl, `photos/${uid}/photo_${photoSlotTarget}_${Date.now()}`);
        setPhotos(prev => {
          const updated = [...prev];
          updated[photoSlotTarget] = downloadUrl;
          return updated;
        });
      }
      setUploadingPhoto(false);
    } catch {
      setUploadingPhoto(false);
      setErrorMsg("Photo upload failed. Try again.");
    }
    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const getCountryCodeFromPhone = (phone?: string): string => {
    if (!phone) return "US";
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.startsWith("250")) return "RW";
    if (cleaned.startsWith("1")) return "US"; // Default for +1, will refine to CA if user selected Canada in dropdown
    for (const c of COUNTRIES) {
      const dialNoPlus = c.dial.replace("+", "");
      if (cleaned.startsWith(dialNoPlus)) {
        return c.code;
      }
    }
    return "US";
  };

  // ─── FINAL SUBMIT ──────────────────────────────────────────────────
  const handleFinish = async () => {
    setLoading(true);
    try {
      const uid = user?.uid;
      const age = getAgeFromDob() || 18;
      const dobString = `${dobYear}-${dobMonth.padStart(2, "0")}-${dobDay.padStart(2, "0")}`;

      const validPhotos = photos.filter(Boolean);
      const mainAvatar = validPhotos[0] || null;

      if (uid) {
        await updateDoc(doc(db, "users", uid), {
          name,
          email: email.trim() || user?.email || userData?.email || null,
          email_lowercase: (email.trim() || user?.email || userData?.email || "").toLowerCase() || null,
          phoneNumber: userData?.phoneNumber || user?.phoneNumber || toE164(`${selectedCountry.dial}${phoneNumber.replace(/\D/g, "")}`, selectedCountry.code) || "",
          age,
          dob: dobString,
          bio: userData?.bio || "Hey there! I'm using Yogheart.",
          gender,
          showGender,
          showMe,
          relationshipGoal,
          jobTitle: jobTitle || null,
          company: company || null,
          education: education || null,
          kids: kids || null,
          smoking: smoking || null,
          drinking: drinking || null,
          interests: selectedInterests,
          photos: validPhotos,
          avatar: mainAvatar,
          onboardingComplete: true,
          location: locationText || "",
          radiusPreference: radiusPref,
          countryCode: selectedCountry?.code || getCountryCodeFromPhone(userData?.phoneNumber || user?.phoneNumber || phoneNumber) || "US",
          latitude: null,
          longitude: null,
        });
      }

      // Post non-avatar photos as moods
      const extraPhotos = validPhotos.slice(1); // photos[1] and photos[2]
      for (const photoUrl of extraPhotos) {
        try {
          await postMood("photo", photoUrl, "", true);
        } catch (err) {
          console.error("Failed to post mood from onboarding photo:", err);
        }
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("mesh_onboarding_complete", "true");
      }
      setTimeout(() => {
        setLoading(false);
        router.push("/");
      }, 500);
    } catch (err) {
      console.error(err);
      if (typeof window !== "undefined") {
        localStorage.setItem("mesh_onboarding_complete", "true");
      }
      setLoading(false);
      window.location.href = "/";
    }
  };

  // ─── HELPERS ────────────────────────────────────────────────────────
  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  };

  const filteredCountries = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    c.dial.includes(countrySearch)
  );

  const isGoogleUser = !!(user && user.email);
  const startStep = user ? (isGoogleUser ? 5 : (hasPhone ? 4 : 2)) : 1;
  const t = TRANSLATIONS[selectedLanguage as keyof typeof TRANSLATIONS] || TRANSLATIONS["English"];


  const isJumpingToTarget = !authLoading && user && !isAlreadyOnboarded && step < startStep && !isAnimating;

  if (authLoading || isJumpingToTarget || isAlreadyOnboarded) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-white dark:bg-gray-900">
        <Loader2 className="animate-spin text-emerald-600" size={32} />
      </div>
    );
  }

  // ─── RENDER ─────────────────────────────────────────────────────────
  return (
    <div className={clsx(
      "min-h-screen w-full flex flex-col bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-sans relative select-none animate-[onboardingEntrance_0.7s_cubic-bezier(0.16,1,0.3,1)_forwards]",
      largeFont && "app-large-font",
      highContrast && "app-high-contrast"
    )}>
      <style>{`
        @keyframes onboardingEntrance {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes caretBlink {
          50% { opacity: 0; }
        }



        /* Vector Illustration styles */
        .illustration-container {
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 24px auto;
            width: 100%;
            max-width: 180px;
        }
        .illustration-svg {
            width: 150px;
            height: 150px;
            display: block;
        }

        /* Title Typography */
        .title-welcome {
            font-size: 24px;
            font-weight: 500;
            color: #111b21;
            text-align: center;
            margin: 4px 0 10px 0;
        }
        .dark .title-welcome {
            color: #ffffff;
        }

        .title-phone {
            font-size: 20px;
            font-weight: 500;
            color: #111b21;
            text-align: center;
            margin: 4px 0 12px 0;
        }
        .dark .title-phone {
            color: #ffffff;
        }

        .disclaimer-text {
            font-size: 13px;
            color: #667781;
            text-align: center;
            line-height: 1.52;
            margin: 0 0 12px 0;
            padding: 0 4px;
        }
        .disclaimer-text a {
            color: var(--primary);
            text-decoration: none;
            font-weight: 500;
        }
        .disclaimer-text a:hover {
            text-decoration: underline;
        }

        .sub-info-text {
            font-size: 13px;
            color: #667781;
            text-align: center;
            line-height: 1.52;
            margin-bottom: 20px;
            padding: 0 4px;
        }
        .sub-info-text a {
            color: var(--primary);
            text-decoration: none;
            font-weight: 500;
        }
        .sub-info-text a:hover {
            text-decoration: underline;
        }

        /* Unified Premium Input Card */
        .premium-input-card {
            display: flex;
            align-items: center;
            width: 300px;
            background: #f2f2f7;
            border: 1px solid #e5e5ea;
            border-radius: 12px;
            padding: 4px 12px;
            box-sizing: border-box;
            transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
            margin: 0 auto;
        }
        .premium-input-card.focused {
            border-color: var(--primary);
            box-shadow: 0 0 0 4px rgba(0, 122, 255, 0.15);
            background: #ffffff;
        }
        .dark .premium-input-card {
            background: #202124;
            border-color: #2a3942;
        }
        .dark .premium-input-card.focused {
            border-color: var(--primary);
            box-shadow: 0 0 0 4px rgba(0, 122, 255, 0.2);
            background: #111b21;
        }

        .premium-country-select {
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            user-select: none;
            padding: 8px 0;
            transition: opacity 0.2s;
        }
        .premium-country-select:hover {
            opacity: 0.75;
        }
        .premium-flag-wrapper {
            width: 24px;
            height: 18px;
            border-radius: 4px;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
            border: 1px solid rgba(0, 0, 0, 0.06);
            background: #ffffff;
            position: relative;
        }
        .premium-flag-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .premium-dial-code {
            font-size: 15px;
            font-weight: 600;
            color: #1c1c1e;
        }
        .dark .premium-dial-code {
            color: #ffffff;
        }
        .premium-chevron {
            display: flex;
            align-items: center;
            color: #8e8e93;
            transition: transform 0.2s ease;
        }
        .premium-chevron.open {
            transform: rotate(180deg);
        }

        .premium-divider {
            width: 1px;
            height: 20px;
            background: #d1d1d6;
            margin: 0 12px;
        }
        .dark .premium-divider {
            background: #2a3942;
        }

        .premium-phone-field {
            flex: 1;
            display: flex;
        }
        .premium-phone-input {
            width: 100%;
            border: none;
            background: transparent;
            font-size: 16px;
            font-weight: 500;
            color: #1c1c1e;
            outline: none;
            padding: 8px 0;
        }
        .premium-phone-input::placeholder {
            color: #aeaeb2;
        }
        .dark .premium-phone-input {
            color: #ffffff;
        }

        /* Premium Country Dropdown Popup */
        .premium-dropdown-popup {
            position: absolute;
            top: 54px;
            left: 50%;
            transform: translateX(-50%);
            width: 300px;
            background: rgba(255, 255, 255, 0.94);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border-radius: 16px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.4);
            z-index: 110;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            animation: premiumDropdownFade 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes premiumDropdownFade {
            from { transform: translate(-50%, -12px); opacity: 0; }
            to { transform: translate(-50%, 0); opacity: 1; }
        }
        .dark .premium-dropdown-popup {
            background: rgba(17, 27, 33, 0.96);
            border-color: rgba(255, 255, 255, 0.12);
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
        }

        .premium-search-container {
            display: flex;
            align-items: center;
            padding: 10px 12px;
            border-bottom: 1px solid rgba(0, 0, 0, 0.05);
            background: rgba(0, 0, 0, 0.02);
            gap: 8px;
            position: relative;
        }
        .dark .premium-search-container {
            border-bottom-color: rgba(255, 255, 255, 0.08);
            background: rgba(255, 255, 255, 0.02);
        }
        .premium-search-icon {
            color: #8e8e93;
            flex-shrink: 0;
        }
        .premium-search-input {
            flex: 1;
            border: none;
            background: transparent;
            outline: none;
            font-size: 14.5px;
            color: #1c1c1e;
            padding: 2px 0;
        }
        .dark .premium-search-input {
            color: #ffffff;
        }
        .premium-search-clear {
            background: #aeaeb2;
            color: #ffffff;
            border: none;
            border-radius: 50%;
            width: 16px;
            height: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 9px;
            cursor: pointer;
            padding: 0;
            transition: background 0.15s;
        }
        .premium-search-clear:hover {
            background: #8e8e93;
        }

        .premium-country-list {
            max-height: 200px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            -webkit-overflow-scrolling: touch;
        }
        .premium-country-list::-webkit-scrollbar {
            width: 6px;
        }
        .premium-country-list::-webkit-scrollbar-track {
            background: transparent;
        }
        .premium-country-list::-webkit-scrollbar-thumb {
            background: rgba(0, 0, 0, 0.15);
            border-radius: 3px;
        }
        .premium-country-list::-webkit-scrollbar-thumb:hover {
            background: rgba(0, 0, 0, 0.25);
        }
        .dark .premium-country-list::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.15);
        }

        .premium-country-item {
            display: flex;
            align-items: center;
            padding: 10px 12px;
            cursor: pointer;
            transition: background 0.15s;
            user-select: none;
            gap: 10px;
            color: #1c1c1e;
        }
        .dark .premium-country-item {
            color: #ffffff;
        }
        .premium-country-item:hover {
            background: rgba(0, 0, 0, 0.04);
        }
        .dark .premium-country-item:hover {
            background: rgba(255, 255, 255, 0.06);
        }
        .premium-country-item.selected {
            background: rgba(0, 122, 255, 0.08);
            color: var(--primary);
            font-weight: 600;
        }
        .dark .premium-country-item.selected {
            background: rgba(0, 122, 255, 0.15);
            color: var(--primary);
        }

        .premium-item-flag-wrapper {
            width: 20px;
            height: 15px;
            border-radius: 2.5px;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
            border: 1px solid rgba(0, 0, 0, 0.06);
            background: #ffffff;
            flex-shrink: 0;
        }
        .premium-item-flag {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .premium-item-name {
            flex: 1;
            font-size: 14px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            text-align: left;
        }
        .premium-item-dial {
            font-size: 13px;
            color: #8e8e93;
            font-weight: 500;
        }
        .premium-country-item.selected .premium-item-dial {
            color: inherit;
        }
        .premium-item-checkmark {
            color: var(--primary);
            display: flex;
            align-items: center;
            flex-shrink: 0;
        }

        .premium-no-results {
            padding: 24px 16px;
            font-size: 13.5px;
            color: #8e8e93;
            text-align: center;
        }

        .dropdown-backdrop {
            position: absolute;
            inset: 0;
            z-index: 90;
            background: transparent;
        }



        /* Action Capsule Button */
        .action-row {
            margin-top: auto;
            display: flex;
            justify-content: center;
            padding-bottom: 4px;
        }
        .capsule-btn {
            width: 280px;
            height: 42px;
            border: none;
            border-radius: 21px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            transition: all 0.2s ease;
        }
        .capsule-btn.blue {
            background: var(--primary);
            color: #ffffff;
        }
        .capsule-btn.blue:hover:not(:disabled) {
            filter: brightness(0.9);
        }
        .capsule-btn.grey {
            background: #e9edef;
            color: #8696a0;
            cursor: not-allowed;
        }
        .dark .capsule-btn.grey {
            background: #2d3748;
            color: #718096;
        }

        /* Floating Accessibility icon button */
        .access-icon-container {
            display: flex;
            justify-content: flex-end;
            padding-right: 4px;
            margin-top: 2px;
        }
        .access-icon-btn {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: #ffffff;
            border: 1px solid #e1e3e6;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 2px 5px rgba(0,0,0,0.05);
        }
        .access-icon-btn:hover {
            background: #f7f8fa;
            transform: scale(1.05);
        }
        .access-icon-btn.active {
            border-color: var(--primary);
            background: rgba(0, 122, 255, 0.05);
        }
        .dark .access-icon-btn {
            background: #111b21;
            border-color: #2a3942;
        }

        /* Accessibility Modal overlay */
        .accessibility-modal {
            position: absolute;
            top: 42px;
            right: 0;
            background: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 24px rgba(11, 20, 26, 0.15);
            border: 1px solid #e9edef;
            padding: 16px;
            z-index: 100;
            width: 240px;
            display: flex;
            flex-direction: column;
            gap: 12px;
            animation: modalFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .dark .accessibility-modal {
            background: #111b21;
            border-color: #2a3942;
            box-shadow: 0 4px 24px rgba(0,0,0,0.5);
        }
        .accessibility-title {
            font-size: 13px;
            font-weight: 700;
            color: #8696a0;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            margin-bottom: 4px;
            text-align: left;
        }
        .accessibility-option {
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            user-select: none;
            padding: 4px 0;
        }
        .accessibility-checkbox {
            width: 18px;
            height: 18px;
            accent-color: var(--primary);
            cursor: pointer;
        }
        .accessibility-divider {
            height: 1px;
            background: #e9edef;
            margin: 4px 0;
        }
        .dark .accessibility-divider {
            background: #2a3942;
        }
        .accessibility-link-option {
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 14px;
            font-weight: 500;
            color: #1c1c1e;
            cursor: pointer;
            padding: 4px 0;
            background: none;
            border: none;
            width: 100%;
            text-align: left;
            transition: opacity 0.15s;
        }
        .dark .accessibility-link-option {
            color: #ffffff;
        }
        .accessibility-link-option:hover {
            opacity: 0.7;
        }

        /* Info Modals Styling (Help, Terms, Privacy) */
        .info-modal-overlay {
            position: absolute;
            inset: 0;
            background: transparent;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 120;
            padding: 24px;
        }
        .info-modal-content {
            background: #ffffff;
            border-radius: 24px;
            width: 100%;
            max-width: 500px;
            padding: 28px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
            display: flex;
            flex-direction: column;
            gap: 16px;
            animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .dark .info-modal-content {
            background: #111b21;
            border: 1px solid #2a3942;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
        }
        .info-modal-title {
            font-size: 20px;
            font-weight: 700;
            color: #111b21;
            margin: 0;
            text-align: left;
        }
        .dark .info-modal-title {
            color: #ffffff;
        }
        .info-modal-body {
            font-size: 14.5px;
            color: #54656f;
            line-height: 1.6;
            max-height: 350px;
            overflow-y: auto;
            padding-right: 8px;
            text-align: left;
        }
        .dark .info-modal-body {
            color: #d1d2d3;
        }
        .modal-text p {
            margin: 0 0 12px 0;
        }
        .info-modal-close-btn {
            background: var(--primary);
            color: #ffffff;
            border: none;
            border-radius: 22px;
            padding: 10px 24px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s;
            align-self: center;
            width: 140px;
            margin-top: 12px;
        }
        .info-modal-close-btn:hover {
            filter: brightness(0.9);
        }

        .err-box {
            padding: 8px 12px;
            border-radius: 8px;
            background: rgba(239, 68, 68, 0.06);
            color: #ef4444;
            font-size: 12.5px;
            font-weight: 600;
            text-align: center;
            margin: 8px auto 0 auto;
            width: 260px;
        }

        /* Large font layout support */
        .app-large-font {
            font-size: 18px !important;
        }
        .app-large-font .title-welcome {
            font-size: 28px !important;
        }
        .app-large-font .title-phone {
            font-size: 22px !important;
        }
        .app-large-font .disclaimer-text {
            font-size: 14.5px !important;
        }
        .app-large-font .sub-info-text {
            font-size: 14px !important;
        }

        /* High contrast layout support */
        .app-high-contrast {
            background: #000000 !important;
            color: #ffffff !important;
        }
        .app-high-contrast .title-welcome,
        .app-high-contrast .title-phone,
        .app-high-contrast .disclaimer-text,
        .app-high-contrast .sub-info-text {
            color: #ffffff !important;
        }
        .app-high-contrast a {
            color: #38bdf8 !important;
        }
        .app-high-contrast .premium-dial-code {
            color: #ffffff !important;
        }
        .app-high-contrast .premium-phone-input {
            color: #ffffff !important;
        }
        .app-high-contrast .capsule-btn.grey {
            background: #202124 !important;
            color: #8696a0 !important;
        }

        @media (max-width: 768px) {
            /* Lock the screen to prevent keyboard push-up */
            .min-h-screen.w-full.flex.flex-col {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                height: 100dvh !important;
                overflow: hidden !important;
            }
            /* Align step content containers below the back button, slightly above keyboard */
            .flex-1.flex.flex-col.max-w-md.mx-auto.w-full {
                justify-content: flex-start !important;
                padding-top: 72px !important;
                height: 100% !important;
                max-height: 100% !important;
                flex: 1 !important;
                overflow-y: hidden !important;
            }
            .flex-1.flex.flex-col.justify-center {
                flex: none !important;
                justify-content: flex-start !important;
            }
            /* Premium country list scroll container should remain scrollable inside its dropdown */
            .premium-country-list {
                max-height: 200px !important;
            }
            /* Group the inputs and buttons closely so they sit above the keyboard */
            .premium-input-card {
                margin-bottom: 12px !important;
            }

            /* Adjust spacing of title and subtitle */
            .title-welcome, .title-phone {
                margin-top: 0 !important;
                margin-bottom: 8px !important;
            }
            .illustration-container {
                margin: 10px auto 14px auto !important;
            }
            .disclaimer-text, .sub-info-text {
                margin-bottom: 12px !important;
            }
            /* Next action button: place it directly below inputs with spacing, instead of pushing to bottom */
            .pb-16 {
                margin-top: 28px !important;
                padding-bottom: 32px !important;
                flex: none !important;
            }
            /* Ensure the accessibility button dropdown menu displays correctly */
            .accessibility-modal {
                top: 48px !important;
                right: 0 !important;
            }
        }
      `}</style>



      {/* Floating Back Button */}
      {step > 1 && (
        <button 
          onClick={goBack} 
          className="absolute top-6 left-6 z-[100] p-4 text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors cursor-pointer"
          title="Go Back"
          type="button"
        >
          <ChevronLeft size={28} />
        </button>
      )}

      {/* Step Content */}
      <div className="flex-1 flex flex-col relative overflow-hidden w-full">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={{
              enter: (dir: "forward" | "back") => ({
                x: dir === "forward" ? 30 : -30,
                opacity: 0
              }),
              center: {
                x: 0,
                opacity: 1
              },
              exit: (dir: "forward" | "back") => ({
                x: dir === "forward" ? -30 : 30,
                opacity: 0
              })
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 380, damping: 30 },
              opacity: { duration: 0.15 }
            }}
            className="flex-1 flex flex-col px-6 w-full h-full"
          >

        {/* ═══════════════ STEP 1: WELCOME SCREEN ═══════════════ */}
        {step === 1 && (
          <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-6 justify-between py-6">
            <div className="flex-1 flex flex-col justify-center relative">
              <div className="access-icon-container absolute top-0 right-0 z-45">
                <button
                  className={clsx("access-icon-btn", accessibilityOpen && "active")}
                  onClick={() => setAccessibilityOpen(!accessibilityOpen)}
                  title="Accessibility Menu"
                  type="button"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="4" r="2.2" fill="var(--primary)" />
                    <path d="M12 6.5v7.5M6 9h12M9.5 21.5l2.5-7.5 2.5 7.5" />
                  </svg>
                </button>

                {accessibilityOpen && (
                  <>
                    <div className="dropdown-backdrop" onClick={() => setAccessibilityOpen(false)} />
                    <div className="accessibility-modal text-left">
                      <div className="accessibility-title">Accessibility</div>
                      <label className="accessibility-option">
                        <span>Large Text</span>
                        <input
                          type="checkbox"
                          checked={largeFont}
                          onChange={(e) => setLargeFont(e.target.checked)}
                          className="accessibility-checkbox"
                        />
                      </label>
                      <label className="accessibility-option">
                        <span>High Contrast</span>
                        <input
                          type="checkbox"
                          checked={highContrast}
                          onChange={(e) => setHighContrast(e.target.checked)}
                          className="accessibility-checkbox"
                        />
                      </label>
                      
                      <div className="accessibility-divider" />
                      
                      <button
                        type="button"
                        onClick={() => { setActiveModal("help"); setAccessibilityOpen(false); }}
                        className="accessibility-link-option"
                      >
                        <span>Help & Support</span>
                        <span className="text-gray-400">→</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => { setActiveModal("terms"); setAccessibilityOpen(false); }}
                        className="accessibility-link-option"
                      >
                        <span>Terms & Conditions</span>
                        <span className="text-gray-400">→</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => { setActiveModal("privacy"); setAccessibilityOpen(false); }}
                        className="accessibility-link-option"
                      >
                        <span>Privacy Policy</span>
                        <span className="text-gray-400">→</span>
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Vector Illustration */}
              <div className="illustration-container">
                <svg className="illustration-svg" viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Left cream chat bubble + Phone receiver */}
                  <g className="anim-float-left">
                    <path d="M40 90C40 65 60 45 85 45H115C140 45 160 65 160 90C160 115 140 135 115 135H85C60 135 40 115 40 90Z" fill="#fffbf0" stroke="#1c2d37" strokeWidth="2.5" />
                    <path d="M40 100L30 115L50 110" stroke="#1c2d37" strokeWidth="2.5" strokeLinejoin="round" fill="#fffbf0" />
                    <path d="M65 75C65 72 70 70 73 70C76 70 78 72 80 75C81 77 79 80 78 81C82 86 86 90 91 94C92 93 95 91 97 92C100 94 102 96 102 99C102 102 100 107 97 107C88 107 72 91 65 75Z" fill="var(--primary)" stroke="#1c2d37" strokeWidth="2.5" strokeLinejoin="round" />
                  </g>

                  {/* Green globe on top-right */}
                  <g className="anim-float-globe">
                    <circle cx="160" cy="80" r="32" fill="var(--background)" stroke="#1c2d37" strokeWidth="2.5" />
                    <path d="M128 80H192" stroke="#1c2d37" strokeWidth="2.5" />
                    <path d="M160 48V112" stroke="#1c2d37" strokeWidth="2.5" />
                    <path d="M160 48C172 65 172 95 160 112" stroke="#1c2d37" strokeWidth="2.5" />
                    <path d="M160 48C148 65 148 95 160 112" stroke="#1c2d37" strokeWidth="2.5" />
                  </g>

                  {/* Main light-green chat bubble in the middle/right */}
                  <g className="anim-float-right">
                    <path d="M90 145C90 125 106 109 126 109H184C204 109 220 125 220 145C220 165 204 181 184 181H126C106 181 90 165 90 145Z" fill="var(--background)" stroke="#1c2d37" strokeWidth="2.5" />
                    <path d="M200 181L215 198L205 180" stroke="#1c2d37" strokeWidth="2.5" strokeLinejoin="round" fill="var(--background)" />
                    <line x1="120" y1="135" x2="190" y2="135" stroke="#1c2d37" strokeWidth="2.5" strokeLinecap="round" />
                    <line x1="120" y1="155" x2="170" y2="155" stroke="#1c2d37" strokeWidth="2.5" strokeLinecap="round" />
                  </g>

                  {/* Heart bubble -> Green/Teal */}
                  <g className="anim-heartbeat">
                    <path d="M70 140C62 132 50 132 42 140C34 148 34 160 42 168L70 196L98 168C106 160 106 148 98 140C90 132 78 132 70 140Z" fill="var(--primary)" stroke="#1c2d37" strokeWidth="2.5" strokeLinejoin="round" />
                  </g>

                  {/* Lock at the bottom right -> Green/Teal */}
                  <g className="anim-lock">
                    <rect x="120" y="195" width="36" height="28" rx="6" fill="var(--primary)" stroke="#1c2d37" strokeWidth="2.5" />
                    <path d="M128 195V187C128 182 132 178 138 178C144 178 148 182 148 187V195" stroke="#1c2d37" strokeWidth="2.5" strokeLinecap="round" />
                    <circle cx="138" cy="207" r="3" fill="#1c2d37" />
                    <path d="M138 210V216" stroke="#1c2d37" strokeWidth="2" />
                  </g>
                </svg>
              </div>

              <h1 className="title-welcome" style={{ marginBottom: "16px" }}>
                {selectedLanguage === "English" ? "Hey Yoghearts," : t.welcome}
              </h1>

              <p className="disclaimer-text">
                {t.agreeText}
                <a href="#" onClick={(e) => { e.preventDefault(); setActiveModal("privacy"); }}>{t.privacy}</a>
                {t.and}
                <a href="#" onClick={(e) => { e.preventDefault(); setActiveModal("terms"); }}>{t.terms}</a>
                {t.period}
              </p>



              {/* Language Selector */}
              <div className="flex justify-center mt-2 mb-4 relative">
                <button 
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 rounded-full text-sm font-semibold text-gray-600 dark:text-gray-300 transition-colors"
                  onClick={() => setLanguageDropdownOpen(!languageDropdownOpen)}
                  type="button"
                >
                  <Globe size={16} />
                  <span>{selectedLanguage === "Français" ? "Français" : "English"}</span>
                  <ChevronDown size={14} className="text-gray-400" />
                </button>

                {languageDropdownOpen && (
                  <>
                    <div className="dropdown-backdrop" onClick={() => setLanguageDropdownOpen(false)} />
                    <div className="absolute top-11 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 py-2 w-36 z-50 animate-in fade-in zoom-in-95 duration-150">
                      {["English", "Français"].map((lang) => (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => {
                            setSelectedLanguage(lang);
                            setLanguageDropdownOpen(false);
                          }}
                          className={clsx(
                            "w-full text-center px-4 py-2 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors block border-none outline-none cursor-pointer",
                            selectedLanguage === lang ? "text-emerald-600 dark:text-emerald-400" : "text-gray-700 dark:text-gray-300"
                          )}
                        >
                          {lang}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="pb-16 flex flex-col items-center gap-3 w-full max-w-[280px] mx-auto">
              <button onClick={() => goForward()} className="capsule-btn blue" style={{ width: "100%", margin: 0 }}>
                {t.agreeBtn}
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════ STEP 2: PHONE NUMBER ═══════════════ */}
        {step === 2 && (
          <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-6 justify-between py-6">
            <div className="flex-1 flex flex-col justify-center relative">
              <h1 className="title-phone">Enter your phone number</h1>

              <p className="disclaimer-text px-2">
                Add your phone number to stay connected with matches. <a href="#" onClick={(e) => { e.preventDefault(); setActiveModal("help"); }} style={{ color: "var(--primary)", fontWeight: 600 }}>What&apos;s my number?</a>
              </p>

              <div className="relative mb-6 w-full flex justify-center">
                <div className={clsx("premium-input-card", (phoneFocused || countryDropdownOpen) && "focused")}>
                  {/* Country selector section */}
                  <div 
                    className="premium-country-select"
                    onClick={() => !loading && setCountryDropdownOpen(!countryDropdownOpen)}
                  >
                    <div className="premium-flag-wrapper">
                      <img 
                        src={`https://flagcdn.com/w40/${selectedCountry.code.toLowerCase()}.png`} 
                        alt={selectedCountry.name}
                        className="premium-flag-img"
                      />
                    </div>
                    <span className="premium-dial-code">{selectedCountry.dial}</span>
                    <span className={clsx("premium-chevron", countryDropdownOpen && "open")}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </span>
                  </div>

                  {/* Divider */}
                  <div className="premium-divider" />

                  {/* Phone number field */}
                  <div className="premium-phone-field">
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, "");
                        setPhoneNumber(digits);
                      }}
                      onFocus={() => setPhoneFocused(true)}
                      onBlur={() => setPhoneFocused(false)}
                      className="premium-phone-input"
                      placeholder="Phone number"
                      required
                      disabled={loading}
                      autoFocus
                    />
                  </div>
                </div>

                {countryDropdownOpen && (
                  <>
                    <div className="dropdown-backdrop" onClick={() => setCountryDropdownOpen(false)} />
                    <div className="premium-dropdown-popup">
                      <div className="premium-search-container">
                        <Search className="premium-search-icon" size={14} />
                        <input
                          type="text"
                          placeholder="Search country or code..."
                          value={countrySearch}
                          onChange={(e) => setCountrySearch(e.target.value)}
                          className="premium-search-input"
                          autoFocus
                        />
                        {countrySearch && (
                          <button 
                            type="button" 
                            className="premium-search-clear"
                            onClick={() => setCountrySearch("")}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      <div className="premium-country-list">
                        {filteredCountries.map((c) => {
                          const isSelected = c.code === selectedCountry.code;
                          return (
                            <div
                              key={c.name}
                              className={clsx("premium-country-item", isSelected && "selected")}
                              onClick={() => {
                                setSelectedCountry(c);
                                setPhoneNumber(formatPhoneAsYouType(phoneNumber.replace(/\D/g, ""), c.code));
                                setCountryDropdownOpen(false);
                                setCountrySearch("");
                              }}
                            >
                              <div className="premium-item-flag-wrapper">
                                <img 
                                  src={`https://flagcdn.com/w40/${c.code.toLowerCase()}.png`} 
                                  alt={c.name}
                                  className="premium-item-flag"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              </div>
                              <span className="premium-item-name">{c.name}</span>
                              <span className="premium-item-dial">{c.dial}</span>
                              {isSelected && <Check size={12} className="premium-item-checkmark" />}
                            </div>
                          );
                        })}
                        {filteredCountries.length === 0 && (
                          <div className="premium-no-results">No countries found</div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {errorMsg && <div className="err-box">{errorMsg}</div>}
            </div>

            <div className="pb-16 flex flex-col items-center gap-3 w-full max-w-[280px] mx-auto">
              <button
                onClick={handleNextPhone}
                disabled={loading || !phoneNumber.trim()}
                className={clsx("capsule-btn", (!phoneNumber.trim() || loading) ? "grey" : "blue")}
                style={{ width: "100%", margin: 0 }}
              >
                {loading ? <Loader2 className="animate-spin" size={16} /> : "Next"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPhoneNumber("");
                  goForward(4);
                }}
                className="capsule-btn"
                style={{
                  width: "100%",
                  margin: 0,
                  backgroundColor: "#ffffff",
                  color: "var(--primary)",
                  border: "2px solid var(--primary)",
                  fontWeight: "bold",
                  cursor: "pointer"
                }}
              >
                Skip
              </button>
            </div>
          </div>
        )}



        {/* ═══════════════ STEP 4: EMAIL ═══════════════ */}
        {step === 4 && (
          <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-6">
            <div className="flex-1 flex flex-col justify-center">
              <div className="text-center mb-8">
                <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl mx-auto flex items-center justify-center mb-4">
                  <Mail size={28} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <h2 className="text-2xl font-bold mb-1">What's your email?</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 px-4">We use this to secure your account.</p>
              </div>
              <div className="mt-2 mb-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  className="w-full text-center text-xl font-bold bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl py-4 focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white"
                  autoFocus
                />
              </div>
              {errorMsg && <p className="text-sm text-red-500 font-semibold text-center mb-4">{errorMsg}</p>}
            </div>
            <div className="pb-16">
              <button
                onClick={handleNextEmail}
                disabled={!email.trim()}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold shadow-lg disabled:opacity-40 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                Continue <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════ STEP 5: NAME ═══════════════ */}
        {step === 5 && (
          <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-6">
            <div className="flex-1 flex flex-col justify-center">
              <div className="text-center mb-8">
                <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl mx-auto flex items-center justify-center mb-4">
                  <User size={28} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <h2 className="text-2xl font-bold mb-1">What should we call you?</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 px-4">This is how you'll appear to others on Yogheart.</p>
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your first name"
                className="w-full text-center text-xl font-bold bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl py-4 focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white mb-4"
                autoFocus
              />
              {errorMsg && <p className="text-sm text-red-500 font-semibold text-center mb-4">{errorMsg}</p>}
            </div>
            <div className="pb-16">
              <button
                onClick={() => { 
                  if (!name.trim()) { 
                    setErrorMsg("Please enter your name"); 
                    return; 
                  }
                  goForward(); 
                }}
                disabled={!name.trim()}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold shadow-lg disabled:opacity-40 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                Continue <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════ STEP 6: DOB ═══════════════ */}
        {step === 6 && (
          <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-6">
            <div className="flex-1 flex flex-col justify-center">
              <div className="text-center mb-8">
                <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl mx-auto flex items-center justify-center mb-4">
                  <span className="text-2xl">🎂</span>
                </div>
                <h2 className="text-2xl font-bold mb-1">When&apos;s your birthday?</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 px-4">Your age will be shown, but your birthday stays private.</p>
              </div>
              <div className="flex gap-3 justify-center mb-4">
                <input type="text" maxLength={2} value={dobDay} onChange={(e) => handleDayChange(e.target.value)} ref={dayInputRef}
                  placeholder="DD" className="w-20 text-center text-lg font-bold bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl py-4 focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white" autoFocus />
                <input type="text" maxLength={2} value={dobMonth} onChange={(e) => handleMonthChange(e.target.value)} ref={monthInputRef}
                  placeholder="MM" className="w-20 text-center text-lg font-bold bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl py-4 focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white" />
                <input type="text" maxLength={4} value={dobYear} onChange={(e) => handleYearChange(e.target.value)} ref={yearInputRef}
                  placeholder="YYYY" className="w-28 text-center text-lg font-bold bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl py-4 focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white" />
              </div>
              {errorMsg && <p className="text-sm text-red-500 font-semibold text-center mb-4">{errorMsg}</p>}
            </div>
            <div className="pb-16">
              <button
                onClick={() => { if (validateDob()) goForward(); }}
                disabled={!dobMonth || !dobDay || !dobYear}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold shadow-lg disabled:opacity-40 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                Continue <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════ STEP 7: GENDER ═══════════════ */}
        {step === 7 && (
          <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-6">
            <div className="flex-1 flex flex-col justify-center">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-1">How do you identify?</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 px-4">Choose the option that best describes you.</p>
              </div>
              <div className="space-y-3 mb-6">
                {["Man", "Woman", "Non-binary"].map((g) => (
                  <button key={g} onClick={() => setGender(g)}
                    className={clsx("w-full py-4 px-5 rounded-2xl font-semibold text-left border-2 transition-all",
                      gender === g ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300" : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                    )}
                  >{g}</button>
                ))}
              </div>
              <div className="flex items-center justify-between px-1">
                <span className="text-sm text-gray-500 dark:text-gray-400">Show gender on profile</span>
                <button onClick={() => setShowGender(!showGender)}
                  className={clsx("w-11 h-6 rounded-full transition-colors relative", showGender ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-700")}
                >
                  <div className={clsx("w-[18px] h-[18px] bg-white rounded-full absolute top-[3px] transition-all shadow-sm", showGender ? "left-[22px]" : "left-[3px]")} />
                </button>
              </div>
            </div>
            <div className="pb-16">
              <button onClick={() => goForward()} disabled={!gender}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold shadow-lg disabled:opacity-40 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >Continue <ArrowRight size={18} /></button>
            </div>
          </div>
        )}

        {/* ═══════════════ STEP 8: SHOW ME ═══════════════ */}
        {step === 8 && (
          <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-6">
            <div className="flex-1 flex flex-col justify-center">
              <div className="text-center mb-8">
                <div className="w-14 h-14 bg-rose-50 dark:bg-rose-900/30 rounded-2xl mx-auto flex items-center justify-center mb-4">
                  <Heart size={28} className="text-rose-500" />
                </div>
                <h2 className="text-2xl font-bold mb-1">Who are you into?</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 px-4">We&apos;ll use this to show you the right people.</p>
              </div>
              <div className="space-y-3">
                {["Men", "Women", "Everyone"].map((opt) => (
                  <button key={opt} onClick={() => setShowMe(opt)}
                    className={clsx("w-full py-4 px-5 rounded-2xl font-semibold text-left border-2 transition-all",
                      showMe === opt ? "border-rose-500 bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300" : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                    )}
                  >{opt}</button>
                ))}
              </div>
            </div>
            <div className="pb-16">
              <button onClick={() => goForward()} disabled={!showMe}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold shadow-lg disabled:opacity-40 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >Continue <ArrowRight size={18} /></button>
            </div>
          </div>
        )}

        {/* ═══════════════ STEP 9: RELATIONSHIP GOAL ═══════════════ */}
        {step === 9 && (
          <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-6">
            <div className="flex-1 flex flex-col justify-center">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold mb-1">What are you looking for?</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 px-4">No wrong answers — just be you.</p>
              </div>
              <div className="space-y-3">
                {RELATIONSHIP_GOALS.map((goal) => (
                  <button key={goal.label} onClick={() => setRelationshipGoal(goal.label)}
                    className={clsx("w-full py-4 px-5 rounded-2xl text-left border-2 transition-all flex items-center gap-4",
                      relationshipGoal === goal.label
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                    )}
                  >
                    <span className="text-2xl">{goal.emoji}</span>
                    <div>
                      <p className={clsx("font-semibold", relationshipGoal === goal.label ? "text-emerald-700 dark:text-emerald-300" : "")}>{goal.label}</p>
                      <p className="text-xs text-gray-400">{goal.sub}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="pb-16">
              <button onClick={() => goForward()} disabled={!relationshipGoal}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold shadow-lg disabled:opacity-40 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >Continue <ArrowRight size={18} /></button>
            </div>
          </div>
        )}

        {/* ═══════════════ STEP 10: WORK & EDUCATION ═══════════════ */}
        {step === 10 && (
          <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-6">
            <div className="flex-1 flex flex-col justify-center">
              <div className="text-center mb-8">
                <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl mx-auto flex items-center justify-center mb-4">
                  <Briefcase size={28} className="text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-2xl font-bold mb-1">A little about your life</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 px-4">Totally optional — but it helps people get to know you.</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 ml-1 mb-1 block">Job Title</label>
                  <input type="text" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g. Software Engineer" className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl py-3.5 px-4 outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 ml-1 mb-1 block">Company <span className="text-gray-300">(optional)</span></label>
                  <input type="text" value={company} onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. Google" className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl py-3.5 px-4 outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 ml-1 mb-1 block">Education</label>
                  <div className="flex flex-wrap gap-2">
                    {EDUCATION_OPTIONS.map((opt) => (
                      <button key={opt} onClick={() => setEducation(education === opt ? "" : opt)}
                        className={clsx("px-3.5 py-2 rounded-full text-sm font-medium border transition-all",
                          education === opt
                            ? "bg-emerald-600 border-emerald-600 text-white"
                            : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100"
                        )}
                      >{opt}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="pb-16 space-y-3">
              <button onClick={() => goForward()}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >Continue <ArrowRight size={18} /></button>
              <button onClick={() => { setJobTitle(""); setCompany(""); setEducation(""); goForward(); }}
                className="w-full py-3 text-gray-400 hover:text-gray-600 font-semibold text-sm transition-colors"
              >Skip for now</button>
            </div>
          </div>
        )}

        {/* ═══════════════ STEP 11: LIFESTYLE ═══════════════ */}
        {step === 11 && (
          <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-6 overflow-y-auto">
            <div className="flex-1 flex flex-col justify-center py-4">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold mb-1">The details that matter</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 px-4">Help matches know your lifestyle. Skip if you prefer.</p>
              </div>
              <div className="space-y-6">
                {/* Kids */}
                <div>
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <Baby size={16} className="text-gray-400" />
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Kids</label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {KIDS_OPTIONS.map((opt) => (
                      <button key={opt} onClick={() => setKids(kids === opt ? "" : opt)}
                        className={clsx("px-3.5 py-2 rounded-full text-sm font-medium border transition-all",
                          kids === opt ? "bg-emerald-600 border-emerald-600 text-white" : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"
                        )}
                      >{opt}</button>
                    ))}
                  </div>
                </div>
                {/* Smoking */}
                <div>
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <Cigarette size={16} className="text-gray-400" />
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Smoking</label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {SMOKING_OPTIONS.map((opt) => (
                      <button key={opt} onClick={() => setSmoking(smoking === opt ? "" : opt)}
                        className={clsx("px-3.5 py-2 rounded-full text-sm font-medium border transition-all",
                          smoking === opt ? "bg-emerald-600 border-emerald-600 text-white" : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"
                        )}
                      >{opt}</button>
                    ))}
                  </div>
                </div>
                {/* Drinking */}
                <div>
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <Wine size={16} className="text-gray-400" />
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Drinking</label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {DRINKING_OPTIONS.map((opt) => (
                      <button key={opt} onClick={() => setDrinking(drinking === opt ? "" : opt)}
                        className={clsx("px-3.5 py-2 rounded-full text-sm font-medium border transition-all",
                          drinking === opt ? "bg-emerald-600 border-emerald-600 text-white" : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"
                        )}
                      >{opt}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="pb-16 space-y-3 shrink-0">
              <button onClick={() => goForward()}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >Continue <ArrowRight size={18} /></button>
              <button onClick={() => { setKids(""); setSmoking(""); setDrinking(""); goForward(); }}
                className="w-full py-3 text-gray-400 hover:text-gray-600 font-semibold text-sm transition-colors"
              >Skip for now</button>
            </div>
          </div>
        )}

        {/* ═══════════════ STEP 12: HOBBIES & INTERESTS ═══════════════ */}
        {step === 12 && (
          <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-6">
            <div className="flex-1 flex flex-col justify-center">
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-amber-50 dark:bg-amber-900/30 rounded-2xl mx-auto flex items-center justify-center mb-4">
                  <Sparkles size={28} className="text-amber-500" />
                </div>
                <h2 className="text-2xl font-bold mb-1">What lights you up?</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 px-4">Pick at least 3 things you&apos;re passionate about.</p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {HOBBIES.map((hobby) => {
                  const isSelected = selectedInterests.includes(hobby);
                  return (
                    <button key={hobby} onClick={() => toggleInterest(hobby)}
                      className={clsx("px-4 py-2.5 rounded-full text-sm font-medium border transition-all",
                        isSelected
                          ? "bg-emerald-600 border-emerald-600 text-white shadow-sm scale-105"
                          : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100"
                      )}
                    >{hobby}</button>
                  );
                })}
              </div>
              {selectedInterests.length > 0 && selectedInterests.length < 3 && (
                <p className="text-center text-xs text-gray-400 mt-4">Pick {3 - selectedInterests.length} more</p>
              )}
              {errorMsg && <p className="text-sm text-red-500 font-semibold text-center mt-4">{errorMsg}</p>}
            </div>
            <div className="pb-16">
              <button onClick={() => { if (selectedInterests.length < 3) { setErrorMsg("Please pick at least 3 interests"); return; } goForward(); }}
                disabled={selectedInterests.length < 3}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold shadow-lg disabled:opacity-40 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >Continue <ArrowRight size={18} /></button>
            </div>
          </div>
        )}

        {/* ═══════════════ STEP 13: PHOTOS ═══════════════ */}
        {step === 13 && (
          <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-6">
            <div className="flex-1 flex flex-col justify-center">
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-violet-50 dark:bg-violet-900/30 rounded-2xl mx-auto flex items-center justify-center mb-4">
                  <Camera size={28} className="text-violet-600 dark:text-violet-400" />
                </div>
                <h2 className="text-2xl font-bold mb-1">Show your best self</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 px-4">Add at least 1 photo. Clear lighting + genuine smiles work best 😊</p>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
              <div className="grid grid-cols-3 gap-3">
                {[0, 1, 2, 3, 4, 5].map((idx) => {
                  const photoUrl = photos[idx];
                  return (
                    <div key={idx}
                      className={clsx(
                        "relative rounded-2xl border-2 border-dashed overflow-hidden transition-all cursor-pointer",
                        idx === 0 ? "col-span-2 row-span-2 aspect-square" : "aspect-square",
                        photoUrl ? "border-transparent" : "border-gray-300 dark:border-gray-700 hover:border-emerald-400"
                      )}
                      onClick={() => {
                        if (!photoUrl && !uploadingPhoto) {
                          setPhotoSlotTarget(idx);
                          fileInputRef.current?.click();
                        }
                      }}
                    >
                      {photoUrl ? (
                        <>
                          <img src={photoUrl} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                          <button onClick={(e) => { e.stopPropagation(); removePhoto(idx); }}
                            className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                          ><X size={12} /></button>
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                          {uploadingPhoto && photoSlotTarget === idx ? (
                            <Loader2 className="animate-spin" size={20} />
                          ) : (
                            <>
                              <Plus size={idx === 0 ? 28 : 20} />
                              {idx === 0 && <span className="text-[10px] font-medium mt-1">Main photo</span>}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {errorMsg && <p className="text-sm text-red-500 font-semibold text-center mt-4">{errorMsg}</p>}
            </div>
            <div className="pb-16">
              <button onClick={() => {
                if (photos.filter(Boolean).length < 1) { setErrorMsg("Please add at least 1 photo"); return; }
                goForward();
              }}
                disabled={photos.filter(Boolean).length < 1}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold shadow-lg disabled:opacity-40 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >Continue <ArrowRight size={18} /></button>
            </div>
          </div>
        )}
        {/* ═══════════════ STEP 14: LOCATION & CONTACTS ═══════════════ */}
        {step === 14 && (
          <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-6">
            <div className="flex-1 flex flex-col justify-center text-center">
              <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl mx-auto flex items-center justify-center mb-4">
                <MapPin size={28} className="text-[var(--primary)]" />
              </div>
              <h2 className="text-2xl font-bold mb-1">Where are you?</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 px-6 leading-relaxed mb-8">
                Enter your location and choose who you want to discover.
              </p>

              {/* Location Text Input */}
              <div className="w-full mb-6">
                <div className="relative flex items-center">
                  <MapPin className="absolute left-4 text-[var(--primary)]" size={20} />
                  <input
                    type="text"
                    value={locationText}
                    onChange={(e) => setLocationText(e.target.value)}
                    placeholder="City, Country (e.g. Kigali, Rwanda)"
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-[var(--primary)] dark:text-white font-medium text-center"
                    autoFocus
                  />
                </div>
              </div>

              {/* Match Radius Selector */}
              <div className="w-full mb-8">
                <label className="text-xs font-bold text-gray-450 dark:text-zinc-500 uppercase tracking-wide block text-left mb-2 pl-1">
                  Match Radius
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRadiusPref("Local")}
                    className={clsx(
                      "py-4 rounded-2xl font-semibold text-center border-2 transition-all flex flex-col items-center justify-center gap-1 active:scale-[0.98]",
                      radiusPref === "Local"
                        ? "border-[var(--primary)] bg-emerald-50 dark:bg-emerald-900/20 text-[var(--primary)]"
                        : "border-gray-200 dark:border-gray-700 bg-transparent text-gray-600 dark:text-gray-350 hover:border-gray-300"
                    )}
                  >
                    <span className="text-lg">📍 Local Matches</span>
                    <span className="text-[10px] opacity-80 font-normal">Within your region</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRadiusPref("Global")}
                    className={clsx(
                      "py-4 rounded-2xl font-semibold text-center border-2 transition-all flex flex-col items-center justify-center gap-1 active:scale-[0.98]",
                      radiusPref === "Global"
                        ? "border-[var(--primary)] bg-emerald-50 dark:bg-emerald-900/20 text-[var(--primary)]"
                        : "border-gray-200 dark:border-gray-700 bg-transparent text-gray-600 dark:text-gray-350 hover:border-gray-300"
                    )}
                  >
                    <span className="text-lg">🌍 Global Matches</span>
                    <span className="text-[10px] opacity-80 font-normal">Around the world</span>
                  </button>
                </div>
              </div>

            </div>

            {errorMsg && <p className="text-sm text-red-500 font-semibold text-center mb-4">{errorMsg}</p>}
            <div className="pb-16 space-y-3">
              <button 
                onClick={() => handleFinish()} 
                disabled={loading || !locationText.trim()}
                className="w-full py-4 bg-[var(--primary)] hover:brightness-95 text-white rounded-2xl font-bold shadow-lg disabled:opacity-40 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <>Complete Setup <ArrowRight size={18} /></>}
              </button>
              <button 
                onClick={() => handleFinish()} 
                disabled={loading}
                className="w-full py-3 text-gray-450 hover:text-gray-650 dark:text-gray-400 dark:hover:text-gray-300 font-semibold text-sm transition-colors"
              >
                Skip & finish later
              </button>
            </div>
          </div>
        )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* iOS Country Selection Bottom Sheet */}
      {showCountrySheet && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-end justify-center animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setShowCountrySheet(false)} />
          <div 
            className="w-full max-w-md bg-white dark:bg-gray-800 rounded-t-3xl shadow-2xl border-t border-gray-200 dark:border-gray-700 flex flex-col max-h-[80vh] z-10 transition-transform duration-150"
            style={{ 
              transform: `translateY(${popupDragY}px)`,
            }}
          >
            <div 
              className="w-full py-3 flex justify-center cursor-grab active:cursor-grabbing select-none"
              onTouchStart={handlePopupTouchStart}
              onTouchMove={handlePopupTouchMove}
              onTouchEnd={() => handlePopupTouchEnd(() => setShowCountrySheet(false))}
            >
              <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full" />
            </div>

            <div className="px-6 pb-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-bold">Select Country</h3>
              <div className="mt-3 flex items-center bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 gap-2">
                <Search size={18} className="text-gray-400" />
                <input
                  type="text"
                  placeholder="Search country or code..."
                  value={countrySearch}
                  onChange={(e) => setCountrySearch(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-sm text-gray-900 dark:text-white placeholder-gray-400"
                />
                {countrySearch && (
                  <button onClick={() => setCountrySearch("")} className="text-gray-400 hover:text-gray-600">
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-2">
              <div className="space-y-1">
                {filteredCountries.map((c) => {
                  const isSelected = c.code === selectedCountry.code;
                  return (
                    <button
                      key={c.name}
                      onClick={() => {
                        setSelectedCountry(c);
                        if (phoneNumber) {
                          setPhoneNumber(formatPhoneAsYouType(phoneNumber.replace(/\D/g, ""), c.code));
                        }
                        setShowCountrySheet(false);
                        setCountrySearch("");
                      }}
                      className={clsx(
                        "w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-left font-medium transition-colors animate-none",
                        isSelected 
                          ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" 
                          : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      )}
                    >
                      <img 
                        src={`https://flagcdn.com/w40/${c.code.toLowerCase()}.png`} 
                        alt={c.name}
                        className="w-7 h-5 object-cover rounded-sm shadow-sm"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <span className="flex-1 text-gray-900 dark:text-white">{c.name}</span>
                      <span className="text-gray-400 font-semibold">{c.dial}</span>
                      {isSelected && <Check size={18} className="text-emerald-600 dark:text-emerald-400" />}
                    </button>
                  );
                })}
                {filteredCountries.length === 0 && (
                  <div className="py-8 text-center text-gray-500">No countries found</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info Text Modals Overlay (Help, Terms, Privacy) */}
      {activeModal && (
        <div className="info-modal-overlay z-50">
          <div className="info-modal-content">
            <h2 className="info-modal-title">
              {activeModal === "help" && "Help & Support"}
              {activeModal === "terms" && "Terms of Service"}
              {activeModal === "privacy" && "Privacy Policy"}
            </h2>
            <div className="info-modal-body">
              {activeModal === "help" && (
                <div className="modal-text">
                  <p><strong>Need help signing in?</strong></p>
                  <p>Yogheart uses secure phone-based verification. Enter your mobile phone number, and a 6-digit passcode will be generated and auto-filled via SMS simulation.</p>
                  <p>If you encounter issues, please clear your browser cache and try again, or contact support at support@yogheart.app.</p>

                  <div className="border-t border-gray-100 dark:border-zinc-800/80 mt-4 pt-4 text-left">
                      <h3 className="text-sm font-bold dark:text-white mb-3 text-[var(--primary)] flex items-center gap-1.5">
                          🍦 How Yogheart Works (The Flavor Guide)
                      </h3>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-3 leading-relaxed">
                          Welcome to the mix! Here is a guide to help you speak the language of Yoghearts and navigate the blender like a pro:
                      </p>
                      
                      <div className="space-y-3.5 pr-1">
                          {/* Swipe Mechanics */}
                          <div className="bg-gray-50/50 dark:bg-zinc-850/50 p-3 rounded-xl border border-gray-100/50 dark:border-zinc-800/50">
                              <h4 className="font-bold text-xs text-gray-800 dark:text-zinc-200 mb-2 flex items-center gap-1.5">
                                  ⚡ The Swipe Mechanics
                              </h4>
                              <ul className="space-y-1.5 text-xs text-gray-600 dark:text-zinc-400">
                                  <li>• <strong>Right Swipe (Like):</strong> <span className="text-[var(--primary)] font-semibold">Scoop</span> (as in, <em>"I'd scoop that"</em> or <em>"we scooped each other"</em>).</li>
                                  <li>• <strong>Left Swipe (Pass):</strong> <span className="text-gray-500 font-semibold">Skip</span> (keeping it on ice, moving on).</li>
                                  <li>• <strong>Super Like:</strong> <span className="text-amber-500 font-semibold">Extra Sprinkle</span> (showing they are premium flavor material).</li>
                              </ul>
                          </div>

                          {/* Profiles, Users, & The Community */}
                          <div className="bg-gray-50/50 dark:bg-zinc-850/50 p-3 rounded-xl border border-gray-100/50 dark:border-zinc-800/50">
                              <h4 className="font-bold text-xs text-gray-800 dark:text-zinc-200 mb-2 flex items-center gap-1.5">
                                  👥 Profiles, Users, & The Community
                              </h4>
                              <ul className="space-y-1.5 text-xs text-gray-600 dark:text-zinc-400">
                                  <li>• <strong>User Profile:</strong> <span className="text-[var(--primary)] font-semibold">Blend</span> (your unique mix of personality, hobbies, and vibe).</li>
                                  <li>• <strong>Verified Profile:</strong> <span className="text-emerald-500 font-semibold">Organic Blend</span> (letting people know they are the real deal).</li>
                                  <li>• <strong>User Base:</strong> <span className="text-violet-500 font-semibold">Yoghearts</span> (our built-in community identity).</li>
                              </ul>
                          </div>

                          {/* Messaging & Connections */}
                          <div className="bg-gray-50/50 dark:bg-zinc-850/50 p-3 rounded-xl border border-gray-100/50 dark:border-zinc-800/50">
                              <h4 className="font-bold text-xs text-gray-800 dark:text-zinc-200 mb-2 flex items-center gap-1.5">
                                  💬 Messaging & Connections
                              </h4>
                              <ul className="space-y-1.5 text-xs text-gray-600 dark:text-zinc-400">
                                  <li>• <strong>A Match:</strong> <span className="text-rose-500 font-semibold">Perfect Blend / Swirled</span> (you two go together perfectly).</li>
                                  <li>• <strong>Text Message:</strong> <span className="text-[var(--primary)] font-semibold">Sip / Sips</span> (sweet, quick exchanges).</li>
                                  <li>• <strong>Active Chat History:</strong> <span className="text-indigo-500 font-semibold">The Counter</span> (where all the active mixing is happening).</li>
                              </ul>
                          </div>

                          {/* Content & Feed */}
                          <div className="bg-gray-50/50 dark:bg-zinc-850/50 p-3 rounded-xl border border-gray-100/50 dark:border-zinc-800/50">
                              <h4 className="font-bold text-xs text-gray-800 dark:text-zinc-200 mb-2 flex items-center gap-1.5">
                                  📝 Content & Feed
                              </h4>
                              <ul className="space-y-1.5 text-xs text-gray-600 dark:text-zinc-400">
                                  <li>• <strong>Photo/Video Post:</strong> <span className="text-teal-500 font-semibold">Fresh Topping</span> (sharing a little bite of your daily life).</li>
                                  <li>• <strong>Main Feed:</strong> <span className="text-amber-600 font-semibold">The Main Menu</span> (where you scroll through what's fresh in the community today).</li>
                                  <li>• <strong>Likes on a Post:</strong> <span className="text-red-500 font-semibold">Sweeteners</span> (adding a little sugar to someone's post).</li>
                                  <li>• <strong>Comments on a Post:</strong> <span className="text-blue-500 font-semibold">Mix-ins</span> (adding your own flavor to their conversation).</li>
                              </ul>
                          </div>

                          {/* How it looks in action */}
                          <div className="bg-rose-50/50 dark:bg-rose-950/20 p-3.5 rounded-xl border border-rose-100/30 dark:border-rose-900/20">
                              <h4 className="font-bold text-xs text-rose-700 dark:text-rose-450 mb-1 flex items-center gap-1.5">
                                  ✨ In Action on your Interface
                              </h4>
                              <p className="text-xs text-rose-600/90 dark:text-rose-300 italic leading-relaxed">
                                  "You’ve Scooped! 🍦 Drop a sip into the blender to get things moving."
                              </p>
                          </div>
                      </div>
                  </div>
                </div>
              )}
              {activeModal === "terms" && (
                <div className="modal-text">
                  <p>Welcome to Yogheart. By accessing or using our services, you agree to be bound by these Terms.</p>
                  <p>We use your information to create your account, deliver our services, and help keep Yogheart safe and secure. In settings, you can access, manage, and delete your account information.</p>
                  <p><strong>1. Use of Service:</strong> You must be at least 18 years old to use Yogheart. You agree to provide accurate registration information.</p>
                  <p><strong>2. Account Safety:</strong> You are responsible for maintaining the confidentiality of your session token.</p>
                  <p><strong>3. Content Policy:</strong> You agree not to send abusive, offensive, or harassing messages to other users.</p>
                </div>
              )}
              {activeModal === "privacy" && (
                <div className="modal-text">
                  <p>At Yogheart, your privacy is our priority. We design our features with security in mind.</p>
                  <p><strong>1. Information Collection:</strong> We collect your verified phone number to generate deterministic credentials for your account.</p>
                  <p><strong>2. Data Usage:</strong> We use your profile details, online/offline last-seen indicators, and messages to deliver the core chat features.</p>
                  <p><strong>3. Data Management:</strong> You can access, manage, and delete your profile or settings at any time in the app settings.</p>
                </div>
              )}
            </div>
            <button className="info-modal-close-btn" type="button" onClick={() => setActiveModal(null)}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="h-4 w-full shrink-0" />
    </div>
  );
}
