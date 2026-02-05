import { getPlansWithUserCount } from "@/lib/dal";
import { PlansClient } from "./plans-client";

export default async function PlansPage() {
	const plans = await getPlansWithUserCount();

	return <PlansClient plans={plans} />;
}
