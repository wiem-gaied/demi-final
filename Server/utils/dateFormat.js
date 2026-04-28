export const formatDate = (date) => {
  if (!date) return "-";

  return new Date(date).toLocaleString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};