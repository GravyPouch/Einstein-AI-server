const express = require("express");
const app = express();
const fs = require("fs");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
require("dotenv").config();
const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

async function openaiCall() {
  const completion = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: "Hello world" }],
  });
  return completion.data.choices[0].message.content;
}

// This method will save the binary content of the request as a file.
app.post("/binary-upload", async (req, res) => {
  console.log("Saving file");
  req.pipe(fs.createWriteStream("./uploads/image" + Date.now() + ".png"));
  let answer = await openaiCall();
  console.log(answer);
  res.send({ answer: answer });
});

// This method will save a "photo" field from the request as a file.
app.post("/multipart-upload", upload.single("photo"), (req, res) => {
  // You can access other HTTP parameters. They are located in the body object.
  console.log(req.body);
  res.end("OK");
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(3000, () => {
  console.log("Working on port 3000");
});
