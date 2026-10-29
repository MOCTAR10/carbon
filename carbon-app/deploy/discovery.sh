#!/usr/bin/env bash
# CarbonTrack — server discovery script
# Run on the deploy server BEFORE starting the deployment.
# Copies the output back here so we can finalize ports + folder layout.
#
# Usage (on the server):
#   bash discovery.sh > carbontrack-discovery.txt 2>&1
#   cat carbontrack-discovery.txt        # then paste back
#
# This script is READ-ONLY. It does not install or change anything.

set +e

hr() { printf '\n========== %s ==========\n' "$1"; }

hr "Date / Host"
date
hostname -f 2>/dev/null || hostname
uname -a

hr "Disk usage"
df -h / /var 2>/dev/null

hr "Memory"
free -h 2>/dev/null || true

hr "Logged in as / sudo capability"
id
sudo -n true 2>/dev/null && echo "sudo: passwordless OK" || echo "sudo: requires password or unavailable"

hr "Toolchain versions"
for tool in node npm pnpm yarn pm2 nginx psql redis-cli git curl rsync jq java; do
  if command -v "$tool" >/dev/null 2>&1; then
    printf '%-10s %s\n' "$tool" "$($tool --version 2>&1 | head -n1)"
  else
    printf '%-10s MISSING\n' "$tool"
  fi
done

hr "PM2 process list"
if command -v pm2 >/dev/null 2>&1; then
  pm2 jlist 2>/dev/null | jq -r '.[] | "\(.pm_id)\t\(.name)\t\(.pm2_env.status)\t port=\(.pm2_env.env.PORT // "?")\t cwd=\(.pm2_env.pm_cwd)"' 2>/dev/null \
    || pm2 ls --no-color 2>/dev/null
else
  echo "(pm2 not installed)"
fi

hr "Listening TCP ports (with process)"
if command -v ss >/dev/null 2>&1; then
  ss -tlnp 2>/dev/null || sudo ss -tlnp 2>/dev/null
elif command -v netstat >/dev/null 2>&1; then
  netstat -tlnp 2>/dev/null || sudo netstat -tlnp 2>/dev/null
fi

hr "Ports actually busy (just the numbers, sorted)"
( ss -tln 2>/dev/null || netstat -tln 2>/dev/null ) \
  | awk 'NR>1 {n=split($4,a,":"); print a[n]}' | sort -un

hr "/var/www directory"
ls -la /var/www 2>/dev/null || echo "(/var/www does not exist)"

hr "Nginx — sites enabled"
if [ -d /etc/nginx/sites-enabled ]; then
  ls -la /etc/nginx/sites-enabled/ 2>/dev/null
  echo "--- nginx -T (full effective config, head only) ---"
  sudo nginx -T 2>/dev/null | head -n 200 || nginx -T 2>/dev/null | head -n 200
else
  echo "(no /etc/nginx/sites-enabled — maybe conf.d only?)"
  ls -la /etc/nginx/conf.d/ 2>/dev/null
fi

hr "Apache (if any)"
systemctl is-active apache2 2>/dev/null && echo "Apache active" || echo "Apache inactive/absent"

hr "PostgreSQL"
systemctl is-active postgresql 2>/dev/null && echo "postgresql active" || echo "postgresql inactive/absent"
sudo -u postgres psql -c '\l' 2>/dev/null || echo "(could not list databases — pg may not be running or sudo required)"

hr "Redis (if any)"
systemctl is-active redis-server 2>/dev/null || systemctl is-active redis 2>/dev/null || echo "(redis not running)"

hr "Jenkins"
systemctl is-active jenkins 2>/dev/null && echo "jenkins active" || echo "jenkins inactive/absent"
( ss -tln 2>/dev/null || netstat -tln 2>/dev/null ) | grep -E ':80(81|82)' || true

hr "UFW / firewall"
sudo ufw status 2>/dev/null || iptables -L -n 2>/dev/null | head -n 20

hr "End"
echo "Discovery complete."
