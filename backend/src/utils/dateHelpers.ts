export const toIsoDate = (value?: string | Date): string => {
  if (!value) {
    return new Date().toISOString().split("T")[0];
  }
  if (value instanceof Date) {
    return value.toISOString().split("T")[0];
  }

  const normalized = String(value).trim();
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().split("T")[0];
  }

  return date.toISOString().split("T")[0];
};

export const getMonthDateRange = (month: number, year: number) => {
  const normalizedMonth = Number.isFinite(month) && month >= 1 && month <= 12 ? month : new Date().getMonth() + 1;
  const normalizedYear = Number.isFinite(year) && year >= 0 ? year : new Date().getFullYear();
  const paddedMonth = String(normalizedMonth).padStart(2, "0");
  const daysInMonth = new Date(normalizedYear, normalizedMonth, 0).getDate();
  return {
    start: `${normalizedYear}-${paddedMonth}-01`,
    end: `${normalizedYear}-${paddedMonth}-${String(daysInMonth).padStart(2, "0")}`,
  };
};

export const clampMonth = (value: unknown) => {
  const month = Number(value);
  return Number.isFinite(month) && month >= 1 && month <= 12 ? month : new Date().getMonth() + 1;
};

export const clampYear = (value: unknown) => {
  const year = Number(value);
  return Number.isFinite(year) && year >= 1970 ? year : new Date().getFullYear();
};
