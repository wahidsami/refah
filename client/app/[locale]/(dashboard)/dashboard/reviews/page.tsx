"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";

interface Review {
    id: string;
    rating: number;
    comment?: string;
    customerName?: string;
    isVisible: boolean;
    createdAt: string;
    staff?: { firstName: string; lastName: string };
}

const StarDisplay = ({ rating }: { rating: number }) => (
    <span className="text-amber-400">{'★'.repeat(rating)}{'☆'.repeat(5 - rating)}</span>
);

export default function ReviewsManagementPage() {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [avgRating, setAvgRating] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'visible' | 'hidden'>('all');

    useEffect(() => {
        api.get<any>('/tenant/reviews').then(r => {
            if (r.success) {
                setReviews(r.data.reviews);
                setAvgRating(r.data.avgRating);
            }
        }).finally(() => setLoading(false));
    }, []);

    const toggleVisibility = async (id: string, current: boolean) => {
        await api.patch(`/tenant/reviews/${id}`, { isVisible: !current });
        setReviews(prev => prev.map(r => r.id === id ? { ...r, isVisible: !current } : r));
    };

    const filtered = reviews.filter(r => {
        if (filter === 'visible') return r.isVisible;
        if (filter === 'hidden') return !r.isVisible;
        return true;
    });

    if (loading) return <div className="p-8 text-center text-gray-500">Loading reviews...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Customer Reviews</h1>
                    {avgRating && (
                        <p className="text-gray-500 mt-1">Average: <span className="font-bold text-amber-500">★ {avgRating}</span> across {reviews.length} reviews</p>
                    )}
                </div>
                <div className="flex gap-2">
                    {(['all', 'visible', 'hidden'] as const).map(f => (
                        <button key={f} onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${filter === f ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="bg-white rounded-xl p-8 text-center text-gray-500 border border-gray-100">No reviews found.</div>
            ) : (
                <div className="space-y-4">
                    {filtered.map(r => (
                        <div key={r.id} className={`bg-white rounded-xl shadow-sm border p-6 transition-opacity ${!r.isVisible ? 'opacity-50 border-gray-100' : 'border-gray-100'}`}>
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <StarDisplay rating={r.rating} />
                                        {r.staff && (
                                            <span className="text-sm text-gray-500">for <strong>{r.staff.firstName} {r.staff.lastName}</strong></span>
                                        )}
                                        <span className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    {r.customerName && <p className="text-sm text-gray-500 italic mb-2">— {r.customerName}</p>}
                                    {r.comment && <p className="text-gray-700">"{r.comment}"</p>}
                                    {!r.isVisible && (
                                        <span className="inline-block mt-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Hidden from public</span>
                                    )}
                                </div>
                                <button
                                    onClick={() => toggleVisibility(r.id, r.isVisible)}
                                    className={`ml-4 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${r.isVisible ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                                >
                                    {r.isVisible ? 'Hide' : 'Show'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
