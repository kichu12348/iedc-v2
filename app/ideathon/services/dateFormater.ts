function getOrdinal(day: number) {
  if (day > 3 && day < 21) return "th";
  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

export function formater(deadline: string) {
  const deadDate = new Date(deadline);

  const options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "long",
    year: "numeric",
  };
  const date = deadDate.toLocaleDateString("en-GB", options);

  const parts = date.split(" "); // [ "20", "August", "2026" ]

  const day = parts[0];
  const month = parts[1];
  const year = parts[2];

  const ordinal = getOrdinal(parseInt(day));
  const formattedDate = `${day}${ordinal} ${month} ${year}`;

  return formattedDate;
}
