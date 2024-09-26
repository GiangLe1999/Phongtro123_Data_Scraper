function formatStringToDate(dateString) {
  // Step 1: Extract the time and date part from the string
  const dateTimePart = dateString.match(/\d{2}:\d{2} \d{2}\/\d{2}\/\d{4}/);

  // Check if the string contains a valid date/time part
  if (!dateTimePart) {
    throw new Error("Invalid date string format");
  }

  // Step 2: Extract time and date
  const [time, date] = dateTimePart[0].split(" ");
  const [day, month, year] = date.split("/");

  // Step 3: Reformat it into a format JavaScript can parse (YYYY-MM-DDTHH:MM)
  const formattedDate = `${year}-${month}-${day}T${time}`;

  // Step 4: Create a JavaScript Date object
  const dateObject = new Date(formattedDate);

  // Check if the date is valid
  if (isNaN(dateObject.getTime())) {
    throw new Error("Invalid date");
  }

  // Step 5: Format the date for SQL (YYYY-MM-DD HH:MM:SS)
  return formatDateForSQL(dateObject);
}

function formatDateForSQL(date) {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

module.exports = { formatStringToDate };
