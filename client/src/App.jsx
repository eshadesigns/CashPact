import { Navigate, Route, Routes } from "react-router-dom";
import BrainDump from "./pages/BrainDump";
import Synthesize from "./pages/Synthesize";
import LoginPage from "./pages/LoginPage";
import { useContract } from "./ContractContext";

export default function App() {
  const { contract } = useContract();

  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/braindump" element={contract ? <BrainDump /> : <Navigate to="/" />} />
      <Route path="/synthesize" element={contract ? <Synthesize /> : <Navigate to="/" />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
