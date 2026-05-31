import ReactDOM from "react-dom/client";
import App from "./App";
import "./style.css";

document.documentElement.classList.toggle(
  "dark",
  window.matchMedia("(prefers-color-scheme: dark)").matches,
);

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
