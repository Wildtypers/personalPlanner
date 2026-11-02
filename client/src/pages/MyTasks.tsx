import { useState } from "react";

const initialTasks = [
	{ id: 1, title: "Finish React project", completed: 2, total: 5 },
	{ id: 2, title: "CS 70 problem set", completed: 0, total: 4 },
	{ id: 3, title: "Review EE lecture", completed: 3, total: 3 },
];

function MyTasks() {
	const [showForm, setShowForm] = useState(false);
    const [taskTitle, setTaskTitle] = useState("");
    const [tasks, setTasks] = useState(initialTasks);

    function handleCreateTask() {
        const title = taskTitle.trim();

        if (title === "") {
            return;
        }

        setTasks((previousTasks) => [
            ...previousTasks,
            {
                id: Math.max(0, ...previousTasks.map((task) => task.id)) + 1,
                title: title,
                completed: 0,
                total: 0,
            },
        ]);

        setTaskTitle("");
        setShowForm(false);
    }

	return (
		<main>
			<h1>My Tasks</h1>
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