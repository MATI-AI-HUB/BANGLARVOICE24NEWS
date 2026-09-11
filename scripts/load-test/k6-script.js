// scripts/load-test/k6-script.js
// Load Testing Script for Banglar Voice
// Usage: k6 run scripts/load-test/k6-script.js

import http from 'k6/http';
import { check, sleep } from 'k6';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.1.0.js';

// Test Configuration
export const options = {
  stages: [
    { duration: '1m', target: 100 },   // Ramp up to 100 users
    { duration: '2m', target: 1000 },  // Ramp up to 1000 users
    { duration: '5m', target: 5000 },  // Ramp up to 5000 users
    { duration: '2m', target: 10000 }, // Spike to 10k users
    { duration: '1m', target: 0 },     // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests must be below 2000ms
    http_req_failed: ['rate<0.01'],    // Error rate must be less than 1%
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://banglarvoice24news.com';

export default function () {
  // 1. Test Homepage
  const homepageRes = http.get(`${BASE_URL}/`, {
    tags: { name: 'Homepage' },
  });

  check(homepageRes, {
    'homepage status is 200': (r) => r.status === 200,
    'homepage load time < 2s': (r) => r.timings.duration < 2000,
  });

  sleep(1); // Wait 1 second between requests

  // 2. Test Article Page (Simulating reading content)
  // Note: In production, you might want to fetch a real ID dynamically
  const articleId = 'test-article-id'; 
  const articleRes = http.get(`${BASE_URL}/article/${articleId}`, {
    tags: { name: 'Article Page' },
  });

  check(articleRes, {
    'article status is 200': (r) => r.status === 200,
    'article load time < 3s': (r) => r.timings.duration < 3000,
  });

  sleep(2); // Simulate reading time
}
