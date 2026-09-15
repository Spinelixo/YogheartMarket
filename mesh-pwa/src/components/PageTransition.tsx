"use client";

export default function PageTransition({ children }: { children: React.ReactNode }) {
    return (
        <div className="absolute inset-0 overflow-y-auto w-full h-full bg-transparent">
            {children}
        </div>
    );
}
