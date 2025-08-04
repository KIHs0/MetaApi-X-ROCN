import dotenv from "dotenv";
dotenv.config();
import express from "express";
import FormData from "form-data";
const app = express();
import rss from "rss-parser";
import cron from "node-cron";
import * as cheerio from "cheerio";
import axios, { AxiosHeaders } from "axios";
import * as fs from "node:fs";
import * as path from "node:path";
const parser = new rss();
const PAT = process.env.FB_PAGE_ACCESS_TOKEN;
const PID = process.env.FB_PAGE_ID;

const mediaId = async (imgPath) => {
  try {
    if (!imgPath) return;
    console.log("media upload running");
    const form = new FormData();
    const file = fs.createReadStream(path.resolve(`./${imgPath}`));

    form.append("source", file);
    form.append("published", "false"); // keep it unpublished
    form.append("access_token", `${PAT}`);
    const headers = AxiosHeaders.from(form.getHeaders());
    const res = await axios.post(
      `https://graph.facebook.com/v23.0/${PID}/photos?access_token=${PAT}`,
      form,
      { headers }
    );
    const { id } = res.data;
    return id;
  } catch (err) {
    console.log("media upload err", err.response);
  }
};
const postToFb = async (data, idValue) => {
  console.log("POST TO FB RUNNING");
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v23.0/${PID}/feed`,
      null,
      {
        params: {
          message: data,
          attached_media: JSON.stringify([{ media_fbid: idValue }]),
          access_token: PAT,
        },
      }
    );
    console.log("✅ Post successful:", response.data);
  } catch (error) {
    console.error("❌ FB Post Error:", error.response?.data || error.message);
  }
};
async function downloadImage(imageUrl, destFolder) {
  if (!imageUrl) return null;
  try {
    console.log("downloading img");
    fs.mkdirSync(destFolder, { recursive: true });

    // derive filename
    let filename = path.basename(new URL(imageUrl).pathname).split("?")[0];
    if (!filename) filename = `image_${Date.now()}.jpg`;

    const filepath = path.join(destFolder, filename);
    const response = await axios.get(imageUrl, {
      responseType: "stream",
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 15000,
    });
    const writer = fs.createWriteStream(filepath);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    console.log(`✅ Image  saved to ${filepath}`);
    return filepath;
  } catch (err) {
    console.error("❌ Failed to download image:", err.message);
    return null;
  }
}
async function extractImageFromArticle(articleUrl) {
  try {
    console.log("Extracting image from article:", articleUrl);
    console.log("hi");

    const { data: html } = await axios.get(articleUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      },
      timeout: 10000,
    });
    const $ = cheerio.load(html);

    let img = $('meta[property="og:image"]').attr("content");
    if (img) return img;

    img = $("article img").first().attr("src") || $("img").first().attr("src");
    if (img) return img;
    return null; // no image found
  } catch (err) {
    console.error("Failed to fetch article page:", err.message);
    return null;
  }
}
let feed;
const posted = new Set();
const parseData = async () => {
  feed = await parser.parseURL("https://saurahaonline.com/rss");
  if (!feed.items || feed.items.length === 0) {
    console.log("No items in feed");
    return;
  }
  for (let item of feed.items) {
    posted.add(item);
  }
  return;
};
cron.schedule(" 0 * * * *", () => {
  console.log("cron running");
  (async () => {
    try {
      await parseData();
      for (let allitem of posted) {
        // Remove item from posted set after processing
        posted.delete(allitem);
        let dataFinal = allitem["content:encoded"]
          .replace(/<\/?[^>]+(>|$)/g, "")
          .trim();
        const imageUrl = await extractImageFromArticle(allitem.link); // cheerio
        console.log("Image for post:", imageUrl || "No image found");
        const savedImagePath = await downloadImage(imageUrl, "./public/images");
        console.log(savedImagePath);
        const idValue = await mediaId(savedImagePath);
        await postToFb(dataFinal, idValue);
        // Remove only the downloaded image file, not the whole folder
        if (savedImagePath && fs.existsSync(savedImagePath)) {
          fs.unlinkSync(savedImagePath);
        }
        return;
      }
    } catch (err) {
      console.error("Error fetching RSS feed:", err.message);
    }
  })();
  return;
});
app.listen(3000);
