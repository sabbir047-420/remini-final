const fetch = require("node-fetch");

exports.handler = async function (event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { image } = JSON.parse(event.body);

    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    // নতুন মডেল: Sberbank AI Real-ESRGAN (অনেক বেশি পাওয়ারফুল)
    // আমরা স্ট্যান্ডার্ড লিংক ব্যবহার করছি, কারণ বড় মডেলগুলো এখানে ভালো চলে
    const API_URL = "https://api-inference.huggingface.co/models/sberbank-ai/Real-ESRGAN";

    const response = await fetch(API_URL, {
        headers: {
          Authorization: `Bearer ${process.env.HF_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        body: buffer,
    });

    // ১. মডেল চালু হতে দেরি হলে (503 Error)
    if (response.status === 503) {
        return {
            statusCode: 503,
            body: JSON.stringify({ error: "Model is waking up! Please wait 30 seconds and click Enhance again." })
        };
    }

    // ২. যদি সার্ভার অন্য লিংক ব্যবহার করতে বলে (Router Error)
    if (response.status === 301 || response.status === 302 || response.status === 307 || response.status === 404) {
         // ব্যাকআপ লিংক দিয়ে চেষ্টা করা হবে
         const backupResponse = await fetch("https://router.huggingface.co/models/sberbank-ai/Real-ESRGAN", {
            headers: {
              Authorization: `Bearer ${process.env.HF_API_TOKEN}`,
              "Content-Type": "application/json",
            },
            method: "POST",
            body: buffer,
        });
        
        if (!backupResponse.ok) {
             const errText = await backupResponse.text();
             return { statusCode: 500, body: JSON.stringify({ error: `Backup API Error: ${errText}` }) };
        }
        
        // ব্যাকআপ সাকসেস হলে
        const arrayBuffer = await backupResponse.arrayBuffer();
        const resultBuffer = Buffer.from(arrayBuffer);
        const outputBase64 = `data:image/jpeg;base64,${resultBuffer.toString("base64")}`;
        return { statusCode: 200, body: JSON.stringify({ output: outputBase64 }) };
    }

    // ৩. সাধারণ এরর হ্যান্ডলিং
    if (!response.ok) {
        const errText = await response.text();
        return { statusCode: 500, body: JSON.stringify({ error: `API Error: ${errText}` }) };
    }

    // ৪. সাকসেস হলে
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