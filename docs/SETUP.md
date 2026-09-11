# বাংলার ভয়েস — সেটআপ গাইড

## প্রজেক্ট স্ট্রাকচার

    Banglarvoice-apps/
    ├── frontend/              # Next.js 14 ওয়েব অ্যাপ
    ├── mobile_monorepo/       # Flutter অ্যাপস (৫টি)
    ├── worker/                # AI পাইপলাইন ওয়ার্কার
    ├── backend/               # PocketBase (Go binary)
    ├── supabase/              # Supabase (Edge Functions + Migrations)
    ├── docs/                  # ডকুমেন্টেশন
    └── .github/workflows/     # CI/CD

## Prerequisites

- Node.js 20+
- Flutter 3.24+ (মোবাইল ডেভেলপমেন্টের জন্য)
- Docker (ব্যাকএন্ড ও ওয়ার্কার ডিপ্লয়ের জন্য)
- Supabase CLI (optional)

## Frontend সেটআপ

    cd frontend
    cp .env.example .env.local
    # .env.local-এ মান বসাও
    npm install --legacy-peer-deps
    npm run dev
    # http://localhost:3000

### Vercel Deploy

1. Vercel-এ প্রজেক্ট ইমপোর্ট করো
2. Root Directory: frontend
3. Framework: Next.js (অটো-ডিটেক্ট)
4. Environment Variables সেট করো (.env.example দেখো)
5. Deploy

## Worker সেটআপ

    cd worker
    cp .env.example .env
    # .env-এ মান বসাও
    npm install
    npm run dev

### Railway Deploy

1. railway.app > New Project > Deploy from GitHub
2. Root Directory: worker
3. Environment variables সেট করো
4. অটো-ডিপ্লয়

## ব্যাকএন্ড (PocketBase)

    cd backend
    docker build -t bv-backend .
    docker run -p 8090:8090 bv-backend

## মোবাইল অ্যাপ

    cd mobile_monorepo/apps/reader_app
    flutter pub get
    flutter run

### APK বিল্ড (লোকাল)

    flutter build apk --release

### APK বিল্ড (CI)

main ব্রাঞ্চে পুশ করলে GitHub Actions অটোমেটিক বিল্ড করে।
Artifacts ডাউনলোড করা যায় Actions ট্যাব থেকে।

## GitHub Secrets

| Secret | কাজ |
|--------|-----|
| ANDROID_KEYSTORE_BASE64 | Base64-encoded keystore |
| KEYSTORE_PASSWORD | Keystore পাসওয়ার্ড |
| KEY_ALIAS | Key alias |
| KEY_PASSWORD | Key পাসওয়ার্ড |
| VPS_HOST | VPS IP/hostname |
| VPS_USER | SSH ইউজার |
| VPS_SSH_KEY | SSH প্রাইভেট কী |

## গুরুত্বপূর্ণ নিয়ম

- কেস্টোর ফাইল কখনো কমিট করবে না
- .env ফাইল কখনো কমিট করবে না
- সব সিক্রেট GitHub Secrets-এ রাখো
- *.bak ফাইল কমিট হবে না (.gitignore-এ আছে)
