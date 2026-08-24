#!/usr/bin/env node
/**
 * Rebuild admin.pen auth/onboarding by cloning proven buyer screens from untitled.pen
 * and using local images/ assets (relative to admin.pen at repo root).
 */
const fs = require('fs');

const ADMIN_PATH = '/Users/samuel/twitter-backend/admin.pen';
const BUYER_PATH = '/Users/samuel/twitter-backend/untitled/untitled.pen';

const LOCAL = {
  thrift: 'images/post-media.jpg',
  shop: 'images/reel-media.jpg',
  deals: 'images/avatar-male.jpg',
  start: 'images/post-media.jpg',
  auth: 'images/reel-media.jpg',
};

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function remapIds(node, idMap = new Map()) {
  if (!node || typeof node !== 'object') return node;
  if (Array.isArray(node)) return node.map((n) => remapIds(n, idMap));
  const copy = { ...node };
  if (copy.id) {
    if (!idMap.has(copy.id)) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let nid = 'r';
      for (let i = 0; i < 5; i++) nid += chars[Math.floor(Math.random() * chars.length)];
      idMap.set(copy.id, nid);
    }
    copy.id = idMap.get(copy.id);
  }
  if (copy.children) copy.children = copy.children.map((c) => remapIds(c, idMap));
  return copy;
}

function replaceText(node, replacements) {
  if (!node) return;
  if (node.type === 'text' && node.content) {
    for (const [from, to] of replacements) {
      if (node.content.includes(from)) {
        node.content = node.content.replace(from, to);
      }
      if (node.content === from) node.content = to;
    }
  }
  (node.children || []).forEach((c) => replaceText(c, replacements));
}

function setAllImages(node, url) {
  if (!node) return;
  if (node.fill?.type === 'image') {
    node.fill.url = url;
    node.fill.enabled = true;
    node.fill.mode = 'fill';
  }
  (node.children || []).forEach((c) => setAllImages(c, url));
}

function makeFromTemplate(tpl, { name, context, x, y, heroUrl, textReplacements = [] }) {
  const s = remapIds(deepClone(tpl));
  s.name = name;
  s.context = context;
  s.x = x;
  s.y = y;
  delete s.placeholder;
  setAllImages(s, heroUrl);
  replaceText(s, textReplacements);
  return s;
}

