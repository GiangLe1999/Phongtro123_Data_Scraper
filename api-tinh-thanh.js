const express = require("express");
const cors = require("cors");
const districtData = require("./data/district-data");
const provinceData = require("./data/province-data");
const dbConnection = require("./connect-db");

const app = express();

app.use(express.json());
app.use(cors());

app.post("/province/bulk", async (req, res) => {
  const values = provinceData.map((province) => [
    province.id,
    province.name,
    province.slug,
  ]);

  // Build the SQL query
  const query = `
      INSERT INTO province (id, name, slug)
      VALUES ?
    `;

  // Execute the bulk insert
  const result = dbConnection.query(query, [values]);

  return res.status(201).json({
    message: "Provinces created successfully",
    insertedRows: result.affectedRows,
  });
});

const findProvinces = () => {
  return new Promise((resolve, reject) => {
    const query = `SELECT * FROM province`;

    dbConnection.query(query, (err, result) => {
      if (err) {
        console.error("Error fetching provinces: ", err);
        return reject(err);
      }

      resolve(result); // Resolve the full result array
    });
  });
};

app.post("/district/bulk", async (req, res) => {
  try {
    // Fetch all provinces
    const provinces = await findProvinces();

    // Map district data to create an array of values to insert
    const formattedValues = districtData.map((district) => {
      const belongsToProvince = provinces.find(
        (p) => p.id === district.provinceId
      );
      return [
        district.districtId,
        district.name,
        `${belongsToProvince.slug}/${district.slug}`,
        belongsToProvince.id,
      ];
    });

    // Build the SQL query dynamically for multiple value sets
    const placeholders = formattedValues.map(() => "(?, ?, ?, ?)").join(", ");
    const query = `
      INSERT INTO district (id, name, slug, provinceId)
      VALUES ${placeholders}
    `;

    // Flatten the values array because placeholders require a flat array of values
    const flattenedValues = formattedValues.flat();

    // Execute the query
    dbConnection.query(query, flattenedValues, (err, result) => {
      if (err) {
        console.error("Error inserting data: ", err);
        return res.status(500).json({
          message: "Error inserting districts",
          ok: false,
        });
      }

      return res.status(201).json({
        message: "Districts created successfully",
        insertedRows: result.affectedRows,
        ok: true,
      });
    });
  } catch (error) {
    console.error("Error in bulk insert:", error);
    return res.status(500).json({
      message: error.message || "Failed to process request",
      ok: false,
    });
  }
});
app.listen(3000, () => {
  console.log("Server listening on port 3000");
});
