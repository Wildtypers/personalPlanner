import { Link, useParams } from "react-router-dom";

function TaskDetails() {
	const { id } = useParams();

	return (
		<main>
			<Link to="/">← My Tasks</Link>
			<h1>Task Details</h1>
			<p>Task ID: {id}</p>
		</main>
	);
}

export default TaskDetails;