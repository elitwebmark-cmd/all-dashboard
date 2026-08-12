# Elit-Web Marketing Dashboard

Онлайн-дешборд маркетингових показників агенції **Elit-Web** на даних Windsor.ai
(Google Ads, GA4, Meta, HubSpot, Search Console). Next.js 14 + PostgreSQL + Railway.

> Поточний етап (MVP): увімкнені канали **Google Ads** і **GA4** з реальними даними.
> Meta, HubSpot і Search Console додаються за тим самим патерном (`src/lib/connectors.ts`).

---

## Що вже працює

- Комплексний огляд: KPI Google Ads (витрати, кліки, покази, CTR, CPC, конверсії) + GA4 (сесії, користувачі, engagement, key events).
- Поканальні сторінки з розбивкою за кампаніями / каналами трафіку.
- Графік динаміки (витрати + сесії по днях).
- Автооновлення дешборду кожні 10 хв (`AutoRefresh`).
- JSON API показників: `GET /api/metrics?from=&to=&channel=`.
- ETL: Windsor get_data → нормалізація → UPSERT у Postgres (`src/lib/ingest.ts`).
- Ідемпотентні міграції + засів реальними демо-даними.

**Без бази** застосунок працює на демо-сіді `data/seed.json` (реальні цифри Elit-Web за 2026-08-05..11) — зручно для локального запуску й демо.
**З базою** (заданий `DATABASE_URL`) — читає з Postgres, наповнюється через ETL.

---

## Локальний запуск

```bash
npm install
cp .env.example .env      # можна лишити порожнім для демо-режиму
npm run dev               # http://localhost:3000
```

## Запуск із базою (продакшн-режим локально)

```bash
export DATABASE_URL=postgres://...
npm run db:migrate        # створює таблиці
npm run db:seed           # заливає демо-дані (опційно)
npm run ingest hot        # тягне свіжі дані з Windsor (потрібен WINDSOR_API_KEY)
npm run build && npm start
```

---

## Деплой на Railway

1. **Створити проєкт** на [railway.app](https://railway.app) → *Deploy from GitHub repo* (цей репозиторій).
2. **Додати Postgres**: *New → Database → PostgreSQL*. Railway автоматично додасть `DATABASE_URL` у змінні сервісу.
3. **Змінні оточення** веб-сервісу (Variables):
   - `WINDSOR_API_KEY` — ключ із кабінету Windsor.ai (Account → API key)
   - `INGEST_SECRET` — довгий випадковий рядок (захист ендпоінта завантаження)
   - `TZ=Europe/Kyiv`
4. **Старт**: `railway.json` уже налаштований — при деплої виконується `db:migrate`, далі `next start`.
5. **Наповнення даними** — два варіанти:
   - разово: у Railway shell виконати `npm run ingest backfill`;
   - за розкладом: додати **Cron**-сервіс (див. нижче).

### Розклад завантаження (Railway Cron)

Додати окремий сервіс із тим самим репо і командою запуску:

```
# щогодини — гарячі дані (сьогодні + вчора)
npm run ingest hot

# щоночі 03:15 — перерахунок останніх 7 днів (коригування атрибуції)
npm run ingest backfill
```

Або тригерити HTTP-ендпоінт вебсервісу:

```bash
curl -X POST "https://<домен>/api/ingest?mode=hot" \
  -H "Authorization: Bearer $INGEST_SECRET"
```

> **Про «10 хвилин».** UI оновлюється кожні 10 хв (перечитує нашу БД). Реальне
> завантаження з Windsor — щогодини + нічний backfill, бо джерела (Search Console,
> GA4, реклама) не оновлюються частіше. Каденцію легко змінити в розкладі Cron.

---

## Структура

```
src/
├── app/                 # Next.js сторінки + API
│   ├── page.tsx         # Комплексний огляд
│   ├── channels/[slug]  # Поканальні сторінки
│   └── api/             # /api/metrics, /api/ingest
├── components/          # KpiCard, TrendChart, AutoRefresh
├── db/                  # schema (Drizzle), client, queries
├── lib/                 # windsor (REST), connectors, facts (нормалізація), ingest, format
└── scripts/             # migrate, seed, ingest (Cron entry)
data/seed.json           # реальні демо-дані
```

## Дорожня карта

- [x] Етап 1–2: ETL + дешборд для Google Ads і GA4
- [ ] Етап 3: Meta Ads, HubSpot, Search Console
- [ ] Етап 4: історичні snapshot-и, порівняння періодів
- [ ] Етап 5: PDF-звіти (Playwright)
- [ ] Етап 6: email-розсилка (Resend)
- [ ] Етап 7: автентифікація команди, ролі
