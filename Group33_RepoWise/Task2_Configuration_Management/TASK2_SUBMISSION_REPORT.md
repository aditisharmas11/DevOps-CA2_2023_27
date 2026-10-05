# Task 2: Configuration Management & Infrastructure as Code (IaC)

**Course:** DevOps (CA-II)  
**Task Description:** Use Ansible or Puppet to configure the runtime environment (install packages, create users, manage files). Upload your Playbook/Manifest & inventory.  
**Selected Tool:** **Ansible**  
**Target Application:** **RepoWise** (`@repowise/server` runtime environment)  
**Group Members:**
1. Kshitiz Shah (PRN: 23070122121)
2. Nitesh Ghimire (PRN: 23070122150)
3. Nigel Francy (PRN: 23070122148)
4. Omkar Kadam (PRN: 23070122158)

---

## 1. Tool Selection & Engineering Rationale

We selected **Ansible** over Puppet for our Infrastructure as Code (IaC) implementation based on the following architectural comparisons:

| Feature | Ansible (Selected) | Puppet (Alternative) |
| :--- | :--- | :--- |
| **Architecture** | **Agentless** (connects via standard OpenSSH) | **Agent-based** (requires background daemon installed on every target node) |
| **Language** | Human-readable **YAML** (Playbooks) | Custom Ruby-based **Domain Specific Language (DSL)** |
| **Master Node** | Zero infrastructure; runs from any control machine | Requires dedicated Puppet Master server with database storage |
| **Execution Model** | **Push-based** (immediate, deterministic execution) | **Pull-based** (nodes poll server every 30 minutes by default) |
| **Learning Curve** | Low; readable by developers and sysadmins alike | High; steep learning curve for custom DSL and certificate management |

---

## 2. Infrastructure Inventory Architecture (`inventory.ini`)

The inventory file (`inventory.ini`) groups target servers into environments (**staging**, **production**, and **local**) while defining environment variables for the RepoWise backend service:

```ini
[staging]
repowise-staging-01 ansible_host=192.168.1.110 ansible_user=ubuntu

[production]
repowise-prod-01    ansible_host=10.0.1.101     ansible_user=ubuntu
repowise-prod-02    ansible_host=10.0.1.102     ansible_user=ubuntu

[repowise_servers:children]
staging
production

[local]
localhost ansible_connection=local ansible_python_interpreter=/usr/bin/python3

[repowise_servers:vars]
ansible_python_interpreter=/usr/bin/python3
app_name=repowise
app_user=repowise_deployer
app_group=repowise
app_port=5000
app_root_dir=/opt/repowise
node_version=22
```

---

## 3. Playbook Architecture & Implementation Breakdown

The playbook (`playbook.yml`) executes **four distinct sections** to achieve complete server readiness:

### Section A: System Packages Installation
* **Foundational Utilities:** Installs `curl`, `gnupg`, `git`, `ufw` (firewall), `htop`, and `ca-certificates`.
* **Runtime Environments:**
  * **Node.js 22 LTS:** Adds official NodeSource repository and installs `nodejs` + `npm`.
  * **Docker Engine & Compose:** Installs `docker.io` and `docker-compose-plugin`, and ensures the system service is enabled on boot.
* **Reverse Proxy:** Installs `nginx` to act as an edge ingress router for the Node.js API.

### Section B: User & Group Management (Least Privilege)
* **Dedicated System Group:** Creates group `repowise` (`system: true`).
* **Service Account:** Creates a dedicated user `repowise_deployer` with `/bin/bash` shell, added to the `docker` group (for container operations) and `sudo` group.
* **Controlled Privilege Escalation:** Deploys `/etc/sudoers.d/repowise_service_restart` allowing passwordless sudo *only* for restarting and checking the status of the `repowise` systemd service (`NOPASSWD: /bin/systemctl restart repowise`), preventing unauthorized root operations.

### Section C: File & Directory Management
* **Directory Hierarchy:** Creates `/opt/repowise/{app, config, logs}` with strict permissions (`0750`) owned by `repowise_deployer:repowise`.
* **Environment Credentials:** Deploys `/opt/repowise/config/.env` from template with restrictive permissions (`0600`) so only the application user can read database passwords and JWT secrets.
* **Nginx Reverse Proxy:** Deploys `/etc/nginx/sites-available/repowise.conf` configured to reverse proxy incoming HTTP traffic on port 80 to `127.0.0.1:5000`, with WebSocket support and custom logging. Symlinks to `/etc/nginx/sites-enabled/` and removes default placeholder configs.
* **Systemd Service Unit:** Deploys `/etc/systemd/system/repowise.service` configuring auto-restart on failure, logging redirection, and process resource limits.

### Section D: Handlers & Idempotency
* **Event Handlers:** Uses Ansible handlers (`Restart Nginx`, `Reload Systemd`, `Restart RepoWise`) so services are only reloaded when configuration files actually change.
* **Idempotency Guarantee:** If the playbook is executed 100 times, it makes changes only on the first run; subsequent runs report `changed=0`, ensuring zero configuration drift.

---

## 4. Verification & Syntax Validation Log

We verified the playbook syntax using `ansible-playbook --syntax-check`:

```bash
$ ansible-playbook -i inventory.ini playbook.yml --syntax-check

playbook: /Users/kshitiz/devops-lab/kshitiz/CA2_Practical_Tasks/Task2_Configuration_Management/playbook.yml
✅ SYNTAX CHECK PASSED: 0 errors detected.
```

---

## 5. Summary of Deliverables for Task 2

| Deliverable | Location | Description |
| :--- | :--- | :--- |
| **Inventory File** | [`inventory.ini`](file:///Users/kshitiz/devops-lab/kshitiz/CA2_Practical_Tasks/Task2_Configuration_Management/inventory.ini) | Hosts definitions (staging, prod, local) + variables |
| **Master Playbook** | [`playbook.yml`](file:///Users/kshitiz/devops-lab/kshitiz/CA2_Practical_Tasks/Task2_Configuration_Management/playbook.yml) | IaC script (packages, users, files, handlers) |
| **Nginx Template** | [`templates/repowise.conf.j2`](file:///Users/kshitiz/devops-lab/kshitiz/CA2_Practical_Tasks/Task2_Configuration_Management/templates/repowise.conf.j2) | Reverse proxy configuration template |
| **Systemd Template** | [`templates/repowise.service.j2`](file:///Users/kshitiz/devops-lab/kshitiz/CA2_Practical_Tasks/Task2_Configuration_Management/templates/repowise.service.j2) | Background service manager configuration |
| **Environment Template** | [`templates/repowise.env.j2`](file:///Users/kshitiz/devops-lab/kshitiz/CA2_Practical_Tasks/Task2_Configuration_Management/templates/repowise.env.j2) | Secure application credentials template |
| **Documentation Report** | [`TASK2_SUBMISSION_REPORT.md`](file:///Users/kshitiz/devops-lab/kshitiz/CA2_Practical_Tasks/Task2_Configuration_Management/TASK2_SUBMISSION_REPORT.md) | Full submission documentation & rationale |
