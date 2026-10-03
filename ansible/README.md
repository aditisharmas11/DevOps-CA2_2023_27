# Ansible Deployment

This playbook configures a Debian or Ubuntu Linux host and deploys the Express
app from this checkout. It installs `nodejs` and `npm`, copies the app's
`server.js` and npm manifests (not `node_modules`), installs locked production
dependencies, and enables a systemd service on port 4000. The service runs as
the restricted `devops-ca2` user and restarts if it exits unexpectedly.

## Prerequisites

- Ansible Core 2.13 or newer on a Linux, macOS, or WSL controller.
- Python 3 on the controller and target host.
- A reachable Debian or Ubuntu target with SSH, sudo access, systemd, and apt
  repository access.
- The target host's firewall or cloud security rules must allow port 4000 if
  you want to reach the application remotely.

On Ubuntu WSL, install Ansible if it is not already available:

```bash
sudo apt update
sudo apt install -y ansible
```

## Configure the inventory

Edit `ansible/inventory.ini`. The included `192.0.2.10` address is reserved for
documentation and is not a real deployment target. Replace it and `ubuntu`
with your reachable target address and SSH account. Ensure that account can
use `sudo` on the target. For example:

```ini
[ca2_app]
ca2_server ansible_host=203.0.113.25 ansible_user=ubuntu

[ca2_app:vars]
ansible_python_interpreter=/usr/bin/python3
```

The example address above is also documentation-only; substitute your actual
host values. An SSH key can be selected with `--private-key /path/to/key` or
loaded into `ssh-agent`.

## Check and run

From the project root in WSL/Linux, first check SSH connectivity and playbook
syntax. These checks do not deploy the application:

```bash
ansible -i ansible/inventory.ini ca2_app -m ping
ansible-playbook --syntax-check -i ansible/inventory.ini ansible/deploy.yml
```

After replacing the example host and confirming the checks, deploy with:

```bash
ansible-playbook -i ansible/inventory.ini ansible/deploy.yml
```

Check the service on the target and request its health endpoint:

```bash
ansible -i ansible/inventory.ini ca2_app -b -m command -a "systemctl is-active devops-ca2"
curl http://<target-host>:4000/health
```

The playbook has not been run against a remote host as part of this change.