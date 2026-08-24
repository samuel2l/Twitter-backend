#!/usr/bin/env node
/**
 * Updates admin.pen: seller onboarding, auth hero sheets, payment setup, onboarding checklist.
 * Run when Pencil MCP is unavailable.
 */
const fs = require('fs');
const path = '/Users/samuel/twitter-backend/admin.pen';

let seq = 0;
function id(prefix = '') {
  seq += 1;
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let s = prefix;
  for (let i = 0; i < 5; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s + seq;
}

const SHEET_SHADOW = {
  type: 'shadow',
  shadowType: 'outer',
  color: '#00000044',
  offset: { x: 0, y: -12 },
  blur: 40,
};

const HERO_SCRIM = {
  type: 'gradient',
  gradientType: 'linear',
  enabled: true,
  rotation: 180,
  size: { height: 1 },
  colors: [
    { color: '#00000000', position: 0 },
    { color: '#00000066', position: 0.45 },
    { color: '#000000DD', position: 1 },
  ],
};

const AUTH_SCRIM = {
  type: 'gradient',
  gradientType: 'linear',
  enabled: true,
  rotation: 180,
  size: { height: 1 },
  colors: [
    { color: '#00000000', position: 0 },
    { color: '#00000088', position: 0.5 },
    { color: '#000000DD', position: 1 },
  ],
};

function text(content, opts = {}) {
  return {
    type: 'text',
    id: id('t'),
    fill: opts.fill || '$ink',
    content,
    fontFamily: '$font-ui',
    fontSize: opts.fontSize || 14,
    fontWeight: opts.fontWeight || 'normal',
    ...opts.extra,
  };
}

function sheetHandle() {
  return {
    type: 'frame',
    id: id('f'),
    name: 'Sheet handle row',
    width: 'fill_container',
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    children: [
      {
        type: 'frame',
        id: id('f'),
        name: 'Sheet handle',
        width: 40,
        height: 4,
        fill: '#D1D5DB',
        cornerRadius: 2,
      },
    ],
  };
}

function pageDots(active, total = 4) {
  const dots = [];
  for (let i = 0; i < total; i++) {
    const on = i === active;
    dots.push({
      type: 'frame',
      id: id('d'),
      width: on ? 8 : 6,
      height: on ? 8 : 6,
      cornerRadius: 4,
      fill: on ? '$brand-blue' : '$border',
    });
  }
  return {
    type: 'frame',
    id: id('f'),
    name: 'Page dots',
    gap: 6,
    padding: [4, 0, 0, 0],
    layout: 'horizontal',
    children: dots,
  };
}

function inputField(label, placeholder, opts = {}) {
  return {
    type: 'frame',
    id: id('f'),
    name: 'Form field',
    width: 'fill_container',
    layout: 'vertical',
    gap: 6,
    children: [
      text(label, { fontSize: 13, fontWeight: '600' }),
      {
        type: 'frame',
        id: id('f'),
        width: 'fill_container',
        height: opts.height || 48,
        fill: opts.fill || '$page',
        cornerRadius: 14,
        stroke: '$border',
        strokeWidth: 1,
        padding: opts.multiline ? [12, 14] : [0, 14],
        alignItems: opts.multiline ? 'start' : 'center',
        children: [
          text(placeholder, {
            fill: opts.muted ? '$muted' : '$ink',
            fontSize: 14,
            fontWeight: '500',
          }),
        ],
      },
    ],
  };
}

function primaryBtn(label, black = false) {
  return {
    type: 'frame',
    id: id('f'),
    name: 'Primary button',
    width: 'fill_container',
    height: 52,
    fill: black ? '$brand-black' : '$brand-blue',
    cornerRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    children: [text(label, { fill: '#FFFFFF', fontSize: 16, fontWeight: '700' })],
  };
}

function makeOnboardingSlide({
  name,
  context,
  x,
  y,
  heroUrl,
  floatingTag,
  floatingPill,
  title,
  body,
  dotIndex,
  ctaText = 'Continue',
  showSkip = true,
  totalDots = 4,
}) {
  const children = [
    {
      type: 'frame',
      id: id('f'),
      x: 0,
      y: 0,
      name: 'Hero photo',
      width: 393,
      height: 852,
      fill: { type: 'image', enabled: true, url: heroUrl, mode: 'fill' },
    },
    {
      type: 'frame',
      id: id('f'),
      x: 0,
      y: 360,
      name: 'Hero scrim',
      width: 393,
      height: 492,
      fill: HERO_SCRIM,
    },
  ];

  if (showSkip) {
    children.push({
      type: 'frame',
      id: id('f'),
      x: 280,
      y: 56,
      name: 'Skip button',
      fill: '#FFFFFF26',
      cornerRadius: 22,
      padding: [10, 18],
      justifyContent: 'center',
      children: [text('Skip', { fill: '#FFFFFF', fontSize: 13, fontWeight: '600' })],
    });
  }

  if (floatingTag) {
    children.push({
      type: 'frame',
      id: id('f'),
      x: 24,
      y: 340,
      name: 'Floating tag',
      width: 250,
      fill: '#FFFFFF',
      cornerRadius: 18,
      effect: {
        type: 'shadow',
        shadowType: 'outer',
        color: '#00000035',
        offset: { x: 0, y: 6 },
        blur: 20,
      },
      padding: [10, 14],
      justifyContent: 'center',
      children: [
        text(floatingTag, {
          fill: '$ink',
          fontSize: 13,
          fontWeight: '700',
          extra: { textGrowth: 'fixed-width', width: 222, lineHeight: 1.25 },
        }),
      ],
    });
  }

  if (floatingPill) {
    children.push({
      type: 'frame',
      id: id('f'),
      x: 270,
      y: 375,
      name: 'Floating pill',
      fill: '$brand-blue',
      cornerRadius: 18,
      effect: {
        type: 'shadow',
        shadowType: 'outer',
        color: '#00000035',
        offset: { x: 0, y: 6 },
        blur: 20,
      },
      padding: [10, 14],
      justifyContent: 'center',
      children: [
        text(floatingPill, {
          fill: '#FFFFFF',
          fontSize: 13,
          fontWeight: '700',
          extra: { textGrowth: 'fixed-width', width: 80, lineHeight: 1.25 },
        }),
      ],
    });
  }

  children.push({
    type: 'frame',
    id: id('f'),
    x: 16,
    y: 454,
    name: 'Onboarding sheet',
    width: 361,
    height: 382,
    fill: '$surface',
    cornerRadius: 32,
    effect: SHEET_SHADOW,
    layout: 'vertical',
    padding: [12, 24, 28, 24],
    children: [
      sheetHandle(),
      {
        type: 'frame',
        id: id('f'),
        name: 'Sheet body',
        width: 'fill_container',
        height: 'fill_container',
        layout: 'vertical',
        gap: 12,
        children: [
          text(title, { fontSize: 24, fontWeight: '900' }),
          text(body, {
            fill: '$muted',
            fontSize: 14,
            fontWeight: '500',
            extra: { textGrowth: 'fixed-width', width: 313, lineHeight: 1.45 },
          }),
          pageDots(dotIndex, totalDots),
        ],
      },
      {
        type: 'frame',
        id: id('f'),
        name: 'CTA wrap',
        width: 'fill_container',
        layout: 'vertical',
        gap: 12,
        padding: [8, 0, 0, 0],
        children: [primaryBtn(ctaText, dotIndex === totalDots - 1)],
      },
    ],
  });

  return {
    type: 'frame',
    id: id('s'),
    name,
    context,
    x,
    y,
    width: 393,
    height: 852,
    fill: '#0A0A0A',
    clip: true,
    layout: 'none',
    children,
  };
}

function makeAuthScreen({
  name,
  context,
  x,
  y,
  heroUrl,
  kicker,
  title,
  subtitle,
  fields,
  cta,
  footer,
  sheetHeight = 480,
  sheetY = 360,
}) {
  return {
    type: 'frame',
    id: id('s'),
    name,
    context,
    x,
    y,
    width: 393,
    height: 852,
    fill: '#0A0A0A',
    clip: true,
    layout: 'none',
    children: [
      {
        type: 'frame',
        id: id('f'),
        x: 0,
        y: 0,
        name: 'Auth hero photo',
        width: 393,
        height: 852,
        fill: { type: 'image', enabled: true, url: heroUrl, mode: 'fill' },
      },
      {
        type: 'frame',
        id: id('f'),
        x: 0,
        y: sheetY - 60,
        name: 'Auth hero scrim',
        width: 393,
        height: 852 - sheetY + 60,
        fill: AUTH_SCRIM,
      },
      {
        type: 'frame',
        id: id('f'),
        x: 16,
        y: sheetY,
        name: 'Auth sheet',
        width: 361,
        height: sheetHeight,
        fill: '$surface',
        cornerRadius: 32,
        effect: SHEET_SHADOW,
        layout: 'vertical',
        padding: [12, 24, 28, 24],
        children: [
          sheetHandle(),
          {
            type: 'frame',
            id: id('f'),
            name: 'Auth sheet body',
            width: 'fill_container',
            height: 'fill_container',
            layout: 'vertical',
            gap: 14,
            children: [
              text(kicker, {
                fill: '$brand-blue',
                fontSize: 12,
                fontWeight: '800',
                extra: { letterSpacing: 2 },
              }),
              text(title, { fontSize: 26, fontWeight: '900' }),
              text(subtitle, {
                fill: '$muted',
                fontSize: 14,
                fontWeight: '500',
                extra: { textGrowth: 'fixed-width', width: 313, lineHeight: 1.45 },
              }),
              ...fields,
            ],
          },
          {
            type: 'frame',
            id: id('f'),
            name: 'Auth CTA wrap',
            width: 'fill_container',
            layout: 'vertical',
            gap: 10,
            children: [
              primaryBtn(cta),
              ...(footer
                ? [
                    text(footer, {
                      fill: '$muted',
                      fontSize: 13,
                      fontWeight: '600',
                      extra: { textAlign: 'center', textGrowth: 'fixed-width', width: 313 },
                    }),
                  ]
                : []),
            ],
          },
        ],
      },
    ],
  };
}

function makeSplash() {
  return {
    type: 'frame',
    id: id('s'),
    x: 0,
    y: 0,
    name: '00.01 — Splash',
    context: 'Seller app launch — brand moment.',
    clip: true,
    width: 393,
    height: 852,
    fill: '$brand-black',
    layout: 'vertical',
    justifyContent: 'center',
    alignItems: 'center',
    children: [
      {
        type: 'frame',
        id: id('f'),
        name: 'Splash logo stack',
        layout: 'vertical',
        gap: 10,
        alignItems: 'center',
        children: [
          text('KANTA', {
            fill: '#FFFFFF',
            fontSize: 42,
            fontWeight: '900',
            extra: { letterSpacing: 3 },
          }),
          text('ONLINE', {
            fill: '$brand-blue',
            fontSize: 42,
            fontWeight: '900',
            extra: { letterSpacing: 3 },
          }),
          {
            type: 'frame',
            id: id('f'),
            name: 'Splash accent line',
            width: 56,
            height: 4,
            fill: '$brand-blue',
            cornerRadius: 2,
          },
          text('Sell thrift. Get paid.', {
            fill: '#FFFFFF99',
            fontSize: 14,
            fontWeight: '500',
          }),
          text('For sellers across Ghana', {
            fill: '#FFFFFF66',
            fontSize: 12,
            fontWeight: '500',
          }),
        ],
      },
    ],
  };
}

function makeKYC(x, y) {
  return {
    type: 'frame',
    id: id('s'),
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
      { id: id('r'), type: 'ref', ref: 'cktEy', width: 'fill_container' },
      {
        type: 'frame',
        id: id('f'),
        width: 'fill_container',
        padding: [4, 20, 8, 20],
        alignItems: 'center',
        gap: 12,
        layout: 'horizontal',
        children: [
          { type: 'icon', id: id('i'), icon: 'arrow-left', library: 'lucide', width: 22, height: 22, fill: '$ink' },
          text('Verify your identity', { fontSize: 18, fontWeight: '700' }),
        ],
      },
      {
        type: 'frame',
        id: id('f'),
        width: 'fill_container',
        height: 'fill_container',
        layout: 'vertical',
        gap: 14,
        padding: [0, 20, 0, 20],
        children: [
          {
            type: 'frame',
            id: id('f'),
            width: 'fill_container',
            fill: '#EEF2FF',
            cornerRadius: 14,
            padding: 14,
            layout: 'vertical',
            gap: 4,
            children: [
              text('Step 1 of your seller setup', { fill: '$brand-blue', fontSize: 14, fontWeight: '700' }),
              text('Verify with your Ghana Card to list products and enable MoMo payouts.', {
                fill: '$muted',
                fontSize: 12,
                extra: { textGrowth: 'fixed-width', width: 310, lineHeight: 1.4 },
              }),
            ],
          },
          inputField('Ghana Card number', 'GHA-123456789-0'),
          inputField('Shop location', 'Osu, Accra — e.g. market stall or shop address'),
          ...['Ghana Card — front', 'Ghana Card — back'].map((label) => ({
            type: 'frame',
            id: id('f'),
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
              { type: 'icon', id: id('i'), icon: 'upload', library: 'lucide', width: 24, height: 24, fill: '$muted' },
              text(label, { fill: '$muted', fontSize: 13, fontWeight: '600' }),
            ],
          })),
        ],
      },
      {
        type: 'frame',
        id: id('f'),
        width: 'fill_container',
        padding: [12, 20, 32, 20],
        children: [primaryBtn('Submit for verification')],
      },
    ],
  };
}

