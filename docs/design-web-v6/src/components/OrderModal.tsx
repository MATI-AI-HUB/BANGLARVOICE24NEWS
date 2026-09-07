import { useEffect, useState } from "react";
import { X, Send, CheckCircle2 } from "lucide-react";

export type OrderModalProps = {
  open: boolean;
  service?: string | undefined;
  onClose: () => void;
};

export function OrderModal({ open, service, onClose }: OrderModalProps) {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", service: service ?? "", phone: "", message: "" });

  useEffect(() => {
    if (open) {
      setForm((f) => ({ ...f, service: service ?? f.service }));
      setSubmitted(false);
    }
  }, [open, service]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) return;
    setSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl lime-glow">
        <button onClick={onClose} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
          <X size={20} />
        </button>

        {submitted ? (
          <div className="py-10 text-center">
            <CheckCircle2 className="mx-auto text-primary" size={56} />
            <h3 className="mt-4 text-xl font-bold">ধন্যবাদ! আপনার অনুরোধ গৃহীত হয়েছে।</h3>
            <p className="mt-2 text-sm text-muted-foreground">আমাদের টিম শীঘ্রই যোগাযোগ করবে।</p>
            <button onClick={onClose} className="mt-6 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
              বন্ধ করুন
            </button>
          </div>
        ) : (
          <>
            <h3 className="text-2xl font-bold">অর্ডার / যোগাযোগ ফর্ম</h3>
            <p className="mt-1 text-sm text-muted-foreground">আপনার তথ্য দিন — আমরা ২৪ ঘণ্টার মধ্যে যোগাযোগ করবো।</p>

            <form onSubmit={submit} className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">আপনার নাম *</label>
                <input
                  required maxLength={80}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  placeholder="নাম লিখুন"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">সেবার ধরন</label>
                <select
                  value={form.service}
                  onChange={(e) => setForm({ ...form, service: e.target.value })}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">নির্বাচন করুন</option>
                  <option>ডোমেইন ও হোস্টিং</option>
                  <option>ওয়েবসাইট ডিজাইন</option>
                  <option>কাস্টম সফটওয়্যার</option>
                  <option>বিজ্ঞাপন তৈরি</option>
                  <option>মেটা ব্লু-ব্যাজ</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">মোবাইল নম্বর *</label>
                <input
                  required maxLength={20}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-sans outline-none focus:ring-2 focus:ring-ring"
                  placeholder="+880 1XXX XXXXXX"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">বার্তা</label>
                <textarea
                  rows={3} maxLength={500}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  placeholder="আপনার প্রয়োজন সংক্ষেপে লিখুন"
                />
              </div>
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90"
              >
                <Send size={16} /> সাবমিট করুন
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
