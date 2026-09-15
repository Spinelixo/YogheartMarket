import { NextResponse } from "next/server";
import Stripe from "stripe";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";

const stripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: "2025-02-24.acacia" as any,
});

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        const { statusId, userId, durationHours, successUrl, cancelUrl } = body || {};

        const duration = Number(durationHours) || 1;
        let amountCents = 299;
        let productName = "1 Hour Profile Boost";

        if (duration === 6) {
            amountCents = 999;
            productName = "6 Hour Profile Boost";
        } else if (duration === 24) {
            amountCents = 1999;
            productName = "24 Hour Profile Boost";
        } else if (duration !== 1) {
            amountCents = Math.round(duration * 299 * 0.8);
            productName = `${duration} Hours Profile Boost`;
        }

        const origin = request.headers.get("origin") || "https://yoghearts.web.app";

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        product_data: {
                            name: productName,
                            description: `Promote your Yogheart profile for ${duration} hours to gain maximum visibility & matches.`,
                        },
                        unit_amount: amountCents,
                    },
                    quantity: 1,
                },
            ],
            mode: "payment",
            success_url: successUrl || `${origin}/me/boosting?success=true&duration=${duration}&amount=${(amountCents / 100).toFixed(2)}`,
            cancel_url: cancelUrl || `${origin}/me/boosting?cancel=true`,
            metadata: {
                statusId: statusId || "profile_boost",
                userId: userId || "",
                durationHours: String(duration),
            },
        });

        return NextResponse.json({ url: session.url });
    } catch (err: any) {
        console.error("Error creating Stripe checkout session:", err);
        return NextResponse.json({ error: err.message || "Stripe session creation failed" }, { status: 500 });
    }
}
