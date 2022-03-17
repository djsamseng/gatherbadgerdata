
import axios from "axios";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { GetGiftsResponse, Gift, SupabaseGift, SupabaseTag, SetGiftDetailsResponse } from "../../server/src/app";
import { time } from "console";
import { write } from "fs";
import { stemmer } from "stemmer";
import { ListJson } from "./Lists";

const BASE_URL = "http://localhost:4000";

const WRITE_TO_SUPABASE = true;
const READ_FROM_SUPABASE = true;
const WRITE_TO_REMOTE_SUPABASE = false;
const READ_FROM_REMOTE_SUPABASE = false;

const supabaseURL = process.env.REACT_APP_SUPABASE_URL as string;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY as string;
const supabaseServiceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY as string;

const remoteSupabaseURL = process.env.REACT_APP_SUPABASE_REMOTE_URL as string;
const remoteSupabaseAnonKey = process.env.REACT_APP_SUPABASE_REMOTE_ANON_KEY as string;
const remoteSupabaseServiceKey = process.env.REACT_APP_SUPABASE_REMOTE_SERVICE_KEY as string;

const remoteSupabaseAdmin = createClient(remoteSupabaseURL, remoteSupabaseServiceKey);

function getSupabase() {
  if (READ_FROM_REMOTE_SUPABASE) {
    return createClient(remoteSupabaseURL, remoteSupabaseAnonKey);
  }
  else {
    return createClient(supabaseURL, supabaseAnonKey);
  }
}
const supabase = getSupabase();
function getAdmin() {
  if (WRITE_TO_REMOTE_SUPABASE) {
    return remoteSupabaseAdmin;
  }
  else {
    return createClient(supabaseURL, supabaseServiceKey);
  }
}
const supabaseAdmin = getAdmin();



async function upsertGift(gift: Gift) {
  if (WRITE_TO_SUPABASE) {
    await upsertGiftSupabase(gift);
  }
  else {
    await upsertGiftAxios(gift);
  }
}

async function deleteGift(gift: Gift) {
  if (WRITE_TO_SUPABASE) {
    await deleteGiftSupabase(gift);
  }
  else {
    await deleteGiftAxios(gift);
  }
}

async function wait(ms: number) {
  return new Promise(fulfill => {
    setTimeout(() => {
      fulfill({});
    }, ms);
  })
}
async function onExport(gifts: GetGiftsResponse["gifts"]) {
  if (READ_FROM_REMOTE_SUPABASE) {
    window.alert("Not exporting from remote");
    return;
  }
  await exportGiftsToJson();
  await wait(1000);
  await exportTagsToJson();
  await wait(1000);
  await exportSearchIndexToJson();
}
async function initLocalDatabase(remoteOverride = false) {
  if (WRITE_TO_REMOTE_SUPABASE && !remoteOverride) {
    window.alert("Cannot init local database when admin is remote");
    return;
  }
  const writer = remoteOverride ? remoteSupabaseAdmin : supabaseAdmin;
  const gifts = await getFile("gifts.json");
  const tags = await getFile("tags.json");
  const search_index = await getFile("search_index.json");
  console.log("initLocalDatabase", gifts, tags, search_index);
  //await deleteTable("search_index", writer);
  //await deleteTable("tags", writer);
  //await deleteTable("gifts", writer);
  await writeTable("gifts", gifts.data, writer);
  await writeTable("tags", tags.data, writer);
  await writeTable("search_index", search_index.data, writer);
}

async function resetSearchIndex() {
  await resetSearchIndexSupabase();
}

async function getGifts() {
  if (READ_FROM_SUPABASE) {
    return getGiftsSupabase();
  }
  else {
    return getGiftsAxios();
  }
}

async function searchGifts(query: string) {
  return await searchGiftsSupabase(query);
}

export default {
  getGifts,
  getSupabaseDbGiftsWithTags,
  upsertGift,
  deleteGift,
  onExport,
  resetSearchIndex,
  searchGifts,
  initLocalDatabase,
  getFile,
  getFilesInDir,
  writeFiles,
  getPendingGifts,
  uploadPendingToProd,
}


async function getSupabaseDbGiftsWithTags() {
  const { data, error, status } = await supabase.from("gifts").select("*, tags(tag)");
  if (error && status !== 406) {
    console.error("Supabase getGifts Error:", error, status);
  }
  if (data) {
    return data as Array<SupabaseGift & { tags: [{tag: string; }] }>;
  }
  else {
    console.error("Failed to get Supabase gifts", data, error, status);
  }
  return [];
}

