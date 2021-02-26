const express = require("express");
const app = express();
const round = require("mongo-round");
const bodyParser = require("body-parser");
const port = 8080;

// Parse JSON bodies (as sent by API clients)
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
const { connection } = require("./connector");

app.get("/totalRecovered", async (req, res) => {
  const result = await connection.aggregate([
    {
      $group: {
        _id: "total",
        recovered: {
          $sum: "$recovered",
        },
      },
    },
  ]);
  res.send({ data: result[0] });
});


app.get("/totalActive", async (req, res) => {
  const result = await connection.aggregate([
    {
      $group: {
        _id: "total",
        totalInfected: {
          $sum: "$infected",
        },
        totalRecovered: {
          $sum: "$recovered",
        },
      },
    },
    {
      $addFields: {
        active: { $subtract: ["$totalInfected", "$totalRecovered"] },
      },
    },
    {
      $project: {
        _id: "total",
        active: "$active",
      },
    },
  ]);
  res.send({ data: result[0] });
});

app.get("/totalDeath", async (req, res) => {
  const result = await connection.aggregate([
    {
      $group: {
        _id: "total",
        death: {
          $sum: "$death",
        },
      },
    },
  ]);
  res.send({ data: result[0] });
});

app.get("/hotspotStates", async (req, res) => {
  const result = await connection.aggregate([
    {
      $group: {
        _id: "$state",
        rate: {
          $sum: { $divide: [{ $subtract: ["$infected", "$recovered"] }, "$infected"]},
        },
      },
    },
    {
      $match: {
        rate: {
          $gt: 0.1,
        },
      },
    },

    {
      $project: {
        state: "$_id",
        _id: 0,
        rate: {$round:["$rate", 5]},
      },
    },
  ]);
  res.send({ data: result });
});

app.get("/healthyStates", async (req, res) => {
  const result = await connection.aggregate([
    {
      $group: {
        _id: "$state",
        mortality: { $sum: { $divide: ["$death", "$infected"] } },
      },
    },
    {
      $match: {
        mortality: {
          $lt: 0.005,
        },
      },
    },
    {
      $project: {
        state: "$_id",
        _id: 0,
        mortality: {$round:["$mortality", 5]},
      },
    },
  ]);
  res.send({ data: result });
});

app.listen(port, () => console.log(`App listening on port ${port}!`));

module.exports = app;