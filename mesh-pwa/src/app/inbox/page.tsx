"use client";

import { Suspense } from "react";
import MainAppShell from "@/components/MainAppShell";

export default function ChatPage() {
    return (
        <Suspense fallback={null}>
            <MainAppShell />
        </Suspense>
    );
}
