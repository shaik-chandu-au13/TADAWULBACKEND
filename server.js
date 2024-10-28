const express = require('express');
const mysql = require('mysql2');
const dotenv = require('dotenv');
const fs = require('fs');
const cors = require('cors');

dotenv.config();

const app = express();

app.use(cors());

const port = process.env.PORT || 3000;

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});
let lastModifiedTime = null;
// Connect to MySQL
db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err.message);
    return;
  }
  console.log('Connected to MySQL');
});
// loadintosql
app.get('/insert-results', (req, res) => {
  const filePath = 'Tadawul_Results.json';

  fs.stat(filePath, (err, stats) => {
      if (err) {
          console.error('Error checking file stats:', err);
          return res.status(500).send('Error checking file stats');
      }

      if (!lastModifiedTime || stats.mtime > lastModifiedTime) {
          fs.readFile(filePath, 'utf8', (err, data) => {
              if (err) {
                  console.error('Error reading the JSON file:', err);
                  return res.status(500).send('Error reading the JSON file');
              }

              const objectsArray = JSON.parse(data);

              const sql = `
                  INSERT INTO test_results 
                  (status, expected, type, time, page, actual, step, difference, section, date, scenario,RunID) 
                  VALUES ?
              `;

              const values = objectsArray.map(obj => [
                  obj.Status,          // status
                  obj.Expected,        // expected
                  obj.Type,            // type
                  obj.Time,            // time
                  obj.Page,            // page
                  obj.Actual,          // actual
                  obj.Step,            // step
                  obj.Difference,      // difference
                  obj.Section,         // section
                  obj.Date,            // date
                  obj.Scenario,         // scenario
                  obj.RunID
              ]);

              db.query(sql, [values], (err, result) => {
                  if (err) {
                      console.error('Error inserting data:', err);
                      return res.status(500).send('Error inserting data');
                  }
                  console.log(`Inserted ${result.affectedRows} rows into the database.`);
                  
                  lastModifiedTime = stats.mtime;

                  res.send(`Inserted ${result.affectedRows} rows into the database.`);
              });
          });
      } else {
          res.send('No changes detected in the JSON file; insertion skipped.');
      }
  });
});

app.get('/api/data', (req, res) => {
  const sql = 'SELECT * FROM test_results';
  db.query(sql, (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(result);
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
