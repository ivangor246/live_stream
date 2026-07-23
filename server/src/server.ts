import { createServer } from "node:http";

import { app } from "./app.js";

const PORT = Number(process.env.PORT ?? 3000);

const httpServer = createServer(app);

httpServer.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
