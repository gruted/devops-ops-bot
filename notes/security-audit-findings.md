# Security Audit Findings - 2026-02-07

## Network Listening Services

- TCP ports open on all interfaces (IPv4 and IPv6):
  - SSH (22/tcp) - exposed to all network interfaces
  - HTTP (80/tcp) - exposed to all network interfaces
  - HTTPS (443/tcp) - exposed to all network interfaces
  - Port 8448/tcp - exposed to all network interfaces (application unknown, verify purpose)
  - CUPS printing (631/tcp) - exposed to all network interfaces

- TCP ports listening on localhost only:
  - Ports in the range 41809, 18699, 18632, 18635, 8008, 2019, 3456 (likely various local services)
  - DNS resolver 127.0.0.53:53

- UDP services on port 5353 are listening on all interfaces (likely mDNS)
- UDP services on ports 53 and 443 also present

## Systemd User Services

- Only three user services active:
  - at-spi-dbus-bus.service: Accessibility Bus
  - dbus.service: D-Bus User Message Bus
  - openclaw-gateway.service: OpenClaw Gateway

## Docker

- Docker access denied (no permission) to list running containers

## Exposure Risks and Recommendations

1. SSH exposed on all interfaces is a common vector for attacks. Ensure strong authentication methods and consider rate limiting or IP whitelisting.
2. HTTP (80) and HTTPS (443) open to all is expected for a public web server but verify the security and patch level of services.
3. Port 8448 open widely is unusual; identify the service and verify its security posture.
4. CUPS (631) exposed to all interfaces is a potential risk; restrict access if printing is only needed locally.
5. User services seem minimal and unlikely to pose high risk.
6. Docker permission denied indicates current user does not have access, which is good for privilege separation.

## Suggested Operator-Run Sudo Commands Bundle

```bash
mkdir -p /root/audit-output-2026-02-07
ss -tuln > /root/audit-output-2026-02-07/ss.txt
netstat -tuln > /root/audit-output-2026-02-07/netstat.txt
systemctl --user list-units --type=service > /root/audit-output-2026-02-07/systemctl-user.txt
# Docker list containers with sudo because non-root access denied
sudo docker ps > /root/audit-output-2026-02-07/docker-ps.txt
```

This will collect the relevant audit data for later analysis without exposing secrets.

---

End of initial findings.