function makePaymentSetup(x, y) {
  const providers = [
    { label: 'MTN Mobile Money', on: true },
    { label: 'AirtelTigo Money', on: false },
    { label: 'Telecel Cash', on: false },
  ];

  return {
    type: 'frame',
    id: id('s'),
    name: '04.15 — Payment setup',
    context: 'Paystack MoMo payout — business name, provider, number.',
    x,
    y,
    width: 393,
    height: 852,
    fill: '$page',
    clip: true,
    layout: 'vertical',
    children: [
      { id: id('r'), type: 'ref', ref: 'cktEy', width: 'fill_container' },
      {
        type: 'frame',
        id: id('f'),
        width: 'fill_container',
        padding: [4, 20, 8, 20],
        alignItems: 'center',
        gap: 12,
        layout: 'horizontal',
        children: [
          { type: 'icon', id: id('i'), icon: 'arrow-left', library: 'lucide', width: 22, height: 22, fill: '$ink' },
          {
            type: 'frame',
            id: id('f'),
            layout: 'vertical',
            gap: 2,
            children: [
              text('Payment Methods', { fontSize: 18, fontWeight: '700' }),
              text('Store Settings', { fill: '$muted', fontSize: 11, fontWeight: '600' }),
            ],
          },
        ],
      },
      {
        type: 'frame',
        id: id('f'),
        width: 'fill_container',
        height: 'fill_container',
        layout: 'vertical',
        gap: 12,
        padding: [0, 20, 0, 20],
        children: [
          {
            type: 'frame',
            id: id('f'),
            width: 'fill_container',
            fill: '$surface',
            cornerRadius: 16,
            stroke: '$border',
            strokeWidth: 1,
            padding: 16,
            layout: 'vertical',
            gap: 12,
            children: [
              {
                type: 'frame',
                id: id('f'),
                width: 'fill_container',
                justifyContent: 'space_between',
                alignItems: 'center',
                layout: 'horizontal',
                children: [
                  {
                    type: 'frame',
                    id: id('f'),
                    gap: 10,
                    alignItems: 'center',
                    layout: 'horizontal',
                    children: [
                      {
                        type: 'frame',
                        id: id('f'),
                        width: 40,
                        height: 40,
                        fill: '#EEF2FF',
                        cornerRadius: 12,
                        justifyContent: 'center',
                        alignItems: 'center',
                        children: [
                          {
                            type: 'icon',
                            id: id('i'),
                            icon: 'credit-card',
                            library: 'lucide',
                            width: 18,
                            height: 18,
                            fill: '$brand-blue',
                          },
                        ],
                      },
                      {
                        type: 'frame',
                        id: id('f'),
                        layout: 'vertical',
                        gap: 2,
                        children: [
                          text('Seller payout account', { fontSize: 15, fontWeight: '700' }),
                          text('Paystack splits sales to your MoMo', {
                            fill: '$muted',
                            fontSize: 12,
                            extra: { textGrowth: 'fixed-width', width: 220, lineHeight: 1.35 },
                          }),
                        ],
                      },
                    ],
                  },
                  {
                    type: 'frame',
                    id: id('f'),
                    fill: '#ECFDF5',
                    cornerRadius: 20,
                    padding: [4, 10],
                    children: [text('Active', { fill: '$green', fontSize: 11, fontWeight: '700' })],
                  },
                ],
              },
              inputField('Business name', 'Thrift Accra', { fill: '$surface' }),
              {
                type: 'frame',
                id: id('f'),
                width: 'fill_container',
                layout: 'vertical',
                gap: 8,
                children: [
                  text('Mobile money provider', { fontSize: 13, fontWeight: '600' }),
                  ...providers.map((p) => ({
                    type: 'frame',
                    id: id('f'),
                    width: 'fill_container',
                    height: 48,
                    fill: p.on ? '#EEF2FF' : '$surface',
                    cornerRadius: 12,
                    stroke: p.on ? '$brand-blue' : '$border',
                    strokeWidth: 1,
                    padding: [0, 14],
                    alignItems: 'center',
                    layout: 'horizontal',
                    children: [
                      text(p.label, {
                        fontSize: 14,
                        fontWeight: p.on ? '700' : '500',
                        fill: p.on ? '$brand-blue' : '$ink',
                      }),
                    ],
                  })),
                ],
              },
              inputField('Mobile money number', '0241234567', { fill: '$surface' }),
            ],
          },
          {
            type: 'frame',
            id: id('f'),
            width: 'fill_container',
            fill: '#EEF2FF',
            cornerRadius: 14,
            padding: 14,
            children: [
              text('Customers pay via Paystack checkout. This only sets where your seller payout split is sent.', {
                fill: '$brand-blue',
                fontSize: 12,
                fontWeight: '500',
                extra: { textGrowth: 'fixed-width', width: 310, lineHeight: 1.45 },
              }),
            ],
          },
        ],
      },
      {
        type: 'frame',
        id: id('f'),
        width: 'fill_container',
        padding: [12, 20, 32, 20],
        gap: 8,
        layout: 'horizontal',
        children: [
          {
            type: 'frame',
            id: id('f'),
            width: 'fill_container',
            height: 48,
            fill: '$surface',
            cornerRadius: 24,
            stroke: '$border',
            strokeWidth: 1,
            justifyContent: 'center',
            alignItems: 'center',
            children: [text('Cancel', { fontSize: 14, fontWeight: '600' })],
          },
          primaryBtn('Save payout setup'),
        ],
      },
    ],
  };
}

