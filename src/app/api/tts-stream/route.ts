import { NextRequest } from "next/server";
import { TextToSpeechClient } from "@google-cloud/text-to-speech";

function debugLog(...args: unknown[]) {
  if (process.env.DEBUG_TTS) {
    console.log("[tts-stream]", ...args);
  }
}

function splitIntoSentences(text: string): string[] {
  const abbreviations = /(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|vs|etc|approx|dept|est|inc|ltd|vol|rev)\./gi;

  let processed = text;
  const placeholders: string[] = [];
  processed = processed.replace(abbreviations, (match) => {
    placeholders.push(match);
    return `__ABBR${placeholders.length - 1}__`;
  });

  const rawSentences = processed.split(/(?<=[.!?])\s+/);

  const sentences = rawSentences
    .map((s) => {
      let restored = s;
      placeholders.forEach((p, i) => {
        restored = restored.replace(`__ABBR${i}__`, p);
      });
      return restored.trim();
    })
    .filter((s) => s.length > 0);

  debugLog(`Split text into ${sentences.length} sentences`);
  return sentences;
}

async function synthesizeSentence(
  client: TextToSpeechClient,
  text: string,
  voice: string,
  languageCode: string,
  speed: number,
  index: number
): Promise<Uint8Array> {
  debugLog(`Synthesizing sentence ${index}: "${text.substring(0, 50)}..." (${text.length} chars)`);
  const startTime = Date.now();

  const [response] = await client.synthesizeSpeech({
    input: { text },
    voice: { languageCode, name: voice },
    audioConfig: { audioEncoding: "MP3" as const, speakingRate: speed },
  });

  if (!response.audioContent) {
    throw new Error(`No audio content for sentence ${index}`);
  }

  const audioBytes = response.audioContent as Uint8Array;
  debugLog(`Sentence ${index} synthesized: ${audioBytes.length} bytes in ${Date.now() - startTime}ms`);
  return audioBytes;
}

export async function POST(request: NextRequest) {
  try {
    const { text, voice = "en-US-Wavenet-D", speed = 1.0 } = await request.json();

    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "Text is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    debugLog(`Received request: ${text.length} chars, voice=${voice}, speed=${speed}`);

    const client = new TextToSpeechClient({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    });

    const languageCode = voice.split("-").slice(0, 2).join("-");
    const sentences = splitIntoSentences(text);

    if (sentences.length === 0) {
      return new Response(JSON.stringify({ error: "No sentences found in text" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    debugLog(`Starting pipelined synthesis of ${sentences.length} sentences`);

    const stream = new ReadableStream({
      async start(controller) {
        const PIPELINE_SIZE = 3;
        let nextToSynthesize = 0;
        let nextToWrite = 0;

        const pending = new Map<number, Promise<Uint8Array>>();

        while (nextToSynthesize < Math.min(PIPELINE_SIZE, sentences.length)) {
          const idx = nextToSynthesize;
          pending.set(
            idx,
            synthesizeSentence(client, sentences[idx], voice, languageCode, speed, idx)
          );
          nextToSynthesize++;
        }

        while (nextToWrite < sentences.length) {
          try {
            const audioBytes = await pending.get(nextToWrite)!;
            pending.delete(nextToWrite);

            debugLog(`Writing sentence ${nextToWrite}: ${audioBytes.length} bytes`);
            controller.enqueue(audioBytes);
            nextToWrite++;

            if (nextToSynthesize < sentences.length) {
              const idx = nextToSynthesize;
              pending.set(
                idx,
                synthesizeSentence(client, sentences[idx], voice, languageCode, speed, idx)
              );
              nextToSynthesize++;
            }
          } catch (err) {
            debugLog(`Error at sentence ${nextToWrite}:`, err);
            controller.error(err);
            return;
          }
        }

        debugLog("Stream complete, all sentences written");
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    debugLog("Error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to start streaming synthesis" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
