// server/index.js
require("dotenv").config();
const app = require("./app");
const prisma = require("./services/prisma");

const requiredEnvVars = ["JWT_SECRET", "DATABASE_URL"];
const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingEnvVars.length > 0) {
	console.error(`❌ Missing required environment variables: ${missingEnvVars.join(", ")}. Exiting.`);
	process.exit(1);
}

const BASE_PORT = parseInt(process.env.PORT, 10) || 5000;
const MAX_RETRIES = 5;

let activeServer = null;

const shutdown = async (signal) => {
	try {
		if (activeServer) {
			await new Promise((resolve) => activeServer.close(resolve));
		}
		await prisma.$disconnect();
		console.log(`🔌 Prisma disconnected on ${signal}. Goodbye.`);
		process.exit(0);
	} catch (err) {
		console.error("❌ Error during shutdown:", err.message);
		process.exit(1);
	}
};

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

const startServer = (port, retriesLeft) => {
	const server = app.listen(port);
	activeServer = server;

	server
		.on("listening", () => {
			console.log(`🚀 Server running on http://localhost:${port}`);
		})
		.on("error", (err) => {
			if (err.code === "EADDRINUSE" && retriesLeft > 0) {
				console.warn(`⚠️  Port ${port} is busy, trying ${port + 1}...`);
				server.close(() => startServer(port + 1, retriesLeft - 1));
				return;
			}

			console.error("❌ Failed to start server:", err.message);
			process.exit(1);
		});
};

startServer(BASE_PORT, MAX_RETRIES);