function makeOnboardingChecklist(x, y) {
  const steps = [
    { title: 'Complete verification', desc: 'Ghana Card review in progress', done: true, locked: false },
    { title: 'Customize your store', desc: 'Add logo, name & description', done: true, locked: false },
    { title: 'Add your first product', desc: 'List items from your catalog', done: false, locked: false },
    { title: 'Set up payment methods', desc: 'MoMo payout via Paystack', done: false, locked: false },
    { title: 'Publish your store', desc: 'Go live when all steps are done', done: false, locked: true },
  ];

  return {
    type: 'frame',
    id: id('s'),
    name: '01.02 — Setup checklist',
    context: 'Welcome modal — 5-step seller launch checklist.',
    x,
    y,
    width: 393,
    height: 852,
    fill: '#00000088',
    clip: true,
    layout: 'vertical',
    justifyContent: 'end',
    children: [
      {
        type: 'frame',
        id: id('f'),
        width: 'fill_container',
        fill: '$surface',
        cornerRadius: 32,
        layout: 'vertical',
        padding: [20, 20, 32, 20],
        gap: 14,
        children: [
          {
            type: 'frame',
            id: id('f'),
            width: 'fill_container',
            justifyContent: 'space_between',
            alignItems: 'center',
            layout: 'horizontal',
            children: [
              {
                type: 'frame',
                id: id('f'),
                layout: 'vertical',
                gap: 4,
                children: [
                  text('Welcome to KantaOnline!', { fontSize: 20, fontWeight: '900' }),
                  text("Let's get your store set up", { fill: '$muted', fontSize: 13 }),
                ],
              },
              { type: 'icon', id: id('i'), icon: 'x', library: 'lucide', width: 22, height: 22, fill: '$muted' },
            ],
          },
          {
            type: 'frame',
            id: id('f'),
            width: 'fill_container',
            layout: 'vertical',
            gap: 6,
            children: [
              {
                type: 'frame',
                id: id('f'),
                width: 'fill_container',
                justifyContent: 'space_between',
                layout: 'horizontal',
                children: [
                  text('Setup progress', { fill: '$muted', fontSize: 12, fontWeight: '600' }),
                  text('2 of 5 completed', { fontSize: 12, fontWeight: '700' }),
                ],
              },
              {
                type: 'frame',
                id: id('f'),
                width: 'fill_container',
                height: 8,
                fill: '$border',
                cornerRadius: 4,
                layout: 'none',
                children: [
                  {
                    type: 'frame',
                    id: id('f'),
                    x: 0,
                    y: 0,
                    width: 140,
                    height: 8,
                    fill: '$brand-blue',
                    cornerRadius: 4,
                  },
                ],
              },
            ],
          },
          ...steps.map((step, index) => ({
            type: 'frame',
            id: id('f'),
            width: 'fill_container',
            fill: step.done ? '#ECFDF5' : step.locked ? '#F9FAFB' : '#F9FAFB',
            cornerRadius: 14,
            stroke: step.done ? '#BBF7D0' : '$border',
            strokeWidth: 1,
            padding: 12,
            gap: 10,
            alignItems: 'start',
            layout: 'horizontal',
            children: [
              {
                type: 'frame',
                id: id('f'),
                width: 32,
                height: 32,
                cornerRadius: 16,
                fill: step.done ? '$green' : step.locked ? '$border' : '#D1D5DB',
                justifyContent: 'center',
                alignItems: 'center',
                children: step.done
                  ? [{ type: 'icon', id: id('i'), icon: 'check', library: 'lucide', width: 16, height: 16, fill: '#FFFFFF' }]
                  : step.locked
                    ? [{ type: 'icon', id: id('i'), icon: 'lock', library: 'lucide', width: 14, height: 14, fill: '$muted' }]
                    : [text(String(index + 1), { fill: '$ink', fontSize: 13, fontWeight: '700' })],
              },
              {
                type: 'frame',
                id: id('f'),
                width: 'fill_container',
                layout: 'vertical',
                gap: 2,
                children: [
                  text(step.title, { fontSize: 14, fontWeight: '700', fill: step.locked ? '$muted' : '$ink' }),
                  text(step.desc, { fill: '$muted', fontSize: 12 }),
                ],
              },
              !step.done && !step.locked
                ? text('Go →', { fill: '$brand-blue', fontSize: 12, fontWeight: '700' })
                : { type: 'frame', id: id('f'), width: 1, height: 1 },
            ],
          })),
          primaryBtn('Add your first product'),
        ],
      },
    ],
  };
}

