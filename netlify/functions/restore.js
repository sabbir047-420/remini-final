const fetch = require("node-fetch");

exports.handler = async function (event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { image } = JSON.parse(event.body);

    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    // ✅ নতুন মডেল: Sberbank AI (Real-ESRGAN)
    // এটি অনেক বেশি পাওয়ারফুল এবং অফিশিয়াল, তাই নট ফাউন্ড হবে না।
    const API_URL = "https://api-inference.huggingface.co/models/sberbank-ai/Real-ESRGAN";

    const response = await fetch(API_URL, {
      headers: {
        Authorization: `Bearer ${process.env.HF_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      body: buffer,
    });

    // ১. যদি মডেল চালু হতে দেরি হয় (503 Error)
    if (response.status === 503) {
       return {
         statusCode: 503,
         body: JSON.stringify({ error: "Model is starting up... Please wait 30 seconds and try again!" })
       };
    }

    // ২. অন্য কোনো এরর হলে
    if (!response.ok) {
        const errText = await response.text();
        return { statusCode: 500, body: JSON.stringify({ error: `Server Error: ${errText}` }) };
    }

    // ৩. সাকসেস
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
      body: JSON.stringify({ error: error.message }),
    };
  }
};