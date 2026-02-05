import { redirect } from "next/navigation";
import { getUser } from "@/lib/dal";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
	const user = await getUser();

	if (!user) {
		redirect("/login");
	}

	return <SettingsClient user={user} />;
}
