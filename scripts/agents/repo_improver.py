#!/usr/bin/env python3
"""
Repository Improver Agent
Updated to include @claude trigger in all generated issues.
"""

import os
import json
import anthropic
import requests  # Used for GitHub API calls
from pathlib import Path
from datetime import datetime

class RepoImprover:
    def __init__(self, github_token, anthropic_api_key, github_repo):
        self.github_token = github_token
        self.anthropic_api_key = anthropic_api_key
        self.github_repo = github_repo
        self.client = anthropic.Anthropic(api_key=anthropic_api_key)

    def load_assessment(self):
        """Load the assessment from repo_assessor."""
        assessment_path = Path(".factory-assessment.json")
        if not assessment_path.exists():
            print("⚠️ Warning: No assessment file found. Running in blind mode.")
            return {
                "goals_achieved": "PARTIAL",
                "prd_exists": False,
                "missing_docs": [],
                "completion_percentage": 50,
                "next_steps": "IMPROVE"
            }
        return json.loads(assessment_path.read_text())

    def scan_codebase(self):
        """Scan codebase for analysis."""
        repo_root = Path.cwd()
        code_files = []
        extensions = {'.py', '.js', '.ts', '.jsx', '.tsx', '.go', '.rs', '.java', '.dart'}
        ignore_dirs = {'.git', 'node_modules', '__pycache__', '.venv', 'venv', 'dist', 'build'}

        for path in repo_root.rglob('*'):
            if path.is_file() and path.suffix in extensions:
                if any(ignored in path.parts for ignored in ignore_dirs):
                    continue
                try:
                    content = path.read_text(encoding='utf-8')
                    code_files.append({
                        'path': str(path.relative_to(repo_root)),
                        'content': content[:1500]
                    })
                    if len(code_files) >= 10:
                        break
                except Exception:
                    pass
        return code_files

    def detect_architectural_gaps(self):
        """Use Claude to detect architectural issues."""
        code_files = self.scan_codebase()
        if not code_files:
            return []

        code_summary = "\n\n".join([
            f"## {f['path']}\n```\n{f['content']}\n```"
            for f in code_files
        ])

        prompt = f"""You are a Lead Software Architect performing a Holy Trinity compliance audit.
Analyze this codebase sample and identify ONE critical architectural gap or code smell.
Respond ONLY with the specified JSON format."""

        try:
            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=2000,
                messages=[{"role": "user", "content": prompt}]
            )
            response_text = response.content[0].text
            import re
            json_match = re.search(r'\{[^}]+\}', response_text, re.DOTALL)
            if json_match:
                gap = json.loads(json_match.group(0))
                if gap.get('issue_found'):
                    return [gap]
            return []
        except Exception as e:
            print(f"Error detecting gaps: {e}")
            return []

    def generate_prd(self):
        """Generate a PRD based on repository analysis."""
        assessment = self.load_assessment()
        if assessment.get('prd_exists'):
            print("✅ PRD already exists, skipping generation")
            return None

        readme_path = Path("README.md")
        readme_content = readme_path.read_text(encoding='utf-8') if readme_path.exists() else ""

        prompt = f"Generate a comprehensive PRD based on: {readme_content}"
        try:
            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=4000,
                messages=[{"role": "user", "content": prompt}]
            )
            prd_path = Path("docs/PRD.md")
            prd_path.parent.mkdir(exist_ok=True)
            prd_path.write_text(response.content[0].text)
            print(f"✅ Generated PRD at {prd_path}")
            return str(prd_path)
        except Exception as e:
            print(f"Error generating PRD: {e}")
            return None

    def create_github_issue(self, title, body, labels=None):
        """Create a GitHub issue with @claude auto-trigger."""
        if not self.github_token or not self.github_repo:
            print(f"⚠️ Cannot create issue: {title}")
            return

        url = f"https://api.github.com/repos/{self.github_repo}/issues"
        headers = {
            "Authorization": f"token {self.github_token}",
            "Accept": "application/vnd.github.v3+json"
        }

        # INJECTING @CLAUDE TRIGGER HERE
        formatted_body = f"@claude\n\n**Automated Analysis:**\n{body}"

        data = {
            "title": title,
            "body": formatted_body,
            "labels": labels or []
        }

        try:
            response = requests.post(url, headers=headers, json=data)
            if response.status_code == 201:
                issue_url = response.json()['html_url']
                print(f"✅ Created issue: {issue_url}")
            else:
                print(f"⚠️ Failed to create issue: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"Error creating issue: {e}")

    def run(self):
        """Run the improvement process."""
        print("🔧 Starting repository improvement...")
        assessment = self.load_assessment()

        if assessment['next_steps'] == 'IMPROVE':
            print("📈 Mode: IMPROVEMENT (Goals achieved, optimizing)")
            gaps = self.detect_architectural_gaps()
            for gap in gaps:
                issue_body = f"""## Issue Type
{gap['issue_type']}

## Description
{gap['description']}

## Severity
{gap['severity']}

## Fix Strategy
{gap['fix_strategy']}"""
                
                self.create_github_issue(
                    title=f"🔧 Architecture Gap: {gap['title']}",
                    body=issue_body,
                    labels=["architecture", "improvement"]
                )
        else:
            print("🚧 Mode: CONTINUE DEVELOPMENT (Goals not achieved)")
            # Standard dev tracking issue
            issue_body = f"""## Project Status
**Completion:** {assessment['completion_percentage']}%
**Goals Achieved:** {assessment['goals_achieved']}

## Next Actions
1. Review generated PRD (docs/PRD.md)
2. Implement core features as per PRD"""

            self.create_github_issue(
                title=f"🚧 Continue Development: {assessment['completion_percentage']}% Complete",
                body=issue_body,
                labels=["development", "in-progress"]
            )

        self.generate_prd()

if __name__ == "__main__":
    github_token = os.getenv("GITHUB_TOKEN")
    anthropic_api_key = os.getenv("ANTHROPIC_API_KEY")
    github_repo = os.getenv("GITHUB_REPOSITORY")

    if not anthropic_api_key:
        print("❌ Error: ANTHROPIC_API_KEY environment variable not set")
        exit(1)

    improver = RepoImprover(github_token, anthropic_api_key, github_repo)
    improver.run()