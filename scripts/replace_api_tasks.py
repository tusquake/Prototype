import json

with open("prototyping/scratch/tasks_mock.json", "r") as f:
    tasks_mock = json.load(f)

with open("prototyping/scratch/audit_mock.json", "r") as f:
    audit_mock = json.load(f)

with open("prototyping/frontend/src/services/api.js", "r") as f:
    content = f.read()

# 1. Replace MOCK_TASKS
s_tasks = content.find("export const MOCK_TASKS = [")
e_tasks = content.find("export const MOCK_ORGANIZATION_USERS = [")

if s_tasks != -1 and e_tasks != -1:
    new_tasks_str = f"export const MOCK_TASKS = {json.dumps(tasks_mock, indent=2)};\n\n"
    content = content[:s_tasks] + new_tasks_str + content[e_tasks:]

# 2. Replace MOCK_AUDIT_LOGS
s_audit = content.find("export const MOCK_AUDIT_LOGS = [")
e_audit = content.find("export async function fetchJson")

if s_audit != -1 and e_audit != -1:
    new_audit_str = f"export const MOCK_AUDIT_LOGS = {json.dumps(audit_mock, indent=2)};\n\n"
    content = content[:s_audit] + new_audit_str + content[e_audit:]

with open("prototyping/frontend/src/services/api.js", "w") as f:
    f.write(content)

print("Successfully replaced MOCK_TASKS and MOCK_AUDIT_LOGS in api.js!")
