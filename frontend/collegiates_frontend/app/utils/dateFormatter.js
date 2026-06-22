import {
  differenceInYears,
  differenceInMonths,
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  parseISO,
} from "date-fns";

export const formatTimeAgo = (dateString) => {
  const date = parseISO(dateString);
  const now = new Date();

  const years = differenceInYears(now, date);
  if (years >= 1) return `${years} year${years > 1 ? "s" : ""} ago`;

  const months = differenceInMonths(now, date);
  if (months >= 1) {
    const days = differenceInDays(now, date) % 30;
    return `${months} month${months > 1 ? "s" : ""}${
      days > 0 ? `, ${days} day${days > 1 ? "s" : ""}` : ""
    } ago`;
  }

  const days = differenceInDays(now, date);
  if (days >= 1) return `${days} day${days > 1 ? "s" : ""} ago`;

  const hours = differenceInHours(now, date);
  if (hours >= 1) return `${hours} hour${hours > 1 ? "s" : ""} ago`;

  const minutes = differenceInMinutes(now, date);
  return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
};
