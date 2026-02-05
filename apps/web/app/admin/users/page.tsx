import { getAllPlans, getAllUsersWithPlans } from "@/lib/dal";
import { UsersClient } from "./users-client";

export default async function UsersPage() {
	const [users, plans] = await Promise.all([getAllUsersWithPlans(), getAllPlans()]);

	const planOptions = plans.map((p) => ({
		planId: p.planId,
		name: p.name,
	}));

	return <UsersClient users={users} plans={planOptions} />;
}
