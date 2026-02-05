import { getAllUsersWithPlans } from "@/lib/dal";
import { LogArchivesClient } from "./log-archives-client";

export default async function LogArchivesPage() {
	const users = await getAllUsersWithPlans();

	const userOptions = users.map((u) => ({
		id: u.id,
		name: u.name,
		email: u.email,
	}));

	return <LogArchivesClient users={userOptions} />;
}
