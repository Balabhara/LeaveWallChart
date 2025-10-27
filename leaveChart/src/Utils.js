// ------------------ Helpers ------------------

export const formatISO = (d) => d.toISOString().slice(0, 10);
export const isWeekend = (d) => [0, 6].includes(d.getDay());

export const isToday = (d) => {
  const t = new Date();
  return d.toDateString() === t.toDateString();
};

export const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);
export const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
export const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
export const startOfWeek = (d) => new Date(d.setDate(d.getDate() - d.getDay()));
export const calculateDates = (start,end) => {
    const diff = new Date(end) - new Date(start);
    const daysLength = diff/(1000 * 60 * 60 * 24) + 1;
    return daysLength;
}

export const getRangeDays = (baseDate, range) => {
  if (range === "Day") return [new Date(baseDate)];
  if (range === "Week")
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek(new Date(baseDate)));
      d.setDate(d.getDate() + i);
      return d;
    });
  return Array.from({ length: endOfMonth(baseDate).getDate() }, (_, i) =>
    new Date(baseDate.getFullYear(), baseDate.getMonth(), i + 1)
  );
};

export const getLabel = (date, range) => {
  if (range === "Month")
    return date.toLocaleDateString(undefined, { month: "long", year: "numeric" }).toUpperCase();

  if (range === "Week") {
    const start = startOfWeek(new Date(date));
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return `${start.toLocaleDateString(undefined, { day: "numeric", month: "short" })} - 
      ${end.toLocaleDateString(undefined, { day: "numeric", month: "short" })} ${date.getFullYear()}`;
  }

  return date.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export const getUserDepartment = (user, usersList) =>
  usersList.find((u) => u.user === user)?.department || "NO DEPARTMENT";
