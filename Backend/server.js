import express from "express";
import cors from "cors";
import chatRoutes from "./src/routes/chat_routes.js";
import { connectDB } from "./src/config/db.js";

const app = express();
app.use(cors());
app.use(express.json());

connectDB(); // connect to MongoDB

app.use("/api", chatRoutes);

const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