function makeStoreCreateFirst(x, y) {
  return {
    type: 'frame',
    id: id('s'),
    name: '04.16 — Create store first',
    context: 'Payment gate — create store before MoMo setup.',
    x,
    y,
    width: 393,
    height: 852,
    fill: '$page',
    clip: true,
    layout: 'vertical',
    children: [
      { id: id('r'), type: 'ref', ref: 'cktEy', width: 'fill_container' },
      {
        type: 'frame',
        id: id('f'),
        width: 'fill_container',
        padding: [4, 20, 8, 20],
        alignItems: 'center',
        gap: 12,
        layout: 'horizontal',
        children: [
          { type: 'icon', id: id('i'), icon: 'arrow-left', library: 'lucide', width: 22, height: 22, fill: '$ink' },
          text('Payment Methods', { fontSize: 18, fontWeight: '700' }),
        ],
      },
      {
        type: 'frame',
        id: id('f'),
        width: 'fill_container',
        height: 'fill_container',
        justifyContent: 'center',
        alignItems: 'center',
        layout: 'vertical',
        gap: 16,
        padding: [0, 40],
        children: [
          {
            type: 'frame',
            id: id('f'),
            width: 64,
            height: 64,
            fill: '#EEF2FF',
            cornerRadius: 32,
            justifyContent: 'center',
            alignItems: 'center',
            children: [
              { type: 'icon', id: id('i'), icon: 'store', library: 'lucide', width: 28, height: 28, fill: '$brand-blue' },
            ],
          },
          text('Create your store first', { fontSize: 20, fontWeight: '800', extra: { textAlign: 'center' } }),
          text('Payout setup is attached to your store. Add your shop profile, then connect mobile money.', {
            fill: '$muted',
            fontSize: 14,
            extra: { textAlign: 'center', textGrowth: 'fixed-width', width: 300, lineHeight: 1.4 },
          }),
          primaryBtn('Create store'),
        ],
      },
    ],
  };
}

