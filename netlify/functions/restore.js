const Replicate = require("replicate");

exports.handler = async function (event, context) {
  // শুধু POST মেথড এলাউ করা হবে
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { image } = JSON.parse(event.body);

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    // GFPGAN মডেল রান করা (Remini-র বিকল্প)
    const output = await replicate.run(
      "tencentarc/gfpgan:9283608cc6b7be6b65a8e44983db012355fde4132009bf99d976b2f0896856a3",
      {
        input: {
          img: image,
          version: "v1.4",
          scale: 2
        }
      }
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ output: output }),
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};