async function supabaseGiftsToGiftsMap(data: Array<SupabaseGift & { tags: [{tag: string; }] }>) {
  const toReturn: GetGiftsResponse["gifts"] = {};
  for (const res of data) {
    // Lie about the type so we can set it to the Gift tags type
    const dbRes = res as any as SupabaseGift & { tags: string[] };
    // @ts-ignore
    const tags = dbRes.tags.map(tagObj => tagObj.tag);
    dbRes.tags = tags;
    const gift: Gift = dbRes;
    toReturn[gift.id] = gift;
  }
  return toReturn;
}

async function getGiftsSupabase() {
  const data = await getSupabaseDbGiftsWithTags();
  return supabaseGiftsToGiftsMap(data);
}

async function getGiftsAxios() {
  const resp = await axios.post(BASE_URL + "/getgifts", {});
  console.log("RESP:", resp);
  const data: GetGiftsResponse = resp.data;
  return data.gifts;
}

async function upsertGiftAxios(gift: Gift) {
  try {
    const resp = await axios.post(BASE_URL + "/addgift", {
      gift,
    });
  }
  catch (error) {
    console.error("Failed to submit:", error);
  }
}

type PendingGift = SupabaseGift & {
  pendingGifts: Array<{ gift_id: number }>;
  search_index: Array<{ word: string; gift_id:number; score:number;}>;
  tags: Array<{tag: string}>;
};
async function getPendingGifts(): Promise<{
  gifts: Array<SupabaseGift>;
  tags: Array<SupabaseTag>;
  search_index: Array<SupabaseSearchIndex>;
}> {
  const { data, error } = await supabase.from("gifts")
    .select("*, pending_gifts!inner(*), tags(tag), search_index!inner(*)") as {
      data: Array<PendingGift>;
      error: any
    };
  if (error) {
    console.error("Failed to pending gifts:", error);
    return {
      gifts: [],
      tags: [],
      search_index: [],
    };
  }
  const gifts = data.map(g => {
    return {
      id: g.id,
      url: g.url,
      img: g.img,
      title: g.title,
      iframe: g.iframe,
      img_amazon_ad: g.img_amazon_ad,
      img_amazon_orig: g.img_amazon_orig,
      custom_desc: g.custom_desc,
      price: g.price,
      real_title: g.real_title,
      real_desc: g.real_desc,
      score: g.score,
    };
  });
  const tags = data.reduce((ar, item) => {
    item.tags.forEach(tag => {
      ar.push({
        gift_id: item.id,
        tag: tag.tag,
      });
    })
    return ar;
  }, [] as Array<SupabaseTag>);
  const search_index = data.reduce((ar, item) => {
    item.search_index.forEach(s => {
      ar.push(s);
    })
    return ar;
  }, [] as Array<SupabaseSearchIndex>);
  return {
    gifts,
    tags,
    search_index,
  }
}

async function uploadPendingToProd(data: {
  gifts: Array<SupabaseGift>;
  tags: Array<SupabaseTag>;
  search_index: Array<SupabaseSearchIndex>;
}) {
  const {
    gifts,
    tags,
    search_index
  } = data;
  {
    const { data, error } = await remoteSupabaseAdmin.from("gifts").insert(gifts, { returning: "minimal" }) as {
      data: Array<SupabaseSearchResult>;
      error?: any;
    }
    if (error) {
      console.error("Error in inserting pending gifts:", error);
    }
  }
  {
    const { data, error } = await remoteSupabaseAdmin.from("tags").insert(tags, { returning: "minimal" }) as {
      data: Array<SupabaseSearchResult>;
      error?: any;
    }
    if (error) {
      console.error("Error in inserting pending tags:", error);
    }
  }
  {
    const { data, error } = await remoteSupabaseAdmin.from("search_index").insert(search_index, { returning: "minimal" }) as {
      data: Array<SupabaseSearchResult>;
      error?: any;
    }
    if (error) {
      console.error("Error in inserting pending tags:", error);
    }
  }
  {
    {
      const { data, error } = await supabaseAdmin.from("pending_gifts")
        .delete({ returning: "minimal" })
        .in("gift_id", gifts.map(g => g.id));
      if (error) {
        console.error("Error in removing pending gifts:", error);
      }
    }
  }
}

