const fetch = require("node-fetch");

exports.handler = async function (event, context) {
  // শুধু POST মেথড এলাউ করা হবে
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { image } = JSON.parse(event.body);

    // ১. ইমেজ প্রসেসিং (Base64 ক্লিন করা)
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    // ২. নতুন আপডেটেড লিংক (Router URL) - এটাই এরর ফিক্স করবে
    // আমরা 'Real-ESRGAN' মডেল ব্যবহার করছি যা ছবি একদম HD করে
    const API_URL = "https://router.huggingface.co/models/bgs/ESRGAN";

    const response = await fetch(API_URL, {
      headers: {
        Authorization: `Bearer ${process.env.HF_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      body: buffer,
    });

    // ৩. যদি মডেল চালু হতে দেরি হয় (503 Error)
    if (response.status === 503) {
        return {
            statusCode: 503,
            body: JSON.stringify({ error: "Server is waking up! Please wait 20 seconds and try again." })
        };
    }

    // ৪. অন্য কোনো এরর হলে
    if (!response.ok) {
        const errText = await response.text();
        return { statusCode: 500, body: JSON.stringify({ error: `API Error: ${errText}` }) };
    }

    // ৫. সাকসেস! ছবি রেডি
    const arrayBuffer = await response.arrayBuffer();
    const resultBuffer = Buffer.from(arrayBuffer);
    const outputBase64 = `data:image/jpeg;base64,${resultBuffer.toString("base64")}`;

    return {
      statusCode: 200,
      body: JSON.stringify({ output: outputBase64 }),
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Unknown Error" }),
    };
  }
};