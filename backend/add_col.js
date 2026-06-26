const db = require('./database');
db.run("ALTER TABLE products ADD COLUMN article_name TEXT;", (err) => {
    if(err) console.error("Error or already exists:", err.message);
    else console.log("Added column article_name successfully!");
    db.close();
});
