const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../server/restaurant.db');
const db = new sqlite3.Database(dbPath);

console.log("--- BOOKINGS ---");
db.all("SELECT * FROM bookings", [], (err, rows) => {
    if (err) console.error(err);
    if (rows.length === 0) console.log("No bookings found.");
    else console.table(rows);

    console.log("\n--- MENU ITEMS ---");
    db.all("SELECT id, category, name, price, is_available FROM menu_items", [], (err, rows) => {
        if (err) console.error(err);
        if (rows.length === 0) console.log("No menu items found.");
        else console.table(rows);
    });
});
