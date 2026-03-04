"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";

interface StaffMember { id: string; firstName: string; lastName: string; }
interface PayrollRecord {
    id: string; staffId: string;
    staff?: { firstName: string; lastName: string };
    periodStart: string; periodEnd: string;
    baseSalary: number; commission: number; tipsTotal: number;
    bonuses: number; deductions: number; status: string;
}

const currency = (n: number) => `SAR ${Number(n || 0).toFixed(2)}`;
const net = (p: PayrollRecord) => (
    Number(p.baseSalary) + Number(p.commission) + Number(p.tipsTotal) + Number(p.bonuses) - Number(p.deductions)
);

const STATUS_COLORS: Record<string, string> = {
    draft: 'bg-amber-100 text-amber-800',
    processed: 'bg-blue-100 text-blue-800',
    paid: 'bg-green-100 text-green-800',
};

export default function PayrollPage() {
    const [records, setRecords] = useState<PayrollRecord[]>([]);
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Month filter
    const now = new Date();
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const [month, setMonth] = useState(defaultMonth);

    // Form state
    const [form, setForm] = useState({
        staffId: '', baseSalary: '', commission: '', tipsTotal: '', bonuses: '', deductions: '', notes: '',
    });

    const periodStart = `${month}-01`;
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    useEffect(() => {
        Promise.all([
            api.get<any>(`/tenant/payroll?month=${month}`).then(r => r.success ? setRecords(r.data) : null),
            api.get<any>('/tenant/staff').then(r => r.success ? setStaff(r.data) : null),
        ]).finally(() => setLoading(false));
    }, [month]);

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.post<any>('/tenant/payroll', { ...form, periodStart, periodEnd });
            const res = await api.get<any>(`/tenant/payroll?month=${month}`);
            if (res.success) setRecords(res.data);
            setForm({ staffId: '', baseSalary: '', commission: '', tipsTotal: '', bonuses: '', deductions: '', notes: '' });
        } catch (e) { console.error(e); }
        finally { setSaving(false); }
    };

    const updateStatus = async (id: string, status: string) => {
        try {
            await api.patch(`/tenant/payroll/${id}/status`, { status });
            setRecords(r => r.map(p => p.id === id ? { ...p, status } : p));
        } catch (e) { console.error(e); }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading payroll data...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-gray-900">Payroll</h1>
                <input
                    type="month"
                    className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                    value={month}
                    onChange={e => setMonth(e.target.value)}
                />
            </div>

            {/* Generate Form */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Generate / Update Pay Record</h2>
                <form onSubmit={handleGenerate} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Staff Member *</label>
                            <select required className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20"
                                value={form.staffId} onChange={e => setForm({ ...form, staffId: e.target.value })}>
                                <option value="">Select staff member...</option>
                                {staff.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
                            <div className="px-4 py-2 border border-gray-100 rounded-lg bg-gray-50 text-gray-600 text-sm">
                                {periodStart} → {periodEnd}
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {[
                            { key: 'baseSalary', label: 'Base Salary (SAR)' },
                            { key: 'commission', label: 'Commission (SAR)' },
                            { key: 'tipsTotal', label: 'Tips (SAR)' },
                            { key: 'bonuses', label: 'Bonuses (SAR)' },
                            { key: 'deductions', label: 'Deductions (SAR)' },
                        ].map(f => (
                            <div key={f.key}>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                                <input type="number" step="0.01" min="0" placeholder="0.00"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20"
                                    value={(form as any)[f.key]}
                                    onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                                />
                            </div>
                        ))}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <input type="text" placeholder="Optional notes..."
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20"
                            value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                        />
                    </div>
                    <button type="submit" disabled={saving}
                        className="px-6 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors">
                        {saving ? 'Saving...' : 'Save Pay Record'}
                    </button>
                </form>
            </div>

            {/* Records Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                    <h2 className="text-lg font-bold text-gray-900">{month} — {records.length} Records</h2>
                </div>
                {records.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No payroll records for this period.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100">
                            <thead className="bg-gray-50">
                                <tr>
                                    {['Staff', 'Base', 'Commission', 'Tips', 'Bonuses', 'Deductions', 'Net Pay', 'Status', 'Actions'].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {records.map(p => (
                                    <tr key={p.id} className="hover:bg-gray-50/50">
                                        <td className="px-4 py-3 font-medium text-gray-900">
                                            {p.staff ? `${p.staff.firstName} ${p.staff.lastName}` : p.staffId}
                                        </td>
                                        {[p.baseSalary, p.commission, p.tipsTotal, p.bonuses, p.deductions].map((v, i) => (
                                            <td key={i} className="px-4 py-3 text-sm text-gray-600">{currency(v)}</td>
                                        ))}
                                        <td className="px-4 py-3 font-bold text-primary">{currency(net(p))}</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[p.status] || ''}`}>
                                                {p.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-2">
                                                {p.status === 'draft' && (
                                                    <button onClick={() => updateStatus(p.id, 'processed')}
                                                        className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors">
                                                        Process
                                                    </button>
                                                )}
                                                {p.status === 'processed' && (
                                                    <button onClick={() => updateStatus(p.id, 'paid')}
                                                        className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-colors">
                                                        Mark Paid
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
