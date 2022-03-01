import bodyParser from "body-parser";
import cors from "cors";
import express, { Router } from "express";
import Sqlite from "sqlite3";

const app = express();
const PORT = process.env.PORT || 4000;
const jsonParser = bodyParser.json();
const routes = Router();

app.use(cors());
app.use(routes);


const db = new (Sqlite.verbose()).Database("gatherbadger.db");

db.serialize(() => {
  db.run(`DROP TABLE IF EXISTS gifts`);
  db.run(`DROP TABLE IF EXISTS tags`);

  db.run(`
    CREATE TABLE IF NOT EXISTS gifts (
      id INTEGER PRIMARY KEY,
      url TEXT NOT NULL,
      img TEXT NOT NULL,
      iframe TEXT
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS tags (
      tag_id INTEGER PRIMARY KEY,
      gift_id INTEGER NOT NULL,
      tag TEXT NOT NULL,

      FOREIGN KEY(gift_id) REFERENCES gifts(id)
    )
  `);

  const statement = db.prepare(`INSERT INTO gifts
    (url, img)
    VALUES
    (?,?)
  `);
  statement.run(["test_url", "test_img"], function (error) {
    console.log(this, error);
    const id = this.lastID;
    const tagsStatement = db.prepare(`
      INSERT INTO tags
      (gift_id, tag)
      VALUES(?,?)
    `);
    tagsStatement.run([this.lastID, "test_tag"]);
    tagsStatement.run([this.lastID, "test_tag2"]);
    tagsStatement.finalize(function(error) {
      if (error) {
        console.error(error);
      }
    });
  });
  statement.run(["test_url2", "test_img2"], function (error) {
    console.log(this, error);
    const id = this.lastID;
    const tagsStatement = db.prepare(`
      INSERT INTO tags
      (gift_id, tag)
      VALUES(?,?)
    `);
    tagsStatement.run([this.lastID, "test_tag_b"]);
    tagsStatement.run([this.lastID, "test_tag_b2"]);
    tagsStatement.finalize(function(error) {
      if (error) {
        console.error(error);
      }
      db.each(
        `SELECT gifts.id as id, gifts.url as url, gifts.img as img, tags.tag as tag FROM gifts
         JOIN tags ON gifts.id = tags.gift_id
        `, (err, row) => {
        if (err) {
          console.error(err);
        }
        console.log(`id:${row.id} url:${row.url} img:${row.img} tag:${row.tag}`);
      });
    });
  });
  statement.finalize();
});


const server = app.listen(PORT, () => {
    console.log("Server running on port:", PORT);
});
routes.post("/goto", jsonParser, async (req, resp) => {
   console.log("Req:", req.body);
   resp.send({ success: true });
});