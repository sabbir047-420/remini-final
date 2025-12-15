const fetch = require("node-fetch");

exports.handler = async function (event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { image } = JSON.parse(event.body);

    // বেস৬৪ ক্লিন করা
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    // Hugging Face API
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

    // ১. যদি মডেল লোডিং অবস্থায় থাকে (503 Error)
    if (response.status === 503) {
        return {
            statusCode: 503,
            body: JSON.stringify({ error: "Model is waking up! Please wait 20 seconds and click Enhance again." })
        };
    }

    // ২. যদি অন্য কোনো এরর হয়
    if (!response.ok) {
        const errText = await response.text();
        return { statusCode: 500, body: JSON.stringify({ error: `API Error: ${errText}` }) };
    }

    // ৩. সাকসেস হলে
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