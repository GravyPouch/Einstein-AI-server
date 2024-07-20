const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const fs = require("fs");
const multer = require("multer");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads");
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + "-" + Date.now() + ".jpg");
  },
});

const upload = multer({
  storage: storage,
});
require("dotenv").config();
const { Configuration, OpenAIApi } = require("openai");
const jsonParser = bodyParser.json();
const rateLimit = require("express-rate-limit");

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: "There have been to many requests",
});

async function openaiCall(chatMessage) {
  try {
    const completion = await openai.createChatCompletion({
      model: "gpt-4o",
      messages: [{ role: "user", content: chatMessage }],
    });
    return completion.data.choices[0].message.content;
  } catch (error) {
    console.log(error);
  }
}

async function openaiVisionCall(imagePath) {
  console.log(imagePath);
  const img = fs.readFileSync(imagePath);

  // Convert the buffer into a base64-encoded string
  const base64 = Buffer.from(img).toString("base64");
  // Set MIME type for PNG image
  const mimeType = "image/jpg";
  // Create the data URI
  const dataURI = `data:${mimeType};base64,${base64}`;
  try {
    const completion = await openai.createChatCompletion({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "What is the answer to this homework problem? Answer only in plain text, DO NOT USE MARKDOWN.",
            },
            {
              type: "image_url",
              image_url: {
                url: dataURI,
              },
            },
          ],
        },
      ],
    });
    return completion.data.choices[0].message.content;
  } catch (error) {
    console.log(error);
  }
}

let users = [];

// This method will save a "photo" field from the request as a file.
app.post("/problem", limiter, upload.single("photo"), async (req, res) => {
  // You can access other HTTP parameters. They are located in the body object.
  console.log(req.body);
  if (req.body.id == undefined || req.file == undefined) {
    res.send({ status: "Error" });
  }

  const ImgPath = await req.file.filename;

  let answer = await openaiVisionCall(`./uploads/${ImgPath}`);
  console.log(answer);
  res.send({ answer: answer });
});

app.post("/chat", limiter, jsonParser, async (req, res) => {
  console.log(req.body);
  let answer = await openaiCall(req.body.chat);
  res.send({ answer: answer });
});

app.post("/ping", jsonParser, async (req, res) => {
  console.log("User " + req.body.id + " is Online");
  res.send({ status: "Online" });
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(3000, () => {
  console.log("Working on port 3000");
});