function makeThemeSettings(x, y) {
  const colors = ['#4A69E2', '#050505', '#F5F5F5', '#111111'];
  return {
    type: 'frame',
    id: id('s'),
    name: '04.17 — Store theme',
    context: 'Branding — logo, colors, tagline.',
    x,
    y,
    width: 393,
    height: 852,
    fill: '$page',
    clip: true,
    layout: 'vertical',
    children: [
      { id: id('r'), type: 'ref', ref: 'cktEy', width: 'fill_container' },
      {
        type: 'frame',
        id: id('f'),
        width: 'fill_container',
        padding: [4, 20, 8, 20],
        alignItems: 'center',
        gap: 12,
        layout: 'horizontal',
        children: [
          { type: 'icon', id: id('i'), icon: 'arrow-left', library: 'lucide', width: 22, height: 22, fill: '$ink' },
          text('Store theme', { fontSize: 18, fontWeight: '700' }),
        ],
      },
      {
        type: 'frame',
        id: id('f'),
        width: 'fill_container',
        height: 'fill_container',
        layout: 'vertical',
        gap: 12,
        padding: [0, 20, 0, 20],
        children: [
          {
            type: 'frame',
            id: id('f'),
            width: 'fill_container',
            height: 120,
            fill: '$surface',
            cornerRadius: 14,
            stroke: '$border',
            strokeWidth: 1,
            justifyContent: 'center',
            alignItems: 'center',
            gap: 6,
            layout: 'vertical',
            children: [
              { type: 'icon', id: id('i'), icon: 'upload', library: 'lucide', width: 24, height: 24, fill: '$muted' },
              text('Store logo', { fill: '$muted', fontSize: 13, fontWeight: '600' }),
            ],
          },
          inputField('Display name', 'Thrift Accra'),
          inputField('Tagline', 'Curated vintage from Accra'),
          {
            type: 'frame',
            id: id('f'),
            width: 'fill_container',
            layout: 'vertical',
            gap: 8,
            children: [
              text('Brand colors', { fontSize: 13, fontWeight: '600' }),
              {
                type: 'frame',
                id: id('f'),
                gap: 10,
                layout: 'horizontal',
                children: colors.map((c, i) => ({
                  type: 'frame',
                  id: id('f'),
                  width: 44,
                  height: 44,
                  cornerRadius: 22,
                  fill: c,
                  stroke: i === 0 ? '$brand-blue' : '$border',
                  strokeWidth: i === 0 ? 3 : 1,
                })),
              },
            ],
          },
        ],
      },
      {
        type: 'frame',
        id: id('f'),
        width: 'fill_container',
        padding: [12, 20, 32, 20],
        children: [primaryBtn('Save theme')],
      },
    ],
  };
}

