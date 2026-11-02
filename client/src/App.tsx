import { BrowserRouter, Routes, Route } from "react-router-dom";
import MyTasks from "./pages/MyTasks";
import TaskDetails from "./pages/TaskDetails";

function App() {
	return (
		<BrowserRouter>
			<Routes>
				<Route path="/" element={<MyTasks />} />
				<Route path="/tasks/:id" element={<TaskDetails />} />
			</Routes>
		</BrowserRouter>
	);
}

export default App;