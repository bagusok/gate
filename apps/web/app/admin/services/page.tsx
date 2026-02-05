import { getAllServices } from "@/lib/dal";
import { ServicesClient } from "./services-client";

export default async function ServicesPage() {
	const services = await getAllServices();

	return <ServicesClient services={services} />;
}