// --- Main update ---
const doc = JSON.parse(fs.readFileSync(path, 'utf8'));

const REMOVE_IDS = new Set([
  'GczSc', 'RlVey', 'SYxx6', 'k3R7S9', // old auth
]);

const SHIFT_Y = 920;
const screenPattern = /^\d{2}\./;

// Shift existing screens and row labels down
for (const child of doc.children) {
  if (child.type === 'frame' && screenPattern.test(child.name || '') && child.y >= SHIFT_Y) {
    child.y += SHIFT_Y;
  }
  if (child.type === 'text' && child.name?.includes('row label') && child.y >= SHIFT_Y - 40) {
    child.y += SHIFT_Y;
  }
}

// Remove old auth screens
doc.children = doc.children.filter((c) => !REMOVE_IDS.has(c.id));

const HERO_THRIFT =
  'https://images.unsplash.com/photo-1619384846683-8dede3452564?w=1080&q=80';
const HERO_STORE =
  'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1080&q=80';
const HERO_MOMO =
  'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=1080&q=80';
const HERO_GHANA =
  'https://images.unsplash.com/photo-1619384259054-ee3ce9d1798c?w=1080&q=80';
const HERO_SELLER =
  'https://images.unsplash.com/photo-1717614990674-1df6faa7f6d6?w=1080&q=80';
