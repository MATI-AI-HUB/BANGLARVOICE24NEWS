#!/usr/bin/env bash
# Termux-safe signing bootstrap. Uses keytool (present). Creates git-ignored files.
set -euo pipefail
REPO="${1:-mobile_monorepo}"
APPS=(admin_app reader_app reporter_app studio_app tv_app)
KD="$REPO/keystores"; mkdir -p "$KD"
touch .gitignore
grep -qxF "mobile_monorepo/keystores/" .gitignore || printf '\n# Android signing secrets\nmobile_monorepo/keystores/\n*.jks\n*.keystore\n' >> .gitignore
echo "=== BanglarVoice signing setup (Termux) ==="
for app in "${APPS[@]}"; do
  echo "=== $app ==="
  ks="$KD/${app}-release.jks"; kp="$REPO/apps/$app/android/key.properties"
  mkdir -p "$(dirname "$kp")"
  if [ ! -f "$ks" ]; then
    read -r -p "Generate NEW keystore for $app? [y/N]: " gen
    [[ ! "$gen" =~ ^[Yy]$ ]] && { echo "skip (place $ks & rerun)"; echo; continue; }
    read -s -r -p "Store password: " sp; echo
    read -s -r -p "Key password (blank=store): " kp2; echo; [ -z "$kp2" ] && kp2="$sp"
    read -r -p "Alias [$app]: " al; [ -z "$al" ] && al="$app"
    read -r -p "DN [CN=BanglarVoice $app, OU=Mobile, O=BanglarVoice, L=Dhaka, ST=Dhaka, C=BD]: " dn
    [ -z "$dn" ] && dn="CN=BanglarVoice $app, OU=Mobile, O=BanglarVoice, L=Dhaka, ST=Dhaka, C=BD"
    keytool -genkeypair -v -keystore "$ks" -alias "$al" -keyalg RSA -keysize 2048 -validity 10000 -storepass "$sp" -keypass "$kp2" -dname "$dn"
  else
    read -s -r -p "Store password: " sp; echo
    read -s -r -p "Key password (blank=store): " kp2; echo; [ -z "$kp2" ] && kp2="$sp"
    read -r -p "Alias [$app]: " al; [ -z "$al" ] && al="$app"
  fi
  printf '# Local signing (git-ignored). DO NOT COMMIT.\nstoreFile=%s/%s-release.jks\nkeyAlias=%s\nkeyPassword=%s\nstorePassword=%s\n' "$(cd "$KD" && pwd)" "$app" "$al" "$kp2" "$sp" > "$kp"
  chmod 600 "$kp" "$ks"; echo "Wrote: $kp"; echo
done
echo "=== Done. Keystore backup: $KD/*.jks (save these OFF-DEVICE!) ==="
