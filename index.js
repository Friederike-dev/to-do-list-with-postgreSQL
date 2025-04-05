import express from "express";
import bodyParser from "body-parser";

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const db = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

let items = [];

// Funktion zum Initialisieren der Items
async function initializeItems() {
  try {
    await db.connect(); // Stelle sicher, dass die Datenbankverbindung hergestellt wird
    items = await getItems();
  } catch (err) {
    console.error("Error initializing items:", err);
  }
}

//to validate the table names:
function isValidTableName(tableName) {
  const allowedTables = ["items", "items_week", "items_month"];
  return allowedTables.includes(tableName);
}

// Funktion zum Abrufen der Items aus der Datenbank
async function getItems() {
  const result = await db.query("SELECT * FROM items ORDER BY id ASC");
  console.log(result.rows);
  return result.rows; // Gibt alle Items zurück
}
async function getItemsWeek() {
  const result = await db.query("SELECT * FROM items_week ORDER BY id ASC");
  console.log(result.rows);
  return result.rows; 
}
async function getItemsMonth() {
  const result = await db.query("SELECT * FROM items_month ORDER BY id ASC");
  console.log(result.rows);
  return result.rows;
}

// Route für die Startseite
// hier drin items den Inhalt aus der Datenbank zuweisen, um sicherzustellen, 
// dass die Items immer aktuell sind, wenn die Seite geladen wird
app.get("/", async (req, res) => {
  const items = await getItems(); // Abrufen der aktuellen Items
  const itemsWeek = await getItemsWeek(); // Abrufen der aktuellen Items
  const itemsMonth = await getItemsMonth(); // Abrufen der aktuellen Items
  res.render("index.ejs", {
    listTitle: "Today",
    listItems: items,
    weeklistTitle: "This Week",
    weeklistItems: itemsWeek,
    monthlistTitle: "This Month",
    monthlistItems: itemsMonth,
  });
});

// Route zum Hinzufügen eines neuen Items
app.post("/add", async (req, res) => {
  const item = req.body.newItem;
  const table = req.body.tableName;
  
  try {
    // Überprüfen, ob der Tabellenname gültig ist
    if (!isValidTableName(table)) {
      return res.status(400).send("Invalid table name");
    } else {
    await db.query(`INSERT INTO ${table} (title) VALUES ($1)`, [item]);
    res.redirect("/");
    }
  } catch (err) {
    console.error("Error adding item:", err);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/edit", async (req, res) => {
  const item = req.body.updatedItemTitle;
  const id = req.body.updatedItemId;
  const table = req.body.tableName;

  try {
    // Überprüfen, ob der Tabellenname gültig ist
    if (!isValidTableName(table)) {
      return res.status(400).send("Invalid table name");
    } else {
    await db.query(`UPDATE ${table} SET title = ($1) WHERE id = $2`, [item, id]); // mit ` und nicht " "
    res.redirect("/");
    }
  } catch (err) {
    console.error("Error updating item:", err);
    res.status(500).send("Internal Server Error");
  }
});
  
// Route zum Löschen eines Items
app.post("/delete", async (req, res) => {
  let id;
  let table;

  //table name does not come from the client here, but from the server
  //advantage: the user cannot see the table name in the client
  if (req.body.deleteItemId) {
    id = req.body.deleteItemId;
    table = "items";
  } else if (req.body.deleteItemIdWeek) {
    id = req.body.deleteItemIdWeek;
    table = "items_week";
  } else if (req.body.deleteItemIdMonth) {
    id = req.body.deleteItemIdMonth;
    table = "items_month";
  }

  console.log("Delete Request:", req.body);
  console.log("ID:", id);
  console.log("Table:", table);

  try {
    if (id && table) {
      await db.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
    } else {
      return res.status(400).send("Invalid delete request");
    }
  } catch (err) {
    console.error("Error deleting item:", err);
    res.status(500).send("Internal Server Error");
  }
  res.redirect("/");
});

// Starte den Server und initialisiere die Items
app.listen(port, async () => {
  console.log(`Server running on port ${port}`);
  await initializeItems(); // Initialisiere die Items beim Start
});