export interface ApiResponse<T = unknown> {
	success: boolean;
	data?: T;
	error?: string;
	message?: string;
}

export interface PaginatedResponse<T> {
	items: T[];
	total: number;
	page: number;
	pageSize: number;
	totalPages: number;
}

export interface UsageStats {
	used: number;
	remaining: number;
	limit: number;
	resetAt: string;
}

export interface DashboardStats {
	totalRequests: number;
	successfulRequests: number;
	failedRequests: number;
	averageLatency: number;
	activeApiKeys: number;
}

export interface ChartDataPoint {
	date: string;
	requests: number;
	successful: number;
	failed: number;
}

export interface ApiKeyDisplay {
	keyId: string;
	keyPrefix: string;
	planName: string;
	status: string;
	createdAt: string;
	lastUsedAt: string | null;
	expiresAt: string | null;
}
