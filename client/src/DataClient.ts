
import axios from "axios";
import { createClient } from "@supabase/supabase-js";
import { GetGiftsResponse, Gift, SupabaseGift, SupabaseTag, SetGiftDetailsResponse } from "../../server/src/app";
import { stringify } from "querystring";

const BASE_URL = "http://localhost:4000";

const supabaseURL = process.env.REACT_APP_SUPABASE_URL as string;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY as string;

const supabaseServiceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY as string;

const supabase = createClient(supabaseURL, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseURL, supabaseServiceKey);

const WRITE_TO_SUPABASE = true;
const READ_FROM_SUPABASE = true;

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

async function onExport(gifts: GetGiftsResponse["gifts"]) {
  const resp = await axios.post(BASE_URL + "/exportgifts", {
    gifts: gifts,
  });
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
  upsertGift,
  deleteGift,
  onExport,
  resetSearchIndex,
  searchGifts,
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

async function upsertGiftSupabase(gift: Gift) {
  try {
    const resp = await axios.post(BASE_URL + "/setgiftdetails", {
      gift,
    });
    const data: SetGiftDetailsResponse = resp.data;
    const supabaseGift = data.gift;
    const { error } = await supabaseAdmin.from("gifts").upsert(supabaseGift, {
      returning: "minimal",
    });
    if (error) {
      console.error("Failed to submit supabase gifts:", error);
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
  return word;
}

async function resetSearchIndexSupabase() {
  const data = await getSupabaseDbGiftsWithTags();
  if (data.length === 0) {
    console.error("Failed to get supabase gifts");
    return;
  }
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

  for (const item of data) {
    for (const tagObj of item.tags) {
      const tag = sanitizeQueryWord(tagObj.tag);
      if (!queryToGift[tag]) {
        queryToGift[tag] = newRecord();
      }
      queryToGift[tag].tagMatches.push(item.id);
    }
    for (let titleWord of item.title.split(" ")) {
      titleWord = sanitizeQueryWord(titleWord);
      if (!queryToGift[titleWord]) {
        queryToGift[titleWord] = newRecord();
      }
      queryToGift[titleWord].titleMatches.push(item.id);
    }
    for (let realTitleWord of item.real_title.split(" ")) {
      realTitleWord = sanitizeQueryWord(realTitleWord);
      if (!queryToGift[realTitleWord]) {
        queryToGift[realTitleWord] = newRecord();
      }
      queryToGift[realTitleWord].titleMatches.push(item.id);
    }
    if (true) {
      for (let realDescWord of item.real_desc.split(" ")) {
        realDescWord = sanitizeQueryWord(realDescWord);
        if (!queryToGift[realDescWord]) {
          queryToGift[realDescWord] = newRecord();
        }
      }
    }
  }
  // wordUsage not used. "golf" will come up a lot and we want that
  const wordUsage: Record<string, number> = {};
  for (const [query, info] of Object.entries(queryToGift)) {
    if (!wordUsage[query]) {
      wordUsage[query] = 0;
    }
    wordUsage[query] += info.tagMatches.length + info.titleMatches.length + info.descMatches.length;
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
  type SupabaseSearchIndex = {
    word: string;
    gift_id: SupabaseGift["id"];
    score: number;
  };
  const { error } = await supabaseAdmin.from("search_index").delete();
  if (error) {
    console.error("Failed to delete supabase search_index:", error);
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

/*
DROP FUNCTION search_by_words;
CREATE OR REPLACE FUNCTION search_by_words(words TEXT[], range_offset INTEGER, range_limit INTEGER)
  RETURNS TABLE(id INTEGER,
                title TEXT,
                img TEXT,
                url TEXT,
                custom_desc TEXT,
                score_sum REAL,
                word_matches TEXT[])
  LANGUAGE plpgsql AS
$func$
BEGIN
  RETURN QUERY
  SELECT gifts.id, gifts.title, gifts.img, gifts.url, gifts.custom_desc, res.score_sum, res.word_matches

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
  word_matches: Array<string>;
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