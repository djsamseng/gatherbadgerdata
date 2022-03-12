import bodyParser from "body-parser";
import cors from "cors";
import express, { Router, Request, Response } from "express";
import Sqlite from "sqlite3";
import fs from "fs";
import axios from "axios";
import Cheerio from "cheerio";

const app = express();
const PORT = process.env.PORT || 4000;
const jsonParser = bodyParser.json();
const routes = Router();

app.use(cors());
app.use(routes);


const db = new (Sqlite.verbose()).Database("gatherbadger.db");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS gifts (
      id INTEGER PRIMARY KEY,
      url TEXT NOT NULL,
      img TEXT NOT NULL,
      title TEXT NOT NULL,
      iframe TEXT,
      img_amazon_ad TEXT,
      img_amazon_orig TEXT,
      desc TEXT,
      price REAL,
      real_title TEXT,
      real_desc TEXT
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS tags2 (
      tag_id INTEGER PRIMARY KEY,
      gift_id INTEGER NOT NULL,
      tag TEXT NOT NULL,

      FOREIGN KEY(gift_id) REFERENCES gifts(id)
    )
  `);
  db.all(`
    SELECT COUNT(*) AS num_rows FROM tags2
  `, (error, rows) => {
    if (error) {
      console.error(error);
    }
    console.log(rows);
    if (rows[0].num_rows === 0) {
      db.all(`
        SELECT * from tags
      `, (error, rows) => {
        console.log("Got tags:", rows);
        const statement = db.prepare(`
          INSERT INTO tags2
          (tag_id, gift_id, tag)
          VALUES
          (?,      ?,       ?)
        `)
        for (const row of rows) {
          statement.run([row.tag_id, row.gift_id, row.tag])
        }
        statement.finalize((error) => {
          if (error) {
            console.error("Failed to copy tags", error);
          }

        })

      });
    }
  })
  db.all(`
    SELECT COUNT(*) AS num_cols FROM pragma_table_info("gifts") WHERE name="score"
  `, (error, rows) => {
    if (error) {
      console.error(error);
    }
    if (rows[0].num_cols === 0) {
      console.log("Should add");
      db.run(`
        ALTER TABLE gifts
        ADD COLUMN score INTEGER NOT NULL DEFAULT 0
      `)
    }
  })
});


const server = app.listen(PORT, () => {
    console.log("Server running on port:", PORT);
});

async function insertNewGift(gift: Gift) {
  await setAmazonDetails(gift);
  return new Promise((fulfill, reject) => {
    const statement = db.prepare(`INSERT INTO gifts
                  (url,      img,      title,      iframe,      img_amazon_ad,      img_amazon_orig,      desc,      price,      real_title,      real_desc,      score)
      VALUES
                  (?,        ?,        ?,          ?,           ?,                  ?,                    ?,         ?,          ?,               ?,              ?)
    `);
    statement.run([gift.url, gift.img, gift.title, gift.iframe, gift.img_amazon_ad, gift.img_amazon_orig, gift.desc, gift.price, gift.real_title, gift.real_desc, gift.score], function (error) {
      if (error) {
        console.error(error);
        reject(error);
      }
      const tagsStatement = db.prepare(`
        INSERT INTO tags2
        (gift_id, tag)
        VALUES(?,?)
      `);
      for (const tag of gift.tags) {
        tagsStatement.run([this.lastID, tag]);
      }
      tagsStatement.finalize(function(error) {
        if (error) {
          console.error(error);
          reject(error);
        }
        fulfill({});
      });
    });
  });
}

function getAmazonPrice(html: cheerio.Root): number {
  try {
    const dollars = html("span.a-price-whole").first().text();
    const cents = html("span.a-price-fraction").first().text();
    let price = parseFloat(html("span.a-offscreen").first().text().substring(1));
    if (isNaN(price) && dollars.length > 0 && cents.length > 0) {
      price = parseFloat(dollars + cents);
    }
    console.log(`Got price ${dollars}${cents} ${price}`);
    return price;
  }
  catch (error) {
    console.error("Failed to get gift price:", error);
    return -1;
  }
}

function getAmazonTitle(html: cheerio.Root): string {
  try {
    return html("#productTitle").text();
  }
  catch (error) {
    console.error("Failed to get amazon title:", error);
    return "";
  }
}

function getAmazonDesc(html: cheerio.Root): string {
  try {
    return html("#productDescription").text();
  }
  catch (error) {
    console.error("Failed to get amazon desc:", error);
    return "";
  }
}

async function setAmazonDetails(gift: Gift) {
  if (gift.url.indexOf("amazon") >= 0) {
    if (gift.price < 0 || gift.real_title.length === 0) {
      try {
        console.log("Setting amazon details for url:", gift.url);
        const resp = await axios.get(gift.url);
        const html = Cheerio.load(resp.data);
        gift.price = getAmazonPrice(html);
        gift.real_title = getAmazonTitle(html);
        gift.real_desc = getAmazonDesc(html);
      }
      catch (error) {
        console.error("Failed to setAmazonDetails");
      }
    }
  }
}

async function updateExistingGift(gift: Gift) {
  await setAmazonDetails(gift);
  return new Promise((fulfill, reject) => {
    console.log("UPDATING GIFT:", gift.id)
    const statement = db.prepare(`UPDATE gifts
      SET          url=?,    img=?,    title=?,    iframe=?,    img_amazon_ad=?,    img_amazon_orig=?,    desc=?,    price=?,    real_desc=?,    real_title=?,    score=?     WHERE id=?
    `);
    statement.run([gift.url, gift.img, gift.title, gift.iframe, gift.img_amazon_ad, gift.img_amazon_orig, gift.desc, gift.price, gift.real_desc, gift.real_title, gift.score, gift.id], function (error) {
      if (error) {
        console.error(error);
        reject(error);
      }
      db.run(`DELETE FROM tags2 WHERE gift_id=?`, [gift.id], (error) => {
        if (error) {
          console.error("Failed to delete tags:", error);
        }
        const tagsStatement = db.prepare(`
          INSERT INTO tags2
          (gift_id, tag)
          VALUES(?,?)
        `);
        for (const tag of gift.tags) {
          tagsStatement.run([gift.id, tag]);
        }
        tagsStatement.finalize(function(error) {
          if (error) {
            console.error(error);
            reject(error);
          }
          fulfill({});
        });
      });
    });
  });
}

async function deleteGift(gift: Gift) {
  return new Promise((fulfill, reject) => {
    console.log("Deleting gift", gift.id);
    db.serialize(() => {
      db.run("DELETE FROM gifts WHERE id=(?)", gift.id, function(error) {
        if (error) {
          console.log(error);
          reject(error);
        }
        db.run("DELETE FROM tags2 WHERE gift_id=(?)", gift.id, function(error) {
          if (error) {
            console.log(error);
            reject(error);
          }
          fulfill({});
        });
      });
    });
  });
}

export type Gift = {
  id: string;
  title: string;
  real_title: string;
  url: string;
  img: string;
  img_amazon_ad?: string;
  img_amazon_orig?: string;
  iframe?: string;
  desc?: string;
  real_desc: string;
  score: number;
  price: number;
  tags: Array<string>;
}

export type GetGiftsResponse = {
  gifts: Record<string, Gift>;
};
routes.post("/getgifts", jsonParser, async (req, resp: Response<GetGiftsResponse>) => {
  db.serialize(() => {
    db.all(
      `SELECT gifts.id as id, gifts.url as url, gifts.img as img, gifts.title as title, gifts.iframe as iframe,
              gifts.img_amazon_ad as img_amazon_ad, gifts.img_amazon_orig, gifts.desc as desc, gifts.price as price,
              gifts.real_title as real_title, gifts.real_desc as real_desc, gifts.score as score,
              tags2.tag as tag
       FROM gifts
       JOIN tags2 ON gifts.id = tags2.gift_id
      `, (err, rows) => {
      if (err) {
        console.error(err);
      }
      const gifts: GetGiftsResponse["gifts"] = {};
      for (const row of rows) {
        if (row.id in gifts) {
          gifts[row.id].tags.push(row.tag);
        }
        else {
          gifts[row.id] = {
            id: row.id,
            url: row.url,
            img: row.img,
            img_amazon_ad: row.img_amazon_ad,
            img_amazon_orig: row.img_amazon_orig,
            desc: row.desc,
            price: row.price,
            title: row.title,
            real_title: row.real_title,
            real_desc: row.real_desc,
            score: row.score,
            tags: [ row.tag ],
          }
        }
      }
      resp.send({
        "gifts": gifts,
      })
    });
  });
});

export type AddGiftRequest = {
  gift: Gift;
};
routes.post("/addgift", jsonParser, async(req: Request<AddGiftRequest>, resp) => {
  const gift: Gift = req.body.gift;
  try {
    if (gift.id.length > 0 || (gift.id as any as number) > 0) {
      await updateExistingGift(gift);
    }
    else {
      await insertNewGift(gift);
    }

  }
  catch (error) {
    resp.status(400).send(error);
    return;
  }
  resp.send({});
});

export type DeleteGiftRequest = {
  gift: Gift;
};
routes.post("/deletegift", jsonParser, async(req: Request<DeleteGiftRequest>, resp) => {
  const gift: Gift = req.body.gift;
  try {
    await deleteGift(gift);
  }
  catch (error) {
    resp.status(400).send(error);
    return;
  }
  resp.send({});
});

export type ExportGiftsRequest = {
  gifts: Record<string, Gift>;
};
routes.post("/exportgifts", jsonParser, async(req: Request<ExportGiftsRequest>, resp) => {
  const filePath = __dirname + "/gifts-source.json";
  const dataString = JSON.stringify({
    data: Object.values(req.body.gifts),
  }, null, 4);
  fs.writeFile("./gifts-source.json", dataString, (error) => {
    if (error) {
      console.error(error);
      return;
    }
    resp.send({});
  });
});