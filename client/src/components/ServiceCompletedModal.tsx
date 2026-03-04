"use client";

import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Currency } from "@/components/Currency";
import { api } from "@/lib/api";

const SESSION_KEY_PREFIX = "service_completed_modal_shown_";

type Props = {
    type: "remainder_due" | "thank_you";
    remainderAmount?: number;
    appointmentId?: string;
    amountPaid?: number;
    onClose: () => void;
    onViewBookings?: () => void;
    onLeaveReview?: () => void;
};

export function ServiceCompletedModal({
    type,
    remainderAmount = 0,
    appointmentId,
    amountPaid = 0,
    onClose,
    onViewBookings,
    onLeaveReview,
}: Props) {
    const { locale, isRTL } = useLanguage();
    const [step, setStep] = useState<"message" | "tip">("message");
    const [customTip, setCustomTip] = useState("");
    const [tipSubmitting, setTipSubmitting] = useState(false);
    const isRemainderDue = type === "remainder_due";
    const baseAmount = amountPaid > 0 ? amountPaid : 0;
    const tipOptions = baseAmount > 0
        ? [
            { label: "5%", value: Math.round(baseAmount * 0.05 * 100) / 100 },
            { label: "10%", value: Math.round(baseAmount * 0.1 * 100) / 100 },
            { label: "15%", value: Math.round(baseAmount * 0.15 * 100) / 100 },
        ]
        : [];

    const handleTipSubmit = async (amount: number) => {
        if (!appointmentId || amount <= 0) return;
        setTipSubmitting(true);
        try {
            await api.addAppointmentTip(appointmentId, amount, "cash");
            onClose();
            onViewBookings?.();
        } catch (e) {
            alert((e as Error).message || "Failed to submit tip");
        } finally {
            setTipSubmitting(false);
        }
    };

    const handleCustomTip = () => {
        const n = parseFloat(customTip);
        if (!Number.isNaN(n) && n > 0 && baseAmount > 0 && n <= baseAmount) {
            handleTipSubmit(n);
        } else {
            alert(locale === "ar" ? "أدخل مبلغاً صالحاً" : "Enter a valid amount");
        }
    };

    if (!isRemainderDue && step === "tip" && appointmentId && baseAmount > 0) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
                <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 text-center" onClick={(e) => e.stopPropagation()} style={{ direction: isRTL ? "rtl" : "ltr" }}>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{locale === "ar" ? "هل ترغب في ترك إكرامية؟" : "Would you like to leave a tip?"}</h3>
                    <div className="flex flex-wrap gap-2 justify-center my-4">
                        {tipOptions.map((opt) => (
                            <button key={opt.label} type="button" disabled={tipSubmitting} onClick={() => handleTipSubmit(opt.value)} className="px-4 py-2 rounded-lg border border-primary text-primary font-semibold hover:bg-primary/10">
                                {opt.label} (<Currency amount={opt.value} locale={locale} />)
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-2 items-center justify-center mt-2 flex-wrap">
                        <input type="number" min="0" step="0.01" placeholder={locale === "ar" ? "مبلغ مخصص" : "Custom"} value={customTip} onChange={(e) => setCustomTip(e.target.value)} className="border rounded-lg px-3 py-2 w-28" />
                        <button type="button" disabled={tipSubmitting} onClick={handleCustomTip} className="px-4 py-2 bg-primary text-white font-semibold rounded-lg">Submit</button>
                    </div>
                    <button type="button" disabled={tipSubmitting} onClick={() => { setStep("message"); setCustomTip(""); }} className="mt-4 text-sm text-gray-500 hover:text-gray-700">Skip</button>
                </div>
            </div>
        );
    }

    const title = title = isRemainderDue
        ? locale === "ar"
            ? "تم إكمال الخدمة"
            : "Service completed"
        : locale === "ar"
            ? "شكراً لزيارتك"
            : "Thank you for your visit";

    const body = isRemainderDue
        ? locale === "ar"
            ? `يرجى دفع المبلغ المتبقي عند الكاشير.`
            : "Please pay the remaining amount at the cashier desk."
        : locale === "ar"
            ? "نتمنى رؤيتك مجدداً قريباً."
            : "We hope to see you again soon.";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 text-center"
                onClick={(e) => e.stopPropagation()}
                style={{ direction: isRTL ? "rtl" : "ltr" }}
            >
                <div className="text-5xl mb-4">{isRemainderDue ? "💳" : "✅"}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-600 mb-4">{body}</p>
                {isRemainderDue && remainderAmount > 0 && (
                    <p className="text-lg font-semibold text-primary mb-4">
                        <Currency amount={remainderAmount} locale={locale} />
                    </p>
                )}
                <div className="flex flex-col gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            onViewBookings?.();
                            onClose();
                        }}
                        className="w-full py-3 px-4 bg-primary text-white font-semibold rounded-lg hover:opacity-90"
                    >
                        {locale === "ar" ? "عرض الحجوزات" : "View my bookings"}
                    </button>
                    {!isRemainderDue && onLeaveReview && (
                        <button type="button" onClick={() => { onLeaveReview(); onClose(); }} className="w-full py-2 text-primary font-semibold">
                            {locale === "ar" ? "ترك تقييم" : "Leave a review"}
                        </button>
                    )}
                    {!isRemainderDue && appointmentId && baseAmount > 0 && (
                        <button type="button" onClick={() => setStep("tip")} className="w-full py-2 text-primary font-semibold border border-primary rounded-lg">
                            {locale === "ar" ? "ترك إكرامية" : "Leave a tip"}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-sm text-gray-500 hover:text-gray-700"
                    >
                        {locale === "ar" ? "إغلاق" : "Close"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export function shouldShowServiceCompletedModal(bookingId: string): boolean {
    if (typeof window === "undefined") return false;
    return !sessionStorage.getItem(SESSION_KEY_PREFIX + bookingId);
}

export function markServiceCompletedModalShown(bookingId: string): void {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(SESSION_KEY_PREFIX + bookingId, "1");
}
