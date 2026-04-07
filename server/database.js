const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to SQLite database
// The file will be created in the 'server' folder if it doesn't exist
const dbPath = path.resolve(__dirname, 'restaurant.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database ' + dbPath + ': ' + err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initializeDatabase();
    }
});

function initializeDatabase() {
    db.serialize(() => {
        // 1. Bookings Table
        db.run(`CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT NOT NULL,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            guests INTEGER NOT NULL,
            message TEXT,
            status TEXT DEFAULT 'pending', 
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // 2. Menu Items Table
        db.run(`CREATE TABLE IF NOT EXISTS menu_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            price REAL NOT NULL,
            image_url TEXT,
            is_available INTEGER DEFAULT 1
        )`);

        // 3. Messages Table (Contact Form)
        db.run(`CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            message TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Create Blog Posts table
        db.run(`CREATE TABLE IF NOT EXISTS blog_posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            content TEXT,
            image_url TEXT,
            author TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Create Ads table
        db.run(`CREATE TABLE IF NOT EXISTS ads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            image_url TEXT,
            link_url TEXT,
            is_active INTEGER DEFAULT 1,
            position TEXT DEFAULT 'sidebar'
        )`);

        console.log('Database tables initialized.');

        // Optional: Seed initial data if empty
        seedData();
    });
}

function seedData() {
    db.get("SELECT count(*) as count FROM menu_items", (err, row) => {
        if (err) return console.error(err.message);
        if (row.count === 0) {
            console.log("Seeding initial menu items...");
            const stmt = db.prepare("INSERT INTO menu_items (category, name, description, price, image_url) VALUES (?, ?, ?, ?, ?)");

            // Starters
            stmt.run("Starters", "Tomato Bruschetta", "Tomatoes, Olive Oil, Cheese", 4.00, "images/menu/starter-1.jpg");
            stmt.run("Starters", "Avocado & Mango Salsa", "Avocado, Mango, Tomatoes", 5.00, "images/menu/starter-2.jpg");

            // Mains
            stmt.run("Mains", "Beef Steak", "Grilled beef steak with vegetables", 25.00, "images/menu/main-1.jpg");
            stmt.run("Mains", "Salmon Fillet", "Fresh salmon with lemon butter sauce", 22.00, "images/menu/main-2.jpg");

            stmt.finalize();
        }
    });
}

module.exports = db;
