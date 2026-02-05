import { pgEnum } from "drizzle-orm/pg-core";
import { enumToPgEnum } from "../utils/enum-to-pg-enum";

export enum UserRole {
	ADMIN = "admin",
	USER = "user",
}

export const userRoleEnum = pgEnum("user_role", enumToPgEnum(UserRole));