function makeKYC(x, y) {
  return {
    type: 'frame',
    id: 'rkyc01',
    name: '00.09 — KYC verification',
    context: 'Ghana Card verification — required to sell and receive payouts.',
    x,
    y,
    width: 393,
    height: 852,
    fill: '$page',
    clip: true,
    layout: 'vertical',
    children: [
      { id: 'rkyc02', type: 'ref', ref: 'cktEy', width: 'fill_container' },
      {
        type: 'frame',
        id: 'rkyc03',
        width: 'fill_container',
        padding: [4, 20, 8, 20],
        alignItems: 'center',
        gap: 12,
        layout: 'horizontal',
        children: [
          { type: 'icon', id: 'rkyc04', icon: 'arrow-left', library: 'lucide', width: 22, height: 22, fill: '$ink' },
          {
            type: 'text',
            id: 'rkyc05',
            fill: '$ink',
            content: 'Verify your identity',
            fontFamily: '$font-ui',
            fontSize: 18,
            fontWeight: '700',
          },
        ],
      },
      {
        type: 'frame',
        id: 'rkyc06',
        width: 'fill_container',
        height: 'fill_container',
        layout: 'vertical',
        gap: 14,
        padding: [0, 20, 0, 20],
        children: [
          {
            type: 'frame',
            id: 'rkyc07',
            width: 'fill_container',
            fill: '#EEF2FF',
            cornerRadius: 14,
            padding: 14,
            layout: 'vertical',
            gap: 4,
            children: [
              {
                type: 'text',
                id: 'rkyc08',
                fill: '$brand-blue',
                content: 'Step 1 of your seller setup',
                fontFamily: '$font-ui',
                fontSize: 14,
                fontWeight: '700',
              },
              {
                type: 'text',
                id: 'rkyc09',
                fill: '$muted',
                content: 'Verify with your Ghana Card to list products and enable MoMo payouts.',
                fontFamily: '$font-ui',
                fontSize: 12,
                textGrowth: 'fixed-width',
                width: 310,
                lineHeight: 1.4,
              },
            ],
          },
          ...[
            ['Ghana Card number', 'GHA-123456789-0'],
            ['Shop location', 'Osu, Accra — market stall or shop address'],
          ].map(([label, ph], i) => ({
            type: 'frame',
            id: `rkycf${i}`,
            width: 'fill_container',
            layout: 'vertical',
            gap: 6,
            children: [
              {
                type: 'text',
                id: `rkycl${i}`,
                fill: '$ink',
                content: label,
                fontFamily: '$font-ui',
                fontSize: 13,
                fontWeight: '600',
              },
              {
                type: 'frame',
                id: `rkyci${i}`,
                width: 'fill_container',
                height: 48,
                fill: '$surface',
                cornerRadius: 12,
                stroke: '$border',
                strokeWidth: 1,
                padding: [0, 14],
                alignItems: 'center',
                layout: 'horizontal',
                children: [
                  {
                    type: 'text',
                    id: `rkycv${i}`,
                    fill: '$ink',
                    content: ph,
                    fontFamily: '$font-ui',
                    fontSize: 14,
                  },
                ],
              },
            ],
          })),
          ...['Ghana Card — front', 'Ghana Card — back'].map((label, i) => ({
            type: 'frame',
            id: `rkycu${i}`,
            width: 'fill_container',
            height: 100,
            fill: '$surface',
            cornerRadius: 14,
            stroke: '$border',
            strokeWidth: 1,
            strokeAlignment: 'inner',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 6,
            layout: 'vertical',
            children: [
              { type: 'icon', id: `rkycui${i}`, icon: 'upload', library: 'lucide', width: 24, height: 24, fill: '$muted' },
              {
                type: 'text',
                id: `rkycut${i}`,
                fill: '$muted',
                content: label,
                fontFamily: '$font-ui',
                fontSize: 13,
                fontWeight: '600',
              },
            ],
          })),
        ],
      },
      {
        type: 'frame',
        id: 'rkyc10',
        width: 'fill_container',
        padding: [12, 20, 32, 20],
        children: [
          {
            type: 'frame',
            id: 'rkyc11',
            width: 'fill_container',
            height: 52,
            fill: '$brand-blue',
            cornerRadius: 26,
            justifyContent: 'center',
            alignItems: 'center',
            children: [
              {
                type: 'text',
                id: 'rkyc12',
                fill: '#FFFFFF',
                content: 'Submit for verification',
                fontFamily: '$font-ui',
                fontSize: 16,
                fontWeight: '700',
              },
            ],
          },
        ],
      },
    ],
  };
}

const buyer = JSON.parse(fs.readFileSync(BUYER_PATH, 'utf8'));
const admin = JSON.parse(fs.readFileSync(ADMIN_PATH, 'utf8'));

const T = {
  splash: buyer.children.find((c) => c.name === '00.01 — Splash'),
  onb1: buyer.children.find((c) => c.name === '00.02 — Onboarding thrift'),
  onb2: buyer.children.find((c) => c.name === '00.03 — Onboarding shops'),
  onb3: buyer.children.find((c) => c.name === '00.04 — Onboarding deals'),
  onb4: buyer.children.find((c) => c.name === '00.05 — Onboarding start'),
  signin: buyer.children.find((c) => c.name === '07.01 — Sign in'),
  signup: buyer.children.find((c) => c.name === '07.02 — Sign up'),
  forgot: buyer.children.find((c) => c.name === '07.03 — Forgot password'),
};

for (const [k, v] of Object.entries(T)) {
  if (!v) throw new Error(`Missing buyer template: ${k}`);
}

