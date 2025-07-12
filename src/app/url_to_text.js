import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<string>
) {
  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed");
  }

  const { url } = req.body;

  if (!url) {
    return res.status(400).send("URL is required");
  }

  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      timeout: 10000,
    });

    const dom = new JSDOM(response.data);
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) {
      return res
        .status(400)
        .send("Could not extract readable content from the URL");
    }

    const textContent = article.textContent || "";

    res.setHeader("Content-Type", "text/plain");
    res.status(200).send(textContent);
  } catch (error) {
    console.error("Scraping error:", error);
    res
      .status(500)
      .send(
        "Failed to scrape the URL. Please check if the URL is valid and accessible."
      );
  }
}