async function upsertGiftSupabase(gift: Gift) {
  try {
    const resp = await axios.post(BASE_URL + "/setgiftdetails", {
      gift,
    });
    const data: SetGiftDetailsResponse = resp.data;
    const supabaseGift = data.gift;
    if (supabaseGift.id === -1) {
      {
        const { data, error } = await supabaseAdmin.from("gifts").select("id").order("id", { ascending: false }).limit(1) as {
          data: any,
          error: any,
        };
        if (error) {
          console.error("Failed to get new id:", error);
        }
        const newId = data[0].id + 1;
        console.log("Got new id:", newId);
        supabaseGift.id = newId;
        gift.id = newId;
      }

      const { data, error } = await supabaseAdmin.from("gifts").insert([supabaseGift], { returning: "minimal" }) as {
        data: Array<SupabaseSearchResult>;
        error?: any;
      }
      if (error) {
        console.error("Error in inserting new:", error);
      }
    }
    else {
      const { error } = await supabaseAdmin.from("gifts").upsert(supabaseGift, {
        returning: "minimal",
      });
      if (error) {
        console.error("Failed to submit supabase gifts:", error);
      }
    }

    for (const tag of gift.tags) {
      const supabaseTag: SupabaseTag = {
        gift_id: gift.id,
        tag: tag,
      }
      const { error } = await supabaseAdmin.from("tags").upsert(supabaseTag, {
        returning: "minimal",
      });
      if (error) {
        console.error("Failed to submit supabase tag:", tag, error);
      }
    }
    await setSupabaseSearchEntriesForGift(supabaseGift, gift.tags.map(t => {
      return {
        gift_id: supabaseGift.id,
        tag: t,
      };
    }));
    {
      const { error } = await supabaseAdmin.from("pending_gifts").insert([{
        gift_id: supabaseGift.id,
      }], { returning: "minimal"});
      if (error) {
        console.error("Failed to insert pending gift:", supabaseGift.id, error);
      }
    }
  }
  catch (error) {
    console.error("Failed to set details and submit supabase gift:", error);
  }
}

async function deleteGiftAxios(gift: Gift) {
  const resp = await axios.post(BASE_URL + "/deletegift", {
    gift,
  });
}

async function deleteGiftSupabase(gift: Gift) {

  {
    const { error } = await supabaseAdmin.from("search_index").delete().match({ gift_id: gift.id });
    if (error) {
      console.error("Failed to delete gift tags from supabase:", error);
    }
  }
  {
    const { error } = await supabaseAdmin.from("tags").delete().match({ gift_id: gift.id });
    if (error) {
      console.error("Failed to delete gift tags from supabase:", error);
    }
  }
  {
    let { error } = await supabaseAdmin.from("gifts").delete().match({ id: gift.id });
    if (error) {
      console.error("Failed to delete gift from supabase:", error);
    }
  }
}

function sanitizeQueryWord(word: string) {
  word = word.toLowerCase();
  word = word.replace(/\W/g, '');
  word = word.trimEnd();
  word = word.trimStart();
  word = stemmer(word);
  return word;
}

export type SupabaseSearchIndex = {
  word: string;
  gift_id: SupabaseGift["id"];
  score: number;
};

