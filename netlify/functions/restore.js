const fetch = require("node-fetch");

exports.handler = async function (event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { image } = JSON.parse(event.body);

    // ১. বেস৬৪ ইমেজ থেকে আসল ইমেজ ডেটা বের করা
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    // ২. Hugging Face API কল করা (বিনামূল্যে)
    // আমরা এখানে 'bgs/ESRGAN' মডেল ব্যবহার করছি যা ছবি ক্লিয়ার করে
    const response = await fetch(
      "https://api-inference.huggingface.co/models/bgs/ESRGAN",
      {
        headers: {
          Authorization: `Bearer ${process.env.HF_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        body: buffer,
      }
    );

    // ৩. যদি সার্ভার বিজি থাকে
    if (!response.ok) {
        const err = await response.text();
        return { statusCode: 500, body: JSON.stringify({ error: "Free server is busy. Try again in 1 min." }) };
    }

    // ৪. রেজাল্ট প্রসেস করা
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