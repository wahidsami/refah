"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";

interface Message {
    id: string;
    subject: string;
    body: string;
    recipientType: string | null;
    recipientId: string | null;
    isPinned: boolean;
    readBy: string[];
    createdAt: string;
}

interface StaffMember {
    id: string;
    firstName: string;
    lastName: string;
}

export default function MessagesPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [staffList, setStaffList] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    // Form state
    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");
    const [recipientId, setRecipientId] = useState(""); // empty means broadcast
    const [isPinned, setIsPinned] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            await Promise.all([fetchMessages(), fetchStaff()]);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMessages = async () => {
        try {
            const res = await api.get<any>("/tenant/messages");
            if (res.success) {
                setMessages(res.data);
            }
        } catch (error) {
            console.error("Failed to load messages:", error);
        }
    };

    const fetchStaff = async () => {
        try {
            const res = await api.get<any>("/tenant/staff");
            if (res.success) {
                setStaffList(res.data);
            }
        } catch (error) {
            console.error("Failed to load staff:", error);
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        setSending(true);
        try {
            const payload = {
                subject,
                body,
                recipientId: recipientId || null,
                isPinned
            };
            const res = await api.post<any>("/tenant/messages", payload);
            if (res.success) {
                // Reset form
                setSubject("");
                setBody("");
                setRecipientId("");
                setIsPinned(false);
                // Refresh list
                fetchMessages();
            }
        } catch (error) {
            console.error("Error sending message", error);
        } finally {
            setSending(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this message?")) return;
        try {
            const res = await api.delete<any>(`/tenant/messages/${id}`);
            if (res.success) {
                fetchMessages();
            }
        } catch (error) {
            console.error("Error deleting message", error);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Loading messages...</div>;
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Staff Communications</h1>

            {/* Compose Area */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Compose Message</h2>
                <form onSubmit={handleSend} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                            <select
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                value={recipientId}
                                onChange={(e) => setRecipientId(e.target.value)}
                            >
                                <option value="">Broadcast (All Staff)</option>
                                {staffList.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.firstName} {s.lastName}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Subject (Optional)</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                placeholder="e.g. Weekend Schedule Update"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Message Body *</label>
                        <textarea
                            required
                            rows={4}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
                            placeholder="Type your message here..."
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center justify-between pt-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                                checked={isPinned}
                                onChange={(e) => setIsPinned(e.target.checked)}
                            />
                            <span className="text-sm font-medium text-gray-700">Pin to top of staff inbox</span>
                        </label>

                        <button
                            type="submit"
                            disabled={sending || !body.trim()}
                            className="px-6 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2"
                        >
                            {sending ? 'Sending...' : 'Send Message'}
                            <span className="text-lg">📢</span>
                        </button>
                    </div>
                </form>
            </div>

            {/* Sent History */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900">Translation History</h2>
                    <span className="text-sm text-gray-500">{messages.length} total</span>
                </div>

                {messages.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        No messages sent yet.
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {messages.map((msg) => {
                            const date = new Date(msg.createdAt).toLocaleDateString();
                            const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                            // Find recipient name if not broadcast
                            let recipientName = "All Staff (Broadcast)";
                            if (msg.recipientId) {
                                const target = staffList.find(s => s.id === msg.recipientId);
                                if (target) recipientName = `${target.firstName} ${target.lastName}`;
                            }

                            return (
                                <div key={msg.id} className="p-6 hover:bg-gray-50/50 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            {msg.isPinned && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 mb-2">
                                                    📌 Pinned
                                                </span>
                                            )}
                                            <h3 className="text-sm font-bold text-gray-900">
                                                {msg.subject || "(No Subject)"}
                                            </h3>
                                            <p className="text-xs text-gray-500 mt-1">
                                                To: {recipientName} • {date} at {time}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleDelete(msg.id)}
                                            className="text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-colors"
                                            title="Delete Message"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                    <p className="text-sm text-gray-700 whitespace-pre-line mt-3 border-l-2 border-primary/20 pl-3">
                                        {msg.body}
                                    </p>

                                    <div className="mt-4 pt-3 border-t border-gray-100">
                                        <p className="text-xs text-gray-500">
                                            Read by <strong className="text-gray-900">{Array.isArray(msg.readBy) ? msg.readBy.length : 0}</strong> staff members
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
