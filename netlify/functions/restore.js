const fetch = require("node-fetch");

exports.handler = async function (event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { image } = JSON.parse(event.body);

    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    // ✅ ফাইনাল লিংক (Router URL) + সঠিক মডেল (ai-forever)
    // এরর মেসেজ অনুযায়ী আমরা 'api-inference' সরিয়ে 'router' বসিয়েছি।
    const API_URL = "https://router.huggingface.co/models/ai-forever/Real-ESRGAN";

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
         body: JSON.stringify({ error: "Model is waking up! Please wait 20 seconds and try again." })
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