/**
 * PM2 Ecosystem Configuration
 * @see https://pm2.keymetrics.io/docs/usage/application-declaration/
 *
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 start ecosystem.config.js --only api
 *   pm2 start ecosystem.config.js --only web
 *   pm2 start ecosystem.config.js --env production
 *
 * Project root:
 *   /var/www/myapp
 *
 * Expected structure:
 *   /var/www/myapp
 *   ├─ apps/
 *   │  ├─ api/
 *   │  └─ web/
 *   ├─ logs/
 *   └─ ecosystem.config.js
 */

module.exports = {
	apps: [
		{
			/**
			 * ========================================================
			 * API APPLICATION
			 * ========================================================
			 */

			/**
			 * Application name shown in PM2
			 * MUST be unique
			 * CHANGE if you rename the service
			 */
			name: "gate-api",

			/**
			 * Executable to start the app
			 * Using "bun" means bun must be available in PM2 PATH
			 * CHANGE to full path if needed (e.g. /home/user/.bun/bin/bun)
			 */
			script: "bun",

			/**
			 * Arguments passed to the script
			 * This runs: `bun run start`
			 * CHANGE if your start script name is different
			 */
			args: "run start",

			/**
			 * Working directory where PM2 runs the command
			 * ❗ MUST be updated if project location changes
			 */
			cwd: "/var/www/myapp/apps/api",

			/**
			 * Number of process instances
			 * - 1     → single process
			 * - "max" → one process per CPU core
			 */
			instances: 1,

			/**
			 * Execution mode
			 * - fork    → single process
			 * - cluster → load-balanced processes
			 */
			exec_mode: "fork",

			/** Automatically restart the app if it crashes */
			autorestart: true,

			/**
			 * Watch files and restart on change
			 * NOT recommended for production
			 */
			watch: false,

			/**
			 * Restart the app if memory usage exceeds this value
			 * CHANGE based on server capacity
			 */
			max_memory_restart: "500M",

			/**
			 * Environment variables for development
			 * Used when --env production is NOT provided
			 */
			env: {
				NODE_ENV: "development",

				/**
				 * Application port (development)
				 * CHANGE if the port is already in use
				 */
				PORT: 9990,
			},

			/**
			 * Environment variables for production
			 * Used when running with --env production
			 */
			env_production: {
				NODE_ENV: "production",

				/**
				 * Application port (production)
				 * CHANGE to match your reverse proxy / firewall
				 */
				PORT: 9995,
			},

			/**
			 * File path for error logs (stderr)
			 * ❗ logs directory must exist
			 */
			error_file: "/var/www/myapp/logs/api-error.log",

			/**
			 * File path for standard output logs (stdout)
			 */
			out_file: "/var/www/myapp/logs/api-out.log",

			/**
			 * Date format used in logs
			 */
			log_date_format: "YYYY-MM-DD HH:mm:ss Z",

			/**
			 * Merge logs from all instances into a single file
			 */
			merge_logs: true,
		},

		{
			/**
			 * ========================================================
			 * WEB APPLICATION (Frontend)
			 * ========================================================
			 */

			/** Application name shown in PM2 */
			name: "gate-web",

			/** Executable used to start the app */
			script: "bun",

			/**
			 * Start command
			 * Runs: `bun run start`
			 */
			args: "run start",

			/**
			 * Working directory of the frontend app
			 * ❗ MUST be updated if project location changes
			 */
			cwd: "/var/www/myapp/apps/web",

			/**
			 * Number of instances
			 * Usually 1 for frontend unless CPU-heavy
			 */
			instances: 1,

			/** Execution mode */
			exec_mode: "fork",

			/** Restart app automatically on crash */
			autorestart: true,

			/** Disable file watching in production */
			watch: false,

			/**
			 * Memory limit before PM2 restarts the app
			 * CHANGE based on frontend memory usage
			 */
			max_memory_restart: "1G",

			/**
			 * Development environment variables
			 */
			env: {
				NODE_ENV: "development",

				/**
				 * Development port
				 * Common values: 3000, 5173, 8080
				 */
				PORT: 3000,
			},

			/**
			 * Production environment variables
			 */
			env_production: {
				NODE_ENV: "production",

				/**
				 * Production port
				 * CHANGE to match your reverse proxy
				 */
				PORT: 9996,
			},

			/**
			 * Error log file path
			 */
			error_file: "/var/www/myapp/logs/web-error.log",

			/**
			 * Standard output log file path
			 */
			out_file: "/var/www/myapp/logs/web-out.log",

			/** Log timestamp format */
			log_date_format: "YYYY-MM-DD HH:mm:ss Z",

			/** Merge logs from all instances */
			merge_logs: true,
		},
	],
};