const newAuth = [
  makeFromTemplate(T.splash, {
    name: '00.01 — Splash',
    context: 'Seller app launch.',
    x: 0,
    y: 0,
    heroUrl: LOCAL.thrift,
    textReplacements: [
      ['Thrift, reimagined for Ghana', 'The seller app for Ghana thrift'],
    ],
  }),
  makeFromTemplate(T.onb1, {
    name: '00.02 — List in minutes',
    context: 'Onboarding — list thrift fast.',
    x: 420,
    y: 0,
    heroUrl: LOCAL.thrift,
    textReplacements: [
      ["Find thrift you'll actually love", 'List your finds in minutes'],
      [
        "Vintage denim, rare sneakers, and one-of-one pieces from Ghana's best thrift shops.",
        'Snap photos, set your price in GHS, and publish to buyers hunting thrift across Ghana.',
      ],
      ["Vintage Levi's · ₵185", '₵185 avg. sale'],
      ['20% OFF', 'Fast listing'],
    ],
  }),
  makeFromTemplate(T.onb2, {
    name: '00.03 — Get paid to MoMo',
    context: 'Onboarding — MoMo payouts.',
    x: 840,
    y: 0,
    heroUrl: LOCAL.shop,
    textReplacements: [
      ['Shop curated thrift stores', 'Get paid to mobile money'],
      [
        'Discover trusted sellers with verified shops, ratings, and fast delivery across Ghana.',
        'Connect MTN, AirtelTigo, or Telecel. Paystack automatically splits each sale to your MoMo — no bank account needed.',
      ],
      ['Thrift Accra · 4.9 ★', 'Instant split payouts'],
      ['Thrift Accra', 'MTN · AirtelTigo · Telecel'],
      ['T', 'MoMo'],
      ['Verified', 'Paystack'],
    ],
  }),
  makeFromTemplate(T.onb3, {
    name: '00.04 — Reach buyers',
    context: 'Onboarding — nationwide reach.',
    x: 1260,
    y: 0,
    heroUrl: LOCAL.deals,
    textReplacements: [
      ["Deals you won't find anywhere else", 'Reach buyers across Ghana'],
      [
        'Flash sales, bundle offers, and exclusive drops from your favorite thrift sellers.',
        'From Accra to Kumasi, your shop appears where thrift lovers already browse. You source the finds — we bring the customers.',
      ],
      ['Up to 40% off today', '8 cities · nationwide delivery'],
      ['Today', '2,400+ buyers'],
    ],
  }),
  makeFromTemplate(T.onb4, {
    name: '00.05 — Start selling',
    context: 'Final onboarding CTA.',
    x: 0,
    y: 920,
    heroUrl: LOCAL.start,
    textReplacements: [
      ['2,400+ buyers across Ghana', '500+ sellers on KantaOnline'],
      ['Your thrift journey starts here', 'Your shop, your way'],
      [
        'Create a free account to save favorites, track orders, and checkout in seconds.',
        'Join sellers turning closets and market finds into income. Setup takes under 10 minutes.',
      ],
      ['Create account', 'Get started'],
      ['Already have an account? Sign in', 'Already selling? Sign in'],
    ],
  }),
  makeFromTemplate(T.signin, {
    name: '00.06 — Sign in',
    context: 'Returning seller sign in.',
    x: 420,
    y: 920,
    heroUrl: LOCAL.auth,
    textReplacements: [
      ['Sign in to shop thrift across Ghana.', 'Sign in to manage your store, orders, and payouts.'],
      ['New here? Create an account', 'New seller? Create an account'],
    ],
  }),
  makeFromTemplate(T.signup, {
    name: '00.07 — Register',
    context: 'New seller registration.',
    x: 840,
    y: 920,
    heroUrl: LOCAL.shop,
    textReplacements: [
      ['Create your account', 'Get started'],
      ['Join KantaOnline and discover thrift across Ghana.', 'Create your account and open your thrift shop today.'],
    ],
  }),
  makeFromTemplate(T.forgot, {
    name: '00.08 — Forgot password',
    context: 'Password reset.',
    x: 1260,
    y: 920,
    heroUrl: LOCAL.auth,
    textReplacements: [
      ['Forgot your password?', 'Reset password'],
      [
        "Enter the email linked to your account and we'll send a reset link.",
        "Enter your email and we'll send a link to get back into your store.",
      ],
    ],
  }),
  makeKYC(1680, 920),
];

// Remove existing 00.xx screens
admin.children = admin.children.filter((c) => !(c.type === 'frame' && c.name?.startsWith('00.')));

// Insert after status bar component
const idx = admin.children.findIndex((c) => c.id === 'cktEy');
if (idx < 0) throw new Error('Status bar component cktEy not found');
admin.children.splice(idx + 1, 0, ...newAuth);

fs.writeFileSync(ADMIN_PATH, JSON.stringify(admin, null, 2));
console.log('Rebuilt', newAuth.length, 'auth/onboarding screens from buyer templates');
console.log('Using local images:', Object.values(LOCAL).join(', '));
console.log('Screens:', newAuth.map((s) => s.name).join(', '));
