"use client";

import { Suspense } from "react";
import MainAppShell from "@/components/MainAppShell";

export default function ArchivedPage() {
    return (
        <Suspense fallback={null}>
            <MainAppShell />
        </Suspense>
    );
}
