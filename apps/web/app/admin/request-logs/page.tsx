import { getAllUsersWithPlans } from "@/lib/dal";
import { RequestLogsClient } from "./request-logs-client";

export default async function RequestLogsPage() {
	const users = await getAllUsersWithPlans();

	const userOptions = users.map((u) => ({
		id: u.id,
		name: u.name,
		email: u.email,
	}));

	return <RequestLogsClient users={userOptions} />;
}