const HERO_LOGIN =
  'https://images.unsplash.com/photo-1619384259054-ee3ce9d1798c?w=1080&q=80';

const newScreens = [
  makeSplash(),
  makeOnboardingSlide({
    name: '00.02 — List in minutes',
    context: 'Onboarding — list thrift fast.',
    x: 420,
    y: 0,
    heroUrl: HERO_THRIFT,
    floatingTag: '₵185 avg. sale on vintage denim',
    floatingPill: '3 min',
    title: 'List your finds in minutes',
    body: 'Snap photos, set your price in GHS, and publish to thousands of buyers hunting thrift across Ghana.',
    dotIndex: 0,
  }),
  makeOnboardingSlide({
    name: '00.03 — Get paid to MoMo',
    context: 'Onboarding — mobile money payouts.',
    x: 840,
    y: 0,
    heroUrl: HERO_MOMO,
    floatingTag: 'MTN · AirtelTigo · Telecel',
    floatingPill: 'Paystack',
    title: 'Get paid to mobile money',
    body: 'Connect your MoMo number and receive seller payouts automatically when orders complete. No bank account needed.',
    dotIndex: 1,
  }),
  makeOnboardingSlide({
    name: '00.04 — Reach buyers',
    context: 'Onboarding — nationwide reach.',
    x: 1260,
    y: 0,
    heroUrl: HERO_GHANA,
    floatingTag: '2,400+ active buyers',
    floatingPill: 'Ghana',
    title: 'Reach buyers across Ghana',
    body: 'From Accra to Kumasi — your shop shows up where thrift lovers are already shopping. You handle the finds, we handle discovery.',
    dotIndex: 2,
  }),
  makeOnboardingSlide({
    name: '00.05 — Start selling',
    context: 'Final onboarding — create account CTA.',
    x: 0,
    y: SHIFT_Y,
    heroUrl: HERO_SELLER,
    floatingTag: '500+ sellers on KantaOnline',
    floatingPill: '4.8 ★',
    title: 'Your shop, your way',
    body: 'Join sellers turning closets and market finds into income. Set up takes less than 10 minutes.',
    dotIndex: 3,
    ctaText: 'Get started',
    showSkip: false,
  }),
  makeAuthScreen({
    name: '00.06 — Sign in',
    context: 'Returning seller — hero + rounded sheet.',
    x: 420,
    y: SHIFT_Y,
    heroUrl: HERO_LOGIN,
    kicker: 'KANTAONLINE',
    title: 'Welcome back',
    subtitle: 'Sign in to manage your store, orders, and payouts.',
    fields: [
      inputField('Email', 'you@email.com'),
      inputField('Password', '••••••••', { muted: true }),
      text('Forgot password?', { fill: '$brand-blue', fontSize: 13, fontWeight: '600' }),
    ],
    cta: 'Sign in',
    footer: 'New seller? Create an account',
    sheetHeight: 500,
    sheetY: 340,
  }),
  makeAuthScreen({
    name: '00.07 — Register',
    context: 'New seller registration — hero + sheet.',
    x: 840,
    y: SHIFT_Y,
    heroUrl: HERO_STORE,
    kicker: 'KANTAONLINE',
    title: 'Get started',
    subtitle: 'Create your account and open your thrift shop today.',
    fields: [
      inputField('First name', 'Samuel'),
      inputField('Last name', 'Mensah'),
      inputField('Store name', 'Thrift Accra'),
      inputField('Email', 'you@email.com'),
      inputField('Password', 'Create password', { muted: true }),
    ],
    cta: 'Create account',
    footer: 'Already have an account? Sign in',
    sheetHeight: 560,
    sheetY: 280,
  }),
  makeAuthScreen({
    name: '00.08 — Forgot password',
    context: 'Password reset request.',
    x: 1260,
    y: SHIFT_Y,
    heroUrl: HERO_LOGIN,
    kicker: 'KANTAONLINE',
    title: 'Reset password',
    subtitle: "Enter your email and we'll send a link to get back into your store.",
    fields: [inputField('Email', 'you@email.com')],
    cta: 'Send reset link',
    sheetHeight: 380,
    sheetY: 400,
  }),
  makeKYC(1680, SHIFT_Y),
];

