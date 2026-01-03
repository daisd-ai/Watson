import "./App.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import MainPage from "./MainPage";
import TaskDetailComponent from "./TaskDetailComponent";

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/task/:taskId" element={<TaskDetailComponent />} />
      </Routes>
    </Router>
  );
};

export default App;
