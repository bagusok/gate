import "dotenv/config";

import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "..";

const main = async () => {
	console.log("Running migrations...");
	console.log(process.env.DATABASE_URL);

	await migrate(db, {
		migrationsFolder: `${__dirname}/../migrations`,
	});
	await db.$client.end();
	process.exit(0);
};

void main();
