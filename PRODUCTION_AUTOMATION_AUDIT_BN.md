

## Addendum — bounded AI retry verification

### Commit `bda000e`

AI Gateway নিজেই provider failover করায় newsroom route-এর redundant transient retry সরানো হয়েছে। Rewrite timeout 24 seconds, output cap 700 tokens, এবং retry list empty করা হয়েছে। এতে একটি failed AI call-এর জন্য একই Vercel window-এ বারবার request পাঠিয়ে deadline নষ্ট হয় না। TypeScript validation pass এবং Vercel deployment READY।

### Request 104 (controlled test requested as 103)

Supabase request counter অনুযায়ী test ID `104` হয়েছে।

- HTTP 200
- Pipeline status: `success`
- Duration: 7.1 seconds
- `published=0`
- `pending_review=3`
- `failed=0`
- `priority_candidates_selected=1`
- `priority_candidate_target_percent=70`
- Current skip reasons: `source_fetch_failed`, `no_publishable_item`, `batch_limit`
- Social rows: 0, কারণ কোনো article publish হয়নি

**Interpretation:** AI timeout blocker এই run-এ আর দেখা যায়নি; এখন remaining blocker হলো selected RSS source page fetch failure। Fail-closed publish gate কার্যকর আছে।
