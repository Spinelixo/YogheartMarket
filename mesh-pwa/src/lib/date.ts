/**
 * Formats a user's lastSeen timestamp according to the requirements:
 * - If within 24 hours: "recently"
 * - If calendar-day yesterday or within 48 hours: "yesterday"
 * - Otherwise: "a long time ago"
 * - Keeps special statuses ("online", "recently") intact.
 */
export function formatLastSeen(lastSeen: string | null | undefined, fallbackTimestamp?: string | null): string {
    const effectiveLastSeen = lastSeen || fallbackTimestamp;
    if (!effectiveLastSeen) return "a long time ago";
    if (effectiveLastSeen === "online" || effectiveLastSeen === "recently") return effectiveLastSeen;
    
    try {
        const date = new Date(effectiveLastSeen);
        if (isNaN(date.getTime())) {
            return effectiveLastSeen; // Return fallback if parsing fails
        }
        
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        
        if (diffMs < 24 * 60 * 60 * 1000) {
            return "recently";
        }
        
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        
        if (yesterday.toDateString() === date.toDateString() || diffMs < 48 * 60 * 60 * 1000) {
            return "yesterday";
        }
        
        return "a long time ago";
    } catch {
        return "recently";
    }
}
