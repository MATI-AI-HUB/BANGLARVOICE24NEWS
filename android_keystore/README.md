# Banglar Voice — Release Signing

> ⚠️ **জরুরি:** পুরনো `banglarvoice-release.jks` এর পাসওয়ার্ড অজানা / সিক্রেট চুরি হয়েছে — এটি **সোর্স রিলিজে অন্তর্ভুক্ত করা হয়নি** (নিরাপত্তার কারণে সরানো হয়েছে)। প্রকাশ্যে রিলিজ APK সাইন করার আগে **নতুন keystore জেনারেট করে নিন**।

## নতুন keystore তৈরি (একবারই)
```bash
# ১. রুটে (সিকিউর লোকাল মেশিনে):
keytool -genkeypair -v \
  -keystore banglar-voice-release.jks \
  -alias banglarvoice \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass "একটি-শক্তিশালী-পাসওয়ার্ড" -keypass "একটি-শক্তিশালী-পাসওয়ার্ড" \
  -dname "CN=Banglar Voice, OU=Mobile, O=Banglar Voice, L=Dhaka, ST=Dhaka, C=BD"

# ২. প্রতিটি Flutter অ্যাপে কপি করুন (৪টি):
#   mobile_monorepo/apps/{reader,admin,reporter,tv}_app/android/app/keystore/banglar-voice-release.jks

# ৩. প্রতিটি অ্যাপে android/key.properties তৈরি করুন (android_keystore/key.properties.template থেকে):
storePassword=...
keyPassword=...
keyAlias=banglarvoice
storeFile=app/keystore/banglar-voice-release.jks

# ৪. (ঐচ্ছিক) GitHub Actions-এ সাইন করতে চাইলে secrets-এ দিন:
#   ANDROID_KEYSTORE_BASE64 -> base64 -w0 banglar-voice-release.jks
#   KEYSTORE_PASSWORD, KEY_PASSWORD, KEY_ALIAS
#   The repository workflows also accept the legacy BANGLARVOICE_* names,
#   but the canonical names above should be used for one consistent setup.
```

## মনে রাখবেন
- **keystore হারালে বা পাসওয়ার্ড ভুলে গেলে আপডেট সাইন করা অসম্ভব** — Google Play-তে একই keystore দিয়ে আপডেট দিতে হয়। ব্যাকআপ রাখুন, কখনো commit করবেন না।
- `key.properties` / `*.jks` কখনোই Git-এ commit করবেন না (`.gitignore`-এ রাখুন)।
- GitHub Actions-এ `Verify Release Signing Configuration` workflow চালিয়ে
  keystore, alias এবং password combination যাচাই করুন; এটি কোনো secret value
  log করে না।
- এই জিপে থাকা `.jks` ফাইলগুলো মুছে ফেলা হয়েছে — পুরনো keystore কোনো দাপ্তরিক সোর্সে সংরক্ষিত থাকলে সেটি ব্যবহার করা যাবে, নাহলে উপরের ধাপ অনুসরণ করুন।
