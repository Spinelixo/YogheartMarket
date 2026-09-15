import { Share } from "@capacitor/share";

export interface NativeShareOptions {
  title?: string;
  text?: string;
  url?: string;
  dialogTitle?: string;
}

/**
 * Universal share utility that triggers:
 * 1. Native Android / iOS Sharesheet via @capacitor/share on APK/native.
 * 2. Web Share API on modern mobile/desktop browsers (PWA).
 * 3. Fallback to clipboard copying if sharing APIs are unavailable.
 *
 * Returns:
 * - "shared" if the native/web sharesheet was opened.
 * - "copied" if falling back to copying link to clipboard.
 * - "cancelled" if user dismissed without sharing.
 */
export async function shareContent(options: NativeShareOptions): Promise<"shared" | "copied" | "cancelled"> {
  const isNative = typeof window !== "undefined" && !!(window as any).Capacitor?.isNativePlatform?.();

  // Normalize URL so recipients get a valid public web link
  let shareUrl = options.url || (typeof window !== "undefined" ? window.location.href : "https://yoghearts.web.app");
  if (
    shareUrl.includes("localhost") ||
    shareUrl.startsWith("capacitor://") ||
    shareUrl.startsWith("file://")
  ) {
    const path = typeof window !== "undefined" ? window.location.pathname + window.location.search : "";
    shareUrl = `https://yoghearts.web.app${path}`;
  }

  // 1. Try Capacitor native share first (especially on APK)
  try {
    const canShareResult = await Share.canShare();
    if (canShareResult.value || isNative) {
      await Share.share({
        title: options.title,
        text: options.text,
        url: shareUrl,
        dialogTitle: options.dialogTitle || "Share via",
      });
      return "shared";
    }
  } catch (err: any) {
    // User pressed dismiss / back on native share sheet
    if (
      err?.message?.includes("canceled") ||
      err?.message?.includes("cancelled") ||
      err?.message?.includes("User cancelled") ||
      err?.name === "AbortError"
    ) {
      return "cancelled";
    }
    console.warn("Capacitor share attempt:", err);
  }

  // 2. Web Share API fallback for PWA / Mobile Web
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({
        title: options.title,
        text: options.text,
        url: shareUrl,
      });
      return "shared";
    } catch (err: any) {
      if (err?.name === "AbortError") {
        return "cancelled";
      }
      console.warn("navigator.share fallback:", err);
    }
  }

  // 3. Fallback to copying link
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(shareUrl);
      return "copied";
    }
  } catch (err) {
    console.warn("Clipboard fallback failed:", err);
  }

  return "copied";
}
