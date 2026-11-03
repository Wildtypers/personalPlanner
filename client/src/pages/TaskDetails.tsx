import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";

type Task = {
	id: number;
	title: string;
	completed: number;
	total: number;
	requirements: string | null;
	deadline: string | null;
	available_hours: string | null;
};

type Subtask = {
	id: number;
	task_id: number;
	title: string;
	completed: number;
};

function TaskDetails() {
	const { id } = useParams();
	const [subtasks, setSubtasks] = useState<Subtask[]>([]);
	const [subtasksError, setSubtasksError] = useState("");
	const [task, setTask] = useState<Task | null>(null);
	const [error, setError] = useState("");
	const [subtaskTitle, setSubtaskTitle] = useState("");
	const [isAdding, setIsAdding] = useState(false);
	const [addError, setAddError] = useState("");
	const [updatingId, setUpdatingId] = useState<number | null>(null);
	const [updateError, setUpdateError] = useState("");
	const [isEditingTitle, setIsEditingTitle] = useState(false);
	const [editedTitle, setEditedTitle] = useState("");
	const [isSavingTitle, setIsSavingTitle] = useState(false);
	const [titleError, setTitleError] = useState("");
	const [suggestions, setSuggestions] = useState<string[]>([]);
	const [isGenerating, setIsGenerating] = useState(false);
	const [savingSuggestion, setSavingSuggestion] = useState<string | null>(null);
	const [generationError, setGenerationError] = useState("");
	const [generationMessage, setGenerationMessage] = useState("");

	useEffect(() => {
		let ignore = false;

		setSubtasks([]);
		setSubtasksError("");

		axios
			.get<Subtask[]>(`http://localhost:3001/api/tasks/${id}/subtasks`)
			.then((response) => {
				if (!ignore) {
					setSubtasks(response.data);
				}
			})
			.catch(() => {
				if (!ignore) {
					setSubtasksError("Could not load subtasks.");
				}
			});

		return () => {
			ignore = true;
		};
	}, [id]);

	useEffect(() => {
		let ignore = false;

		setTask(null);
		setError("");

		axios
			.get<Task>(`http://localhost:3001/api/tasks/${id}`)
			.then((response) => {
				if (!ignore) {
					setTask(response.data);
				}
			})
			.catch((error) => {
				if (!ignore) {
					setError(
						axios.isAxiosError(error) &&
						error.response?.status === 404
							? "Task not found."
							: "Could not load task."
					);
				}
			});

		return () => {
			ignore = true;
		};
	}, [id]);

	async function handleAddSubtask() {
		const title = subtaskTitle.trim();

		if (title === "" || isAdding) {
			return;
		}

		setIsAdding(true);
		setAddError("");

		try {
			const response = await axios.post<Subtask>(
				`http://localhost:3001/api/tasks/${id}/subtasks`,
				{ title }
			);

			setSubtasks((previousSubtasks) => [
				...previousSubtasks,
				response.data,
			]);

			setSubtaskTitle("");
		} catch {
			setAddError("Could not add step. Please try again.");
		} finally {
			setIsAdding(false);
		}
	}

	async function handleToggleSubtask(subtask: Subtask) {
		const completed = subtask.completed === 0;

		setUpdatingId(subtask.id);
		setUpdateError("");

		try {
			await axios.patch(
				`http://localhost:3001/api/subtasks/${subtask.id}`,
				{ completed }
			);

			setSubtasks((previousSubtasks) =>
				previousSubtasks.map((step) =>
					step.id === subtask.id
						? { ...step, completed: completed ? 1 : 0 }
						: step
				)
			);
		} catch {
			setUpdateError("Could not update step. Please try again.");
		} finally {
			setUpdatingId(null);
		}
	}

	const totalSteps = subtasks.length;
	const completedSteps = subtasks.filter(
		(subtask) => subtask.completed === 1
	).length;


	async function handleDeleteSubtask(subtaskId: number) {
		setUpdatingId(subtaskId);
		setUpdateError("");

		try {
			await axios.delete(
				`http://localhost:3001/api/subtasks/${subtaskId}`
			);

			setSubtasks((previousSubtasks) =>
				previousSubtasks.filter(
					(subtask) => subtask.id !== subtaskId
				)
			);
		} catch {
			setUpdateError("Could not delete step. Please try again.");
		} finally {
			setUpdatingId(null);
		}
	}

	async function handleSaveTitle() {
		const title = editedTitle.trim();

		if (title === "" || isSavingTitle) {
			return;
		}

		setIsSavingTitle(true);
		setTitleError("");

		try {
			const response = await axios.patch<{ id: number; title: string }>(
				`http://localhost:3001/api/tasks/${id}`,
				{ title }
			);

			setTask((previousTask) =>
				previousTask
					? { ...previousTask, title: response.data.title }
					: null
			);

			setIsEditingTitle(false);
		} catch {
			setTitleError("Could not rename task. Please try again.");
		} finally {
			setIsSavingTitle(false);
		}
	}

	async function handleGenerateSteps() {
		if (isGenerating) return;

		setIsGenerating(true);
		setGenerationError("");
		setGenerationMessage("");

		try {
			const response = await axios.post<{ steps: string[] }>(
				`http://localhost:3001/api/tasks/${id}/generate`,
				{},
				{ timeout: 70000 }
			);

			setSuggestions(response.data.steps);

			if (response.data.steps.length === 0) {
				setGenerationMessage("No new steps were suggested.");
			}
		} catch (error) {
			setGenerationError(
				axios.isAxiosError(error)
					? error.response?.data?.error || "Could not generate steps."
					: "Could not generate steps."
			);
		} finally {
			setIsGenerating(false);
		}
	}

	async function handleSaveSuggestion(title: string) {
		if (savingSuggestion !== null) return;

		setSavingSuggestion(title);
		setGenerationError("");

		try {
			const response = await axios.post<Subtask>(
				`http://localhost:3001/api/tasks/${id}/subtasks`,
				{ title }
			);

			setSubtasks((previous) => [...previous, response.data]);

			setSuggestions((previous) =>
				previous.filter((suggestion) => suggestion !== title)
			);
		} catch {
			setGenerationError("Could not save this step. Please try again.");
		} finally {
			setSavingSuggestion(null);
		}
	}

	return (
		<main>
			<Link to="/">← My Tasks</Link>

			{error ? (
				<p role="alert">{error}</p>
			) : task ? (
				<>
					<h1>{task.title}</h1>

					{isEditingTitle ? (
						<div>
							<label htmlFor="edit-task-title">Task title</label>
							<input
								id="edit-task-title"
								type="text"
								value={editedTitle}
								onChange={(event) => setEditedTitle(event.target.value)}
								maxLength={255}
								disabled={isSavingTitle}
							/>

							<button
								type="button"
								onClick={handleSaveTitle}
								disabled={editedTitle.trim() === "" || isSavingTitle}
							>
								{isSavingTitle ? "Saving..." : "Save title"}
							</button>

							<button
								type="button"
								onClick={() => {
									setIsEditingTitle(false);
									setTitleError("");
								}}
								disabled={isSavingTitle}
							>
								Cancel
							</button>
						</div>
					) : (
						<button
							type="button"
							onClick={() => {
								setEditedTitle(task.title);
								setTitleError("");
								setIsEditingTitle(true);
							}}
						>
							Edit title
						</button>
					)}

					{titleError && <p role="alert">{titleError}</p>}

					<section>
						<h2>Task context</h2>

						<h3>Requirements</h3>
						<p style={{ whiteSpace: "pre-wrap" }}>
							{task.requirements || "No requirements added."}
						</p>

						<p>Deadline: {task.deadline || "Not set"}</p>

						<p>
							Available hours: {task.available_hours ?? "Not set"}
						</p>
					</section>

					<p>Task ID: {task.id}</p>

					{totalSteps > 0 ? (
						<>
							<p>
								{completedSteps} of {totalSteps} steps completed
							</p>
							<progress value={completedSteps} max={totalSteps} />
						</>
					) : (
						<p>No steps yet</p>
					)}
					<section>
						<h2>Your next steps</h2>
						<button
							type="button"
							onClick={handleGenerateSteps}
							disabled={
								isGenerating ||
								savingSuggestion !== null ||
								suggestions.length > 0
							}
						>
							{isGenerating ? "Generating..." : "Generate steps"}
						</button>

						<p>
							Your task details and existing steps will be sent to Gemini.
							Review suggestions before adding them.
						</p>

						{generationError && <p role="alert">{generationError}</p>}
						{generationMessage && <p>{generationMessage}</p>}

						{suggestions.length > 0 && (
							<section>
								<h3>Suggested steps — not saved yet</h3>

								<ul>
									{suggestions.map((suggestion) => (
										<li key={suggestion}>
											<span>{suggestion}</span>

											<button
												type="button"
												onClick={() => handleSaveSuggestion(suggestion)}
												disabled={savingSuggestion !== null}
											>
												{savingSuggestion === suggestion ? "Adding..." : "Add"}
											</button>

											<button
												type="button"
												onClick={() =>
													setSuggestions((previous) =>
														previous.filter((step) => step !== suggestion)
													)
												}
												disabled={savingSuggestion !== null}
											>
												Dismiss
											</button>
										</li>
									))}
								</ul>
							</section>
						)}
												{updateError && <p role="alert">{updateError}</p>}
						<label htmlFor="subtask-title">Step name</label>
						<input
							id="subtask-title"
							type="text"
							placeholder="What is the next small action?"
							value={subtaskTitle}
							onChange={(event) => setSubtaskTitle(event.target.value)}
							maxLength={255}
							disabled={isAdding}
						/>

						<button
							type="button"
							onClick={handleAddSubtask}
							disabled={subtaskTitle.trim() === "" || isAdding}
						>
							{isAdding ? "Adding..." : "Add step"}
						</button>

						{addError && <p role="alert">{addError}</p>}

						{subtasksError ? (
							<p role="alert">{subtasksError}</p>
						) : (
							<ul>
								{subtasks.map((subtask) => (
									<li key={subtask.id}>
										<label>
											<input
												type="checkbox"
												checked={subtask.completed === 1}
												onChange={() => handleToggleSubtask(subtask)}
												disabled={updatingId !== null}
											/>
											{subtask.title}
										</label>
										<button
											type="button"
											onClick={() => handleDeleteSubtask(subtask.id)}
											disabled={updatingId !== null}
										>
											Delete
										</button>
									</li>
								))}
							</ul>
						)}
					</section>
				</>
			) : (
				<p>Loading task...</p>
			)}
		</main>
	);
}

export default TaskDetails;