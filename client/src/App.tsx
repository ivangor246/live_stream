import { Navigate, Route, Routes } from "react-router-dom";

import { StreamPage } from "./pages/StreamPage.js";
import { StreamsPage } from "./pages/StreamsPage.js";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<StreamsPage />} />

      <Route path="/streams/:streamId" element={<StreamPage />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
