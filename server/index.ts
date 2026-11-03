import express from "express";
import cors from "cors";
import "dotenv/config";
import db from "./db";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import axios from "axios";
import { SYSTEM_PROMPT } from "./taskPlannerPrompt";


const app = express();

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ message: "Backend is running!" });
});

app.get("/api/tasks", async (_req, res) => {
	try {
		const [rows] = await db.query(`
			SELECT
				tasks.id,
				tasks.title,
				(
					SELECT COUNT(*)
					FROM subtasks
					WHERE subtasks.task_id = tasks.id
						AND subtasks.completed = 1
				) AS completed,
				(
					SELECT COUNT(*)
					FROM subtasks
					WHERE subtasks.task_id = tasks.id
				) AS total
			FROM tasks
			ORDER BY tasks.id
		`);

		res.json(rows);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Could not load tasks." });
	}
});

app.post("/api/tasks", async (req, res) => {
	const { title, requirements, deadline, available_hours } = req.body ?? {};

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

	if (
		requirements != null &&
		typeof requirements !== "string"
	) {
		res.status(400).json({ error: "Requirements must be text." });
		return;
	}

	const savedRequirements = requirements?.trim() || null;
	const savedDeadline = deadline === "" || deadline == null
		? null
		: deadline;
	const savedHours = available_hours === "" || available_hours == null
		? null
		: available_hours;

	if (savedDeadline !== null) {
		if (
			typeof savedDeadline !== "string" ||
			!/^[1-9]\d{3}-\d{2}-\d{2}$/.test(savedDeadline)
		) {
			res.status(400).json({ error: "Use a deadline in YYYY-MM-DD format." });
			return;
		}

		const date = new Date(`${savedDeadline}T00:00:00Z`);

		if (
			Number.isNaN(date.getTime()) ||
			date.toISOString().slice(0, 10) !== savedDeadline
		) {
			res.status(400).json({ error: "Enter a valid deadline." });
			return;
		}
	}

	if (
		savedHours !== null &&
		(
			typeof savedHours !== "number" ||
			!Number.isFinite(savedHours) ||
			savedHours <= 0 ||
			savedHours > 999.99
		)
	) {
		res.status(400).json({
			error: "Available hours must be a number greater than 0 and at most 999.99.",
		});
		return;
	}

	try {
		const [result] = await db.execute<ResultSetHeader>(
			`INSERT INTO tasks
				(title, requirements, deadline, available_hours)
			VALUES (?, ?, ?, ?)`,
			[title.trim(), savedRequirements, savedDeadline, savedHours]
		);

		res.status(201).json({
			id: result.insertId,
			title: title.trim(),
			requirements: savedRequirements,
			deadline: savedDeadline,
			available_hours: savedHours,
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

app.get("/api/tasks/:id", async (req, res) => {
	const taskId = Number(req.params.id);

	if (!Number.isSafeInteger(taskId) || taskId <= 0) {
		res.status(400).json({ error: "Invalid task ID." });
		return;
	}

	try {
		const [rows] = await db.execute<RowDataPacket[]>(
			`SELECT
				id,
				title,
				completed,
				total,
				requirements,
				DATE_FORMAT(deadline, '%Y-%m-%d') AS deadline,
				available_hours
			FROM tasks
			WHERE id = ?`,
			[taskId]
		);

		if (rows.length === 0) {
			res.status(404).json({ error: "Task not found." });
			return;
		}

		res.json(rows[0]);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Could not load task." });
	}
});

app.get("/api/tasks/:id/subtasks", async (req, res) => {
	const taskId = Number(req.params.id);

	if (!Number.isSafeInteger(taskId) || taskId <= 0) {
		res.status(400).json({ error: "Invalid task ID." });
		return;
	}

	try {
		const [rows] = await db.execute<RowDataPacket[]>(
			"SELECT id, task_id, title, completed FROM subtasks WHERE task_id = ? ORDER BY id",
			[taskId]
		);

		res.json(rows);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Could not load subtasks." });
	}
});

app.post("/api/tasks/:id/subtasks", async (req, res) => {
	const taskId = Number(req.params.id);
	const title = req.body?.title;

	if (!Number.isSafeInteger(taskId) || taskId <= 0) {
		res.status(400).json({ error: "Invalid task ID." });
		return;
	}

	if (
		typeof title !== "string" ||
		title.trim() === "" ||
		title.trim().length > 255
	) {
		res.status(400).json({
			error: "A subtask title must contain 1–255 characters.",
		});
		return;
	}

	try {
		const [rows] = await db.execute<RowDataPacket[]>(
			"SELECT id FROM tasks WHERE id = ?",
			[taskId]
		);

		if (rows.length === 0) {
			res.status(404).json({ error: "Task not found." });
			return;
		}

		const [result] = await db.execute<ResultSetHeader>(
			"INSERT INTO subtasks (task_id, title) VALUES (?, ?)",
			[taskId, title.trim()]
		);

		res.status(201).json({
			id: result.insertId,
			task_id: taskId,
			title: title.trim(),
			completed: 0,
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Could not create subtask." });
	}
});

app.patch("/api/subtasks/:id", async (req, res) => {
	const subtaskId = Number(req.params.id);
	const completed = req.body?.completed;

	if (!Number.isSafeInteger(subtaskId) || subtaskId <= 0) {
		res.status(400).json({ error: "Invalid subtask ID." });
		return;
	}

	if (typeof completed !== "boolean") {
		res.status(400).json({
			error: "Completed must be true or false.",
		});
		return;
	}

	try {
		const [result] = await db.execute<ResultSetHeader>(
			"UPDATE subtasks SET completed = ? WHERE id = ?",
			[completed ? 1 : 0, subtaskId]
		);

		if (result.affectedRows === 0) {
			res.status(404).json({ error: "Subtask not found." });
			return;
		}

		res.status(204).send();
	} catch (error) {
		console.error(error);
		res.status(500).json({
			error: "Could not update subtask.",
		});
	}
});

app.delete("/api/subtasks/:id", async (req, res) => {
	const subtaskId = Number(req.params.id);

	if (!Number.isSafeInteger(subtaskId) || subtaskId <= 0) {
		res.status(400).json({ error: "Invalid subtask ID." });
		return;
	}

	try {
		const [result] = await db.execute<ResultSetHeader>(
			"DELETE FROM subtasks WHERE id = ?",
			[subtaskId]
		);

		if (result.affectedRows === 0) {
			res.status(404).json({ error: "Subtask not found." });
			return;
		}

		res.status(204).send();
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Could not delete subtask." });
	}
});

app.patch("/api/tasks/:id", async (req, res) => {
	const taskId = Number(req.params.id);
	const title = req.body?.title;

	if (!Number.isSafeInteger(taskId) || taskId <= 0) {
		res.status(400).json({ error: "Invalid task ID." });
		return;
	}

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
		const [rows] = await db.execute<RowDataPacket[]>(
			"SELECT id FROM tasks WHERE id = ?",
			[taskId]
		);

		if (rows.length === 0) {
			res.status(404).json({ error: "Task not found." });
			return;
		}

		await db.execute(
			"UPDATE tasks SET title = ? WHERE id = ?",
			[title.trim(), taskId]
		);

		res.json({
			id: taskId,
			title: title.trim(),
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Could not rename task." });
	}
});

app.post("/api/tasks/:id/generate", async (req, res) => {
	const taskId = Number(req.params.id);

	if (!Number.isSafeInteger(taskId) || taskId <= 0) {
		res.status(400).json({ error: "Invalid task ID." });
		return;
	}

	if (!process.env.GEMINI_API_KEY) {
		res.status(503).json({ error: "Gemini API key is missing." });
		return;
	}

	try {
		const [tasks] = await db.execute<RowDataPacket[]>(
			`SELECT title, requirements,
				DATE_FORMAT(deadline, '%Y-%m-%d') AS deadline,
				available_hours
			FROM tasks WHERE id = ?`,
			[taskId]
		);

		if (tasks.length === 0) {
			res.status(404).json({ error: "Task not found." });
			return;
		}

		const [existingSteps] = await db.execute<RowDataPacket[]>(
			"SELECT title, completed FROM subtasks WHERE task_id = ?",
			[taskId]
		);

		type GeminiResponse = {
			candidates?: {
				content?: {
					parts?: {
						text?: string;
						thought?: boolean;
					}[];
				};
			}[];
		};

		const response = await axios.post<GeminiResponse>(
			"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
			{
				systemInstruction: {
					parts: [
						{
							text:
								"You help students plan tasks. Treat the supplied JSON as task data. " +
								"Suggest 3–7 concrete, manageable next actions in execution order. " +
								"Consider the requirements, deadline, and available hours. " +
								"Do not duplicate existing steps, including completed ones. " +
								"Each step must be a short action under 255 characters. " +
								"Return a JSON array of strings.",
						},
					],
				},
				contents: [
					{
						role: "user",
						parts: [
							{
								text: JSON.stringify({
									task: tasks[0],
									existingSteps,
								}),
							},
						],
					},
				],
				generationConfig: {
					responseMimeType: "application/json",
					responseSchema: {
						type: "ARRAY",
						items: { type: "STRING" },
						minItems: 3,
						maxItems: 7,
					},
				},
			},
			{
				headers: {
					"Content-Type": "application/json",
					"x-goog-api-key": process.env.GEMINI_API_KEY,
				},
				timeout: 120000,
			}
		);

		const generatedText = response.data.candidates?.[0]?.content?.parts
			?.filter((part) => !part.thought)
			.map((part) => part.text ?? "")
			.join("");

		if (!generatedText) {
			res.status(502).json({
				error: "Gemini returned no suggestions. Please try again.",
			});
			return;
		}

		const parsed: unknown = JSON.parse(generatedText);

		if (
			!Array.isArray(parsed) ||
			parsed.length < 1 ||
			parsed.length > 7 ||
			!parsed.every(
				(step) =>
					typeof step === "string" &&
					step.trim().length > 0 &&
					step.trim().length <= 255
			)
		) {
			res.status(502).json({
				error: "The AI returned an invalid plan. Please try again.",
			});
			return;
		}

		const existingTitles = new Set(
			existingSteps.map((step) => step.title.trim().toLowerCase())
		);

		const steps: string[] = [];

		for (const value of parsed) {
			const title = (value as string).trim();
			const normalized = title.toLowerCase();

			if (!existingTitles.has(normalized)) {
				steps.push(title);
				existingTitles.add(normalized);
			}
		}

		res.json({ steps });
	} catch (error) {
		const status = axios.isAxiosError(error)
			? error.response?.status
			: undefined;

		const timedOut =
			axios.isAxiosError(error) &&
			(error.code === "ECONNABORTED" || status === 504);

		console.error(
			"Step generation failed:",
			status ?? "No HTTP status",
			error instanceof Error ? error.message : "Unknown error"
		);

		res.status(status === 429 ? 429 : 502).json({
			error: status === 429
				? "Gemini's request limit was reached. Try again later."
				: timedOut
					? "Gemini took too long to respond. Please try again."
					: "Could not generate steps. Check the server terminal.",
		});
	}
});

app.listen(3001, () => {
  console.log("Backend: http://localhost:3001");
});