async function setSupabaseSearchEntriesForGift(gift: SupabaseGift, tags: Array<SupabaseTag>) {
  type QueryToGiftObj = {
    tagMatches: Array<SupabaseGift["id"]>;
    titleMatches: Array<SupabaseGift["id"]>;
    descMatches: Array<SupabaseGift["id"]>;
  };
  const queryToGift: Record<string, QueryToGiftObj> = {};
  const newRecord = () => {
    return {
      tagMatches: [],
      titleMatches: [],
      descMatches: [],
    } as QueryToGiftObj;
  };
  for (const tagObj of tags) {
    const tag = sanitizeQueryWord(tagObj.tag);
    if (!queryToGift[tag]) {
      queryToGift[tag] = newRecord();
    }
    queryToGift[tag].tagMatches.push(gift.id);
  }
  for (let titleWord of gift.title.split(" ")) {
    titleWord = sanitizeQueryWord(titleWord);
    if (!queryToGift[titleWord]) {
      queryToGift[titleWord] = newRecord();
    }
    queryToGift[titleWord].titleMatches.push(gift.id);
  }
  for (let realTitleWord of gift.real_title.split(" ")) {
    realTitleWord = sanitizeQueryWord(realTitleWord);
    if (!queryToGift[realTitleWord]) {
      queryToGift[realTitleWord] = newRecord();
    }
    queryToGift[realTitleWord].titleMatches.push(gift.id);
  }
  if (true) {
    for (let realDescWord of gift.real_desc.split(" ")) {
      realDescWord = sanitizeQueryWord(realDescWord);
      if (!queryToGift[realDescWord]) {
        queryToGift[realDescWord] = newRecord();
      }
    }
  }

  const wordScores:Record<string, Record<number, number> > = {}; // { query1: { gift_id1: score1, gift_id2: score2 } }
  for (const [query, info]  of Object.entries(queryToGift)) {
    if (!wordScores[query]) {
      wordScores[query] = {};
    }
    for (const gift_id of info.tagMatches) {
      if (!wordScores[query][gift_id]) {
        wordScores[query][gift_id] = 0;
      }
      wordScores[query][gift_id] += 1;
    }
    for (const gift_id of info.titleMatches) {
      if (!wordScores[query][gift_id]) {
        wordScores[query][gift_id] = 0;
      }
      wordScores[query][gift_id] += 0.8;
    }
    for (const gift_id of info.descMatches) {
      if (!wordScores[query][gift_id]) {
        wordScores[query][gift_id] = 0;
      }
      wordScores[query][gift_id] += 0.001;
    }
  }

  for (const [query, gift_recs] of Object.entries(wordScores)) {
    for (const [gift_id, score] of Object.entries(gift_recs)) {
      const supabaseSearchEntry:SupabaseSearchIndex = {
        word: query,
        gift_id: parseInt(gift_id),
        score: score,
      }
      const { error } = await supabaseAdmin.from("search_index").upsert(supabaseSearchEntry, {
        returning: "minimal",
      });
      if (error) {
        console.error("Failed to add search_index:", supabaseSearchEntry, error);
      }
    }
  }
}

async function resetSearchIndexSupabase() {
  const data = await getSupabaseDbGiftsWithTags();
  if (data.length === 0) {
    console.error("Failed to get supabase gifts");
    return;
  }

  if (false) {
    const { error } = await supabaseAdmin.from("search_index").delete();
    if (error) {
      console.error("Failed to delete supabase search_index:", error);
    }
  }

  for (const item of data) {
    await setSupabaseSearchEntriesForGift(item, item.tags.map(t => {
      return {
        gift_id: item.id,
        tag: t.tag,
      };
    }));
  }
  // wordUsage not used. "golf" will come up a lot and we want that

}

/*
CREATE TABLE IF NOT EXISTS gifts (
  id INTEGER PRIMARY KEY,
  url TEXT NOT NULL,
  img TEXT NOT NULL,
  title TEXT NOT NULL,
  iframe TEXT,
  img_amazon_ad TEXT,
  img_amazon_orig TEXT,
  custom_desc TEXT NOT NULL,
  price REAL NOT NULL,
  real_title TEXT NOT NULL,
  real_desc TEXT NOT NULL,
  score INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS tags (
  gift_id INTEGER NOT NULL,
  tag TEXT NOT NULL,

  PRIMARY KEY(gift_id, tag),
  FOREIGN KEY(gift_id) REFERENCES gifts(id)
);
CREATE TABLE IF NOT EXISTS search_index (
  word TEXT NOT NULL,
  gift_id INTEGER NOT NULL,
  score REAL NOT NULL,
  PRIMARY KEY(word, gift_id),
  FOREIGN KEY(gift_id) REFERENCES gifts(id)
);
CREATE TABLE IF NOT EXISTS pending_gifts (
  gift_id INTEGER PRIMARY KEY,
  FOREIGN KEY(gift_id) REFERENCES gifts(id)
);
CREATE OR REPLACE FUNCTION search_by_words(words TEXT[], range_offset INTEGER, range_limit INTEGER)
  RETURNS TABLE(id INTEGER,
                title TEXT,
                img TEXT,
                url TEXT,
                custom_desc TEXT,
                score_sum REAL,
                word_matches TEXT[],
                total_results BIGINT)
  LANGUAGE plpgsql AS
$func$
BEGIN
  RETURN QUERY
  SELECT gifts.id, gifts.title, gifts.img, gifts.url, gifts.custom_desc, res.score_sum, res.word_matches, COUNT(res.id) OVER () as total_results

  FROM (
    SELECT gifts.id, SUM(search_index.score) as score_sum, array_agg(search_index.word) as word_matches
    FROM gifts
    JOIN search_index
    ON gifts.id = search_index.gift_id
    WHERE search_index.word = ANY(words)
    GROUP BY gifts.id
  ) res
  INNER JOIN gifts
  ON res.id = gifts.id
  ORDER BY res.score_sum DESC
  LIMIT range_limit
  OFFSET range_offset;
END
$func$;
*/
type SupabaseSearchResult = {
  id: number;
  title: string;
  img: string;
  score_sum: number;
  url: string;
  custom_desc: string;
  word_matches: Array<string>;
  total_results: number;
};
async function searchGiftsSupabase(query: string) {
  const words = query.split(" ")
    .map(s => sanitizeQueryWord(s))
    .filter(s => s.length > 0);
  if (words.length === 0) {
    return await getGiftsSupabase();
  }
  const {data, error, status} = await supabase.rpc("search_by_words", {
    words: words,
    range_offset: 0,
    range_limit: 10,
  }) as {
    data: Array<SupabaseSearchResult>;
    error?: any;
    status: number;
  }
  const searchResults = data;

  if (error && status !== 406) {
    console.error("Supabase getGifts Error:", error, status);
  }
  if (searchResults) {
    const { data, error, status } = await supabase.from("gifts")
      .select("*, tags(tag)")
      .in("id", searchResults?.map( res => res.id));
    if (error && status !== 406) {
      console.error("Supabase getGifts Error:", error, status);
    }
    if (data) {
      return supabaseGiftsToGiftsMap(data);
    }
    else {
      console.error("Failed to get Supabase gifts", data, error, status);
    }
  }
  else {
    console.error("Failed to search for Supabase gifts", searchResults, error, status);
  }
  return {};
}

