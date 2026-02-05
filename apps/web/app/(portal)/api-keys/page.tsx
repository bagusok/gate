import { getUserWithApiKey, verifySession } from "@/lib/dal";
import { ApiKeyDisplay } from "./api-key-display";

export default async function ApiKeysPage() {
	const session = await verifySession();
	const userData = await getUserWithApiKey(session.user.id);

	if (!userData) {
		return <div>User not found</div>;
	}

	return <ApiKeyDisplay apiKey={userData.apiKey || ""} plan={userData.plan} />;
}
