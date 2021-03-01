const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const port = 8080;

// Parse JSON bodies (as sent by API clients)
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
const { connection } = require("./connector");

app.get("/totalRecovered", async (req, res) => {
  const value = await connection.aggregate([
    { $group: { _id: "total", recovered: { $sum: "$recovered" } } },
  ]);
  res.send({ data: value[0] });
});

app.get("/totalActive", async (req, res) => {
  const value = await connection.aggregate([
    {
      $project: {
        active: { $subtract: ["$infected", "$recovered"] },
      },
    },
    { $group: { _id: "total", active: { $sum: "$active" } } },
  ]);
  res.send({ data: value[0] });
});

app.get("/totalDeath", async (req, res) => {
  const value = await connection.aggregate([
    {
      $group: { _id: "total", death: { $sum: "$death" } },
    },
  ]);
  res.send({ data: value[0] });
});

app.get("/hotspotStates", async (req, res) => {
  const value = await connection.aggregate([
    {
      $project: {
        _id: 0,
        state: "$state",
        infected: "$infected",
        hotspot: { $subtract: ["$infected", "$recovered"] },
      },
    },
    {
      $project: {
        _id: 0,
        state: "$state",
        // infected: "$infected",
        hotspot: { $divide: ["$hotspot", "$infected"] },
      },
    },
    {
      $project: {
        _id: 0,
        state: "$state",
        // infected: "$infected",
        rate: { $round: ["$hotspot", 5] },
      },
    },
    {
      $match: { rate: { $gt: 0.1 } },
    },
  ]);
  res.send({ data: value });
});

app.get("/healthyStates", async (req, res) => {
  const value = await connection.aggregate([
    {
      $project: {
        _id: 0,
        state: "$state",
        mortality: { $divide: ["$death", "$infected"] },
      },
    },
    {
      $project: {
        _id: 0,
        state: "$state",
        mortality: { $round: ["$mortality", 5] },
      },
    },
    {
      $match: {
        mortality: { $lt: 0.005 },
      },
    },
  ]);
  res.send({ data: value });
});

app.listen(port, () => console.log(`App listening on port ${port}!`));

module.exports = app;