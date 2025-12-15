const fetch = require("node-fetch");

exports.handler = async function (event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { image } = JSON.parse(event.body);
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    // আমরা এখানে ২টি শক্তিশালী মডেল রেখেছি। প্রথমটি কাজ না করলে দ্বিতীয়টি চলবে।
    const models = [
        "https://api-inference.huggingface.co/models/sczhou/CodeFormer", // ফেস ফিক্স করার বস (Remini-র মতো)
        "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-x4-upscaler" // ব্যাকআপ
    ];

    let response;
    let lastError;

    // লুপ চালিয়ে দেখা হবে কোন মডেলটি চালু আছে
    for (const modelUrl of models) {
        try {
            console.log("Trying model:", modelUrl);
            response = await fetch(modelUrl, {
                headers: {
                    Authorization: `Bearer ${process.env.HF_API_TOKEN}`,
                    "Content-Type": "application/json",
                },
                method: "POST",
                body: buffer,
            });

            // যদি মডেল লোডিং অবস্থায় থাকে (503 Error), ১৫ সেকেন্ড অপেক্ষা করে আবার চেষ্টা করবে
            if (response.status === 503) {
                await new Promise(r => setTimeout(r, 15000));
                response = await fetch(modelUrl, {
                    headers: {
                        Authorization: `Bearer ${process.env.HF_API_TOKEN}`,
                        "Content-Type": "application/json",
                    },
                    method: "POST",
                    body: buffer,
                });
            }

            if (response.ok) break; // কাজ হলে লুপ থামিয়ে দেবে
            lastError = await response.text();
            
        } catch (e) {
            console.error(e);
            lastError = e.message;
        }
    }

    if (!response || !response.ok) {
        return { statusCode: 500, body: JSON.stringify({ error: "Server busy. Please try again in 1 minute." }) };
    }

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