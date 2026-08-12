/**
 * Конфіг конекторів Windsor.ai: які поля тягнути й як мапити в уніфікований факт.
 * Поля звірені з реальним акаунтом Elit-Web через Windsor get_fields.
 * Додати новий канал = додати запис сюди (+ маппер) — решта пайплайну не змінюється.
 */

export type ChannelSlug = "google_ads" | "ga4" | "meta" | "hubspot" | "search_console";

export interface ConnectorConfig {
  slug: ChannelSlug;
  windsorConnector: string; // ід конектора у Windsor
  title: string;
  accountId?: string;
  // поля Windsor get_data (ID з get_fields, не назви!)
  fields: string[];
  // сегмент-вимір, який кладемо у fact.segment
  segmentField: string;
  // валюта витрат каналу (для коректного форматування; канали не змішуємо)
  currency?: string;
}

export const CONNECTORS: Record<ChannelSlug, ConnectorConfig> = {
  google_ads: {
    slug: "google_ads",
    windsorConnector: "google_ads",
    title: "Google Ads",
    accountId: "430-346-2372",
    fields: ["date", "campaign", "clicks", "impressions", "spend", "conversions", "conversions_value"],
    segmentField: "campaign",
    currency: "UAH",
  },
  ga4: {
    slug: "ga4",
    windsorConnector: "googleanalytics4",
    title: "Google Analytics 4",
    accountId: "280095058",
    fields: ["date", "default_channel_group", "sessions", "totalusers", "active_users", "engaged_sessions", "conversions"],
    segmentField: "default_channel_group",
  },
  // --- наступні етапи (поля підтвердимо через get_fields перед вмиканням) ---
  meta: {
    slug: "meta",
    windsorConnector: "facebook",
    title: "Meta Ads",
    accountId: "837664791809030",
    fields: ["date", "campaign", "spend", "impressions", "clicks", "reach", "link_clicks", "actions_lead"],
    segmentField: "campaign",
    currency: "USD",
  },
  hubspot: {
    slug: "hubspot",
    windsorConnector: "hubspot",
    title: "HubSpot",
    accountId: "143596207",
    fields: ["date"],
    segmentField: "date",
  },
  search_console: {
    slug: "search_console",
    windsorConnector: "searchconsole",
    title: "Search Console",
    accountId: "https://elit-web.ua/",
    fields: ["date", "query", "clicks", "impressions", "ctr", "position"],
    segmentField: "query",
  },
};

// Канали, увімкнені на поточному етапі
export const ACTIVE_CHANNELS: ChannelSlug[] = ["google_ads", "ga4", "meta"];
