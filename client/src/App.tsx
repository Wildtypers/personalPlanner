import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import MyTasks from "./pages/MyTasks";
import TaskDetails from "./pages/TaskDetails";
import "./App.css";

function App() {
	return (
		<BrowserRouter>
			<header className="site-header">
				<nav className="site-nav" aria-label="Main navigation">
					<Link to="/" className="brand">
						<span className="brand-mark" aria-hidden="true">✓</span>
						Next Step
					</Link>

					<Link to="/">My Tasks</Link>
				</nav>
			</header>

			<Routes>
				<Route path="/" element={<MyTasks />} />
				<Route path="/tasks/:id" element={<TaskDetails />} />
			</Routes>
		</BrowserRouter>
	);
}

export default App;