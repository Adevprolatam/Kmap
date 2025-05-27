import { useState } from "react";
import { TableK } from "../components/table";

export const HomeComponent = () => {
  const [inputVars, setInputVars] = useState("A,B,C,D");

  const handleChange = (e) => {
    setInputVars(e.target.value);
  };

  const variables = inputVars
    .split(",")
    .map((v) => v.trim())
    .filter((v) => v);

  return (
    <div>
      <h1>Mapa de Karnaugh Dinámico</h1>

      <label>Variables (separadas por comas):</label>
      <input
        type="text"
        value={inputVars}
        onChange={handleChange}
        placeholder="Ejemplo: A,B,C,D"
      />

      <TableK variables={variables} />
    </div>
  );
};
export default HomeComponent;