import express from "express";
import cors from "cors";
import "dotenv/config";

const app = express();

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ message: "Backend is running!" });
});

app.listen(3001, () => {
  console.log("Backend: http://localhost:3001");
});