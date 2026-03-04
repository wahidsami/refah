'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

function PaymentContent() {
  const searchParams = useSearchParams();
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(!!token);
  const [error, setError] = useState<string | null>(null);
  const [bill, setBill] = useState<{
    billNumber: string;
    amount: number;
    currency: string;
    dueDate?: string;
    planSnapshot?: { packageName?: string; billingCycle?: string };
    paidAt?: string;
  } | null>(null);
  const [alreadyPaid, setAlreadyPaid] = useState(false);
  const [expired, setExpired] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [holderName, setHolderName] = useState('');

  useEffect(() => {
    if (!token) {
      setError(locale === 'ar' ? 'رابط الدفع غير صالح (لا يوجد رمز).' : 'Invalid payment link (missing token).');
      setLoading(false);
      return;
    }
    fetch(`${API_BASE}/public/bills/by-token/${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) {
          setError(data.message || (locale === 'ar' ? 'فشل تحميل الفاتورة.' : 'Failed to load invoice.'));
          if (data.expired) setExpired(true);
        } else if (data.alreadyPaid && data.bill) {
          setAlreadyPaid(true);
          setBill(data.bill);
        } else if (data.bill) {
          setBill(data.bill);
        }
      })
      .catch(() => setError(locale === 'ar' ? 'فشل الاتصال.' : 'Connection failed.'))
      .finally(() => setLoading(false));
  }, [token, locale]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !bill || alreadyPaid || expired) return;
    setSubmitting(true);
    fetch(`${API_BASE}/public/bills/by-token/${token}/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cardNumber: cardNumber || '4242424242424242',
        expiry: expiry || '12/28',
        cvc: cvc || '123',
        holderName: holderName || 'Card Holder'
      })
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setSuccess(true);
          if (data.alreadyPaid) setAlreadyPaid(true);
        } else setError(data.message || (locale === 'ar' ? 'فشل الدفع.' : 'Payment failed.'));
      })
      .catch(() => setError(locale === 'ar' ? 'فشل الاتصال.' : 'Connection failed.'))
      .finally(() => setSubmitting(false));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">{locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  if (error && !bill) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">{locale === 'ar' ? 'خطأ' : 'Error'}</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href={`/${locale}/dashboard/bills`}
            className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700"
          >
            {locale === 'ar' ? 'الفواتير' : 'My Bills'}
          </Link>
        </div>
      </div>
    );
  }

  if (success || (alreadyPaid && bill)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            {locale === 'ar' ? 'تم الدفع بنجاح' : 'Payment successful'}
          </h1>
          <p className="text-gray-600 mb-2">
            {bill?.billNumber} — {bill?.amount} {bill?.currency}
          </p>
          <p className="text-gray-500 text-sm mb-6">
            {locale === 'ar' ? 'اشتراكك مفعّل الآن.' : 'Your subscription is now active.'}
          </p>
          <Link
            href={`/${locale}/dashboard`}
            className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700"
          >
            {locale === 'ar' ? 'لوحة التحكم' : 'Dashboard'}
          </Link>
        </div>
      </div>
    );
  }

  if (!bill) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 py-8 px-4" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-pink-500 px-6 py-6 text-white">
            <h1 className="text-2xl font-bold">
              {locale === 'ar' ? 'ادفع فاتورتك' : 'Pay your bill'}
            </h1>
            <p className="text-white/90 text-sm mt-1">
              {bill.billNumber} · {bill.planSnapshot?.packageName || ''}
            </p>
          </div>
          <div className="p-6 space-y-6">
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">{locale === 'ar' ? 'المبلغ' : 'Amount'}</span>
                <span className="text-2xl font-bold text-gray-900">
                  {bill.amount} {bill.currency}
                </span>
              </div>
              {bill.dueDate && (
                <div className="flex justify-between items-center mt-2 text-sm text-gray-500">
                  <span>{locale === 'ar' ? 'الموعد النهائي' : 'Due date'}</span>
                  <span>{bill.dueDate}</span>
                </div>
              )}
            </div>

            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
              {locale === 'ar'
                ? 'هذه صفحة دفع تجريبية. استخدم أي بيانات بطاقة للاختبار.'
                : 'This is a demo payment page. Use any card details for testing.'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {locale === 'ar' ? 'اسم صاحب البطاقة' : 'Card holder name'}
                </label>
                <input
                  type="text"
                  value={holderName}
                  onChange={(e) => setHolderName(e.target.value)}
                  placeholder={locale === 'ar' ? 'الاسم كما على البطاقة' : 'Name on card'}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {locale === 'ar' ? 'رقم البطاقة' : 'Card number'}
                </label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16))}
                  placeholder="4242 4242 4242 4242"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {locale === 'ar' ? 'انتهاء الصلاحية' : 'Expiry'}
                  </label>
                  <input
                    type="text"
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    placeholder="MM/YY"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CVC</label>
                  <input
                    type="text"
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="123"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    {locale === 'ar' ? 'جاري الدفع...' : 'Processing...'}
                  </>
                ) : (
                  locale === 'ar' ? 'ادفع الآن' : 'Pay now'
                )}
              </button>
            </form>
          </div>
        </div>
        <p className="text-center mt-4">
          <Link href={`/${locale}/dashboard/bills`} className="text-purple-600 hover:underline text-sm">
            {locale === 'ar' ? 'العودة إلى الفواتير' : 'Back to My Bills'}
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
        </div>
      }
    >
      <PaymentContent />
    </Suspense>
  );
}
