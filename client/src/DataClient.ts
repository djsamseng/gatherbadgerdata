
import axios from "axios";
import { createClient } from "@supabase/supabase-js";
import { GetGiftsResponse, Gift, SupabaseGift, SupabaseTag, SetGiftDetailsResponse } from "../../server/src/app";

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

async function getGifts() {
  if (READ_FROM_SUPABASE) {
    return getGiftsSupabase();
  }
  else {
    return getGiftsAxios();
  }
}

export default {
  getGifts,
  upsertGift,
  deleteGift,
  onExport,
}




async function getGiftsSupabase() {
  const { data, error, status } = await supabase.from("gifts").select("*, tags(tag)");
  if (error && status !== 406) {
    console.error("Supabase getGifts Error:", error, status);
  }
  if (data) {
    const toReturn: GetGiftsResponse["gifts"] = {};
    for (const res of data) {
      const dbRes: SupabaseGift & { tags: string[] } = res; // & { tags: [{tag:string;}] }
      // @ts-ignore
      const tags = dbRes.tags.map(tagObj => tagObj.tag);
      dbRes.tags = tags;
      const gift: Gift = dbRes;
      toReturn[gift.id] = gift;
    }
    return toReturn;
  }
  else {
    console.error("Failed to get Supabase gifts", data, error, status);
  }
  throw new Error("Failed to get gifts from supabase");
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