import express from "express";
import cors from "cors";
import "dotenv/config";
import db from "./db";
import type { ResultSetHeader } from "mysql2";

const app = express();

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ message: "Backend is running!" });
});

const tasks = [
	{ id: 1, title: "Finish React project", completed: 2, total: 5 },
	{ id: 2, title: "CS 70 problem set", completed: 0, total: 4 },
	{ id: 3, title: "Review EE lecture", completed: 3, total: 3 },
];

let nextTaskId = 4;

app.get("/api/tasks", async (_req, res) => {
	try {
		const [rows] = await db.query(
			"SELECT id, title, completed, total FROM tasks ORDER BY id"
		);

		res.json(rows);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Could not load tasks." });
	}
});

app.post("/api/tasks", async (req, res) => {
	const title = req.body?.title;

	if (
		typeof title !== "string" ||
		title.trim() === "" ||
		title.trim().length > 255
	) {
		res.status(400).json({
			error: "A title between 1 and 255 characters is required.",
		});
		return;
	}

	try {
		const [result] = await db.execute<ResultSetHeader>(
			"INSERT INTO tasks (title) VALUES (?)",
			[title.trim()]
		);

		res.status(201).json({
			id: result.insertId,
			title: title.trim(),
			completed: 0,
			total: 0,
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Could not create task." });
	}
});

app.delete("/api/tasks/:id", async (req, res) => {
	const taskId = Number(req.params.id);

	if (!Number.isSafeInteger(taskId) || taskId <= 0) {
		res.status(400).json({ error: "Invalid task ID." });
		return;
	}

	try {
		const [result] = await db.execute<ResultSetHeader>(
			"DELETE FROM tasks WHERE id = ?",
			[taskId]
		);

		if (result.affectedRows === 0) {
			res.status(404).json({ error: "Task not found." });
			return;
		}

		res.status(204).send();
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Could not delete task." });
	}
});

db.query("SELECT 1")
	.then(() => {
		console.log("MySQL connected successfully!");
	})
	.catch((error) => {
		console.error("MySQL connection failed:", error.message);
	});

app.listen(3001, () => {
  console.log("Backend: http://localhost:3001");
});