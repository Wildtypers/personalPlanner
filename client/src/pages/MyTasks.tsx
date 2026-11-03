import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

type Task = {
	id: number;
	title: string;
	completed: number;
	total: number;
};

function MyTasks() {
    const [requirements, setRequirements] = useState("");
    const [deadline, setDeadline] = useState("");
    const [availableHours, setAvailableHours] = useState("");
	const [showForm, setShowForm] = useState(false);
    const [taskTitle, setTaskTitle] = useState("");
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loadError, setLoadError] = useState("");

    function handleCreateTask() {
        const title = taskTitle.trim();

        if (title === "") {
            return;
        }

        setLoadError("");

        axios
            .post<Task>("http://localhost:3001/api/tasks", {
                title,
                requirements,
                deadline: deadline || null,
                available_hours:
                    availableHours === "" ? null : Number(availableHours),
            })
            .then((response) => {
                setTasks((previousTasks) => [
                    ...previousTasks,
                    response.data,
                ]);

                setTaskTitle("");
                setRequirements("");
                setDeadline("");
                setAvailableHours("");
                setShowForm(false);
            })
            .catch(() => {
                setLoadError("Could not create task. Please try again.");
            });
    }

    function handleDeleteTask(taskId: number) {
        setLoadError("");

        axios
            .delete(`http://localhost:3001/api/tasks/${taskId}`)
            .then(() => {
                setTasks((previousTasks) =>
                    previousTasks.filter((task) => task.id !== taskId)
                );
            })
            .catch(() => {
                setLoadError("Could not delete task. Please try again.");
            });
    }

    useEffect(() => {
        axios
            .get<Task[]>("http://localhost:3001/api/tasks")
            .then((response) => {
                setTasks(response.data);
            })
            .catch(() => {
                setLoadError("Could not load tasks.");
            });
    }, []);
    
	return (
		<main>
			<h1>My Tasks</h1>  
            {loadError && <p>{loadError}</p>}
			<p>Turn big assignments into clear next steps.</p>
			<button onClick={() => setShowForm(true)}>
				+ New task
			</button>
			{showForm && (
				<section>
					<h2>New task</h2>

					<label htmlFor="task-title">Task name</label>
					<input
                        id="task-title"
                        type="text"
                        placeholder="What do you need to finish?"
                        value={taskTitle}
                        onChange={(event) => setTaskTitle(event.target.value)}
                    />
                    <div>
                        <label htmlFor="task-requirements">Requirements</label>
                        <textarea
                            id="task-requirements"
                            placeholder="What needs to be done?"
                            value={requirements}
                            onChange={(event) => setRequirements(event.target.value)}
                        />
                    </div>

                    <div>
                        <label htmlFor="task-deadline">Deadline</label>
                        <input
                            id="task-deadline"
                            type="date"
                            value={deadline}
                            onChange={(event) => setDeadline(event.target.value)}
                        />
                    </div>

                    <div>
                        <label htmlFor="task-hours">Available hours</label>
                        <input
                            id="task-hours"
                            type="number"
                            min="0.01"
                            max="999.99"
                            step="0.01"
                            placeholder="For example, 6"
                            value={availableHours}
                            onChange={(event) => setAvailableHours(event.target.value)}
                        />
                    </div>
                    <button
                        type="button"
                        onClick={handleCreateTask}
                        disabled={taskTitle.trim() === ""}
                    >
                        Create task
                    </button>
					<button onClick={() => setShowForm(false)}>
						Cancel
					</button>
				</section>
			)}

			{tasks.map((task) => (
				<article key={task.id}>
                    <h2>{task.title}</h2>
                    <Link to={`/tasks/${task.id}`}>
                        Open task
                    </Link>
                    <button
                        type="button"
                        onClick={() => handleDeleteTask(task.id)}
                    >
                        Delete
                    </button>
					{task.total > 0 ? (
                        <>
                            <p>
                                {task.completed} of {task.total} steps completed
                            </p>
                            <progress value={task.completed} max={task.total} />
                        </>
                    ) : (
                        <p>No steps yet</p>
                    )}
				</article>
			))}
		</main>
	);
}

export default MyTasks;