// PM2 process configuration for CarbonTrack (Next.js production)
//
// Copy this file to /var/www/carbontrack/ecosystem.config.js
// Launch:   pm2 start /var/www/carbontrack/ecosystem.config.js --env production
// Reload:   pm2 reload /var/www/carbontrack/ecosystem.config.js --env production --update-env
// Logs:     pm2 logs carbontrack

module.exports = {
  apps: [
    {
      name: 'carbontrack',
      cwd: '/var/www/carbontrack/current',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',

      // Restart policy
      autorestart: true,
      max_restarts: 10,
      min_uptime: '15s',
      restart_delay: 3000,

      // Memory limit — restart if Node heap grows beyond this
      max_memory_restart: '900M',

      // Process model
      // 'fork' = single process (default). Use 'cluster' for multi-core load balancing.
      exec_mode: 'fork',
      instances: 1,

      // Log files (PM2 also keeps stdout/stderr aggregated via 'pm2 logs')
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      out_file: '/var/log/pm2/carbontrack-out.log',
      error_file: '/var/log/pm2/carbontrack-error.log',
      merge_logs: true,

      // Watch is disabled — deploys are explicit via Jenkins
      watch: false,

      // Environment — values here are defaults; production-only secrets live in
      // /var/www/carbontrack/shared/.env.local (loaded automatically by Next.js)
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        // Heap cap to match max_memory_restart roughly
        NODE_OPTIONS: '--max-old-space-size=896',
      },
    },
  ],
}
