import App from "./App";
import AccessGate from "./components/AccessGate";

export default function ProtectedApp() {
  return (
    <AccessGate>
      <App />
    </AccessGate>
  );
}