// Find shifted positions for new feature screens
const dashboard = doc.children.find((c) => c.name === '01.01 — Dashboard');
const dashY = dashboard?.y ?? 1840;

// After shift: settings row y=4600, profile row y=5520, events row y=6440
newScreens.push(
  makeOnboardingChecklist(420, dashY),
  makePaymentSetup(1680, 4600),
  makeStoreCreateFirst(1260, 6440),
  makeThemeSettings(1680, 5520),
);

// Update row labels
const labelUpdates = {
  AUTH: 'ONBOARDING & AUTH',
  DASHBOARD: 'DASHBOARD',
};
for (const child of doc.children) {
  if (child.type === 'text' && child.name === 'AUTH row label') {
    child.content = 'ONBOARDING & AUTH';
    child.y = -36;
  }
  if (child.type === 'text' && child.name === 'DASHBOARD row label') {
    child.y = SHIFT_Y - 36;
  }
}

// Insert new screens at beginning (after components)
const componentEnd = doc.children.findIndex((c) => c.reusable);
const insertAt = componentEnd >= 0 ? componentEnd + 1 : 0;
doc.children.splice(insertAt, 0, ...newScreens);

// Update More hub to mention payment setup
const more = doc.children.find((c) => c.name === '04.01 — More');
if (more) {
  const payRow = more.children
    ?.find((c) => c.name === 'Screen body')
    ?.children?.find((c) => c.children?.some((ch) => ch.content === 'Store settings'));
}

fs.writeFileSync(path, JSON.stringify(doc, null, 2));
console.log('Updated admin.pen');
console.log('Added screens:', newScreens.map((s) => s.name).join(', '));
console.log('Shifted existing screens by', SHIFT_Y, 'px');
