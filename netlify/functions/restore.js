const fetch = require("node-fetch");

exports.handler = async function (event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { image } = JSON.parse(event.body);

    // বেস৬৪ ইমেজ ক্লিন করা
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    // Hugging Face API (ESRGAN Model)
    const API_URL = "https://api-inference.huggingface.co/models/bgs/ESRGAN";
    
    // অটোমেটিক রি-ট্রাই ফাংশন (সর্বোচ্চ ৫ বার চেষ্টা করবে)
    async function queryWithRetry(data, retries = 5) {
      const response = await fetch(API_URL, {
        headers: {
          Authorization: `Bearer ${process.env.HF_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        body: data,
      });

      // যদি সার্ভার বিজি থাকে (503 Error)
      if (response.status === 503) {
        if (retries > 0) {
          console.log("Model loading... waiting 10s");
          // ১০ সেকেন্ড অপেক্ষা করবে
          await new Promise((resolve) => setTimeout(resolve, 10000));
          // আবার চেষ্টা করবে
          return queryWithRetry(data, retries - 1);
        } else {
          throw new Error("Server is taking too long. Please try again later.");
        }
      }

      // যদি অন্য কোনো এরর হয়
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API Error: ${errText}`);
      }

      return response;
    }

    // আসল কল শুরু
    const response = await queryWithRetry(buffer);

    // রেজাল্ট প্রসেস করা
    const arrayBuffer = await response.arrayBuffer();
    const resultBuffer = Buffer.from(arrayBuffer);
    const outputBase64 = `data:image/jpeg;base64,${resultBuffer.toString("base64")}`;

    return {
      statusCode: 200,
      body: JSON.stringify({ output: outputBase64 }),
    };

  } catch (error) {
    console.error(error);
    return {
      statusCo