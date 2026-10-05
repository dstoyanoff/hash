# Security

## Reporting a vulnerability

Please report it privately through GitHub: **Security → Report a vulnerability** on
[the repository](https://github.com/dstoyanoff/hashsome/security/advisories/new). Do not open a
public issue for it. You will get a reply as soon as I can, usually within a few days.

Hashsome is alpha software. Fixes go into the next release, and the advisory credits you unless you
prefer otherwise.

## What to keep in mind when you run it

- **There is no login.** A Hashsome server shows and controls every device its integrations expose
  to anyone who can reach it. Run it on a trusted network, or put it behind a reverse proxy that
  authenticates (Authelia, Authentik, Cloudflare Access, basic auth, a VPN). Do not expose it to the
  internet as is.
- **Your tokens stay on the server.** They are read from the environment and are never in the
  browser, the image or the release files. Give Home Assistant a dedicated non-admin user for the
  token where you can.