async function deleteTable(tableName: string, supa: SupabaseClient) {
  {
    const { error } = await supa.from(tableName).delete();
    if (error) {
      console.error("Supabase writeTable Error:", error, tableName);
    }
  }
}
async function writeTable(tableName: string, data:Array<any>, supa: SupabaseClient) {
  if (data.length === 0) {
    window.alert("Not writing with empty data");
    return;
  }

  {
    const { error } = await supa.from(tableName).upsert(data, { returning: "minimal", });
    if (error) {
      console.error("Supabase writeTable Error:", error, tableName);
    }
  }
}
async function getTable(tableName: string) {
  const { data, error, status } = await supabase.from(tableName).select("*");
  if (error && status !== 406) {
    console.error("Supabase getGifts Error:", error, status);
    throw error;
  }
  if (data) {
    return data as Array<SupabaseGift & { tags: [{tag: string; }] }>;
  }
  console.error("Failed to get Supabase gifts", data, error, status);
  throw new Error("Failed to get Supabase gifts" + data + error + status);
}
async function writeFile(filename: string, data:any) {
  try {
    const resp = await axios.post(BASE_URL + "/writefile", {
      filename,
      data,
    })
  }
  catch (error) {
    console.error("Failed to write file", filename, error);
  }
}
async function getFilesInDir(dirname: string) {
  try {
    const resp = await axios.post(BASE_URL + "/getfilesindir", {
      dirname,
    });
    return resp.data.data;
  }
  catch (error) {
    console.error("Failed to get file", dirname, error);
  }
}
async function writeFiles(dirname: string, lists: Array<ListJson>) {
  try {
    const resp = await axios.post(BASE_URL + "/writefilesindir", {
      dirname,
      data: lists,
    });
    return resp.data;
  }
  catch (error) {
    console.error("Failed to get file", dirname, error);
  }
}

async function getFile(filename: string) {
  try {
    const resp = await axios.post(BASE_URL + "/getfile", {
      filename,
    });
    return resp.data;
  }
  catch (error) {
    console.error("Failed to get file", filename, error);
  }
}
async function exportGiftsToJson() {
  const gifts = await getTable("gifts") as Array<SupabaseGift>;
  await writeFile("gifts.json", gifts);
}
async function exportTagsToJson() {
  const tags = await getTable("tags") as unknown as Array<SupabaseTag>;
  await writeFile("tags.json", tags);
}

async function exportSearchIndexToJson() {
  const searchIndex = await getTable("search_index") as unknown as Array<SupabaseSearchIndex>;
  await writeFile("search_index.json", searchIndex);
}
