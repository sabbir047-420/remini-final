const fetch = require("node-fetch");

exports.handler = async function (event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { image } = JSON.parse(event.body);

    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    // নতুন আপডেটেড লিংক (Hugging Face Router URL)
    const response = await fetch(
      "https://router.huggingface.co/models/bgs/ESRGAN",
      {
        headers: {
          Authorization: `Bearer ${process.env.HF_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        body: buffer,
      }
    );

    // ১. মডেল চালু হতে দেরি হলে
    if (response.status === 503) {
        return {
            statusCode: 503,
            body: JSON.stringify({ error: "Model is waking up! Please wait 20 seconds and click Enhance again." })
        };
    }

    // ২. অন্য কোনো সমস্যা হলে
    if (!response.ok) {
        const errText = await response.text();
        return { statusCode: 500, body: JSON.stringify({ error: `API Error: ${errText}` }) };
    }

    // ৩. সব ঠিক থাকলে
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