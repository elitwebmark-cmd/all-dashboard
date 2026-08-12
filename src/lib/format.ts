export const money = (n: number, currency = "UAH") =>
  new Intl.NumberFormat("uk-UA", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n || 0);

export const uah = (n: number) => money(n, "UAH");
export const usd = (n: number) => money(n, "USD");

export const int = (n: number) =>
  new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 0 }).format(n || 0);

export const dec = (n: number, d = 1) =>
  new Intl.NumberFormat("uk-UA", { maximumFractionDigits: d, minimumFractionDigits: d }).format(
    n || 0,
  );

export const pct = (n: number) => `${dec(n, 1)}%`;

export const shortDate = (d: string) => {
  const [, m, day] = d.split("-");
  return `${day}.${m}`;
};
