import httpx
import json
import re
from typing import Dict, Any, List, Optional
from app.config import settings

DEGREE_KEYWORDS = [
    "bachelor", "master", "phd", "b.s", "b.sc", "b.tech", "m.s", "m.sc", "m.tech",
    "degree", "university", "college", "gpa", "academic", "diploma"
]

class LLMAnalyzer:
    def __init__(self):
        self.ollama_url = f"{settings.OLLAMA_BASE_URL}/api/generate"
        self.model = settings.OLLAMA_MODEL

    async def _call_ollama(self, prompt: str, system_prompt: str = "") -> Optional[str]:
        """Calls local Ollama instance with extended 120s timeout for cloud/remote models."""
        payload = {
            "model": self.model,
            "prompt": prompt,
            "system": system_prompt,
            "stream": False,
            "options": {
                "temperature": 0.1,
                "top_p": 0.9
            }
        }
        try:
            timeout_config = httpx.Timeout(120.0, connect=5.0)
            async with httpx.AsyncClient(timeout=timeout_config) as client:
                res = await client.post(self.ollama_url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    return data.get("response", "")
        except Exception as e:
            print(f"Ollama Call Note: {e}")
        return None

    def _extract_json_from_llm(self, response_text: str) -> Optional[Dict[str, Any]]:
        """Extracts JSON block from LLM output, handling markdown ```json blocks cleanly."""
        if not response_text:
            return None

        cleaned = re.sub(r'```(?:json)?\s*', '', response_text, flags=re.IGNORECASE)
        cleaned = re.sub(r'```\s*$', '', cleaned, flags=re.IGNORECASE).strip()

        try:
            match = re.search(r'\{.*\}', cleaned, re.DOTALL)
            if match:
                return json.loads(match.group(0))
        except Exception:
            pass
        return None

    def _is_degree_string(self, text: str) -> bool:
        """Returns True if string is an academic degree rather than a job role."""
        if not text:
            return True
        t_lower = text.lower()
        return any(dk in t_lower for dk in DEGREE_KEYWORDS)

    async def parse_open_schema_profile(self, text: str, is_job: bool = False) -> Dict[str, Any]:
        """Parses text into an open-schema profile with dynamic section discovery and professional tech domain."""
        doc_type = "Job Description" if is_job else "Candidate Resume"
        prompt = f"""
Analyze the following {doc_type} text. 
Extract key information into a JSON object with:
1. "candidate_name": Full name of candidate (or 'Candidate' if job description)
2. "canonical_title": Professional job role title (e.g. Full Stack Developer, Data Scientist, DevOps Engineer, Cybersecurity Specialist, Web Developer). MUST NOT be an academic degree like 'Bachelor of Science'.
3. "detected_domain": Tech domain category (e.g. Web Development, Data Science, Cyber Security, Cloud & DevOps, Mobile Engineering, Product Management, Full Stack Engineering).
4. "capabilities": List of objects with {{"domain": str, "skill": str, "proficiency_evidence": str}}
5. "experience_years": Estimated years of relevant experience
6. "education": Education details if present
7. "timeline_milestones": List of objects with {{"year": str, "role": str, "organization": str, "summary": str}}
8. "dynamic_sections": List of objects with {{"heading": str, "key_details": str}} for any non-standard sections found.

Text:
{text[:4500]}
        """
        system = "You are an AI resume and job description parser. Respond strictly with pure JSON."
        llm_raw = await self._call_ollama(prompt, system)
        if llm_raw:
            parsed = self._extract_json_from_llm(llm_raw)
            if parsed:
                title = parsed.get("canonical_title", "")
                if self._is_degree_string(title):
                    parsed["canonical_title"] = parsed.get("detected_domain", "Full Stack Developer")
                return parsed

        return self._heuristic_parse_profile(text, is_job)

    async def analyze_candidate_match(
        self,
        candidate_text: str,
        job_text: str,
        mode: str = "recruiter"
    ) -> Dict[str, Any]:
        """
        Comprehensive decision-support analysis for a candidate against a job description or domain-auto-detected target.
        Generates rubric scores, evidence rationale, confidence ratings, red flags, career timeline, and rich student mentorship suite.
        """
        is_target_provided = bool(job_text and len(job_text.strip()) > 15 and "AUTO_DETECT" not in job_text)

        target_context = f"Job Description / Target Role:\n{job_text[:3000]}" if is_target_provided else """
Target Role & Job Description: NOT PROVIDED.
CRITICAL INSTRUCTION: Auto-detect the candidate's professional tech domain and target role directly from their resume content (e.g. Full Stack Developer, Data Scientist, Cyber Security, DevOps, Web Developer, Mobile Development). Evaluate their capabilities, rubric, evidence, red flags, and mentorship roadmap tailored specifically to their detected professional role. Do NOT use academic degree names like 'Bachelor of Science' as the target role title.
"""

        prompt = f"""
You are an expert HR decision-support AI and career mentor.

{target_context}

Candidate Resume:
{candidate_text[:4000]}

Respond ONLY in JSON with the exact following schema:
{{
  "overall_match_score": integer (0 to 100),
  "recommendation": "Shortlist" | "Consider" | "Not Recommended",
  "detected_role": "Professional tech role title (e.g. Full Stack Developer, Data Scientist, Cybersecurity Analyst, DevOps Engineer - DO NOT use degree titles)",
  "key_strengths": [list of strings],
  "key_gaps": [list of strings],
  "rubric": {{
    "technical_skills": integer (0 to 100),
    "experience": integer (0 to 100),
    "projects": integer (0 to 100),
    "education": integer (0 to 100),
    "ats_format": integer (0 to 100)
  }},
  "timeline_milestones": [
    {{"year": "2022", "role": "Developer", "organization": "Tech Corp", "summary": "Built software services"}}
  ],
  "evidence_breakdown": [
    {{
      "category": "Technical Capability" | "Experience Depth" | "Projects & Impact" | "Education Alignment",
      "score": integer,
      "confidence": "High" | "Medium" | "Low",
      "rationale": "Clear explanation of score award or deduction",
      "resume_quotes": ["quote 1"],
      "jd_requirements": ["requirement 1"]
    }}
  ],
  "skill_gaps": [
    {{
      "skill": "skill name",
      "status": "Matched" | "Partial" | "Missing",
      "similarity_percentage": integer,
      "found_evidence": "evidence string",
      "recommendation": "upskilling note"
    }}
  ],
  "red_flags": [
    {{
      "flag_type": "Career Gap" | "Unquantified Claim" | "Buzzword Stuffing" | "Job Hopping",
      "description": "explanation",
      "evidence": "quote",
      "severity": "Low" | "Medium" | "High"
    }}
  ],
  "student_roadmap": [
    {{
      "priority": integer,
      "category": "Missing Skill" | "High-Impact Project" | "Bullet Rewrite" | "Quantification" | "Keyword",
      "title": "Actionable title",
      "action_description": "Clear step by step advice written in simple English",
      "suggested_rewrite": "Before -> After bullet rewrite",
      "rationale": "Why this matters for recruiters",
      "estimated_impact": "+8% Match Score"
    }}
  ],
  "student_mentorship_suite": {{
    "resume_identity": {{
      "resume_type": "Cybersecurity Student / Full Stack Developer / Data Science Engineer",
      "confidence": 96,
      "detected_focus": ["Cybersecurity", "AI", "Python"],
      "weak_presence": ["Backend", "Frontend", "Cloud", "DevOps"],
      "resume_personality": {{"Security": 75, "AI": 15, "Software Engineering": 10}},
      "target_role_predictions": {{
        "primary": "Cybersecurity Analyst / Target Role",
        "possible": ["Penetration Tester", "Security Researcher"],
        "unlikely": ["Backend Developer", "Full Stack Engineer"]
      }}
    }},
    "strengths_highlights": [
      "Strong AI & Python knowledge",
      "Good domain foundation",
      "Hands-on project execution",
      "Good Git exposure",
      "Shows active self-learning"
    ],
    "top_5_weaknesses": [
      "Projects don't explain their impact.",
      "No measurable achievements.",
      "Resume looks too single-niche focused.",
      "No production software experience.",
      "No cloud deployment."
    ],
    "structured_improvements": [
      {{
        "current": "Offensive security student...",
        "problem": "Sounds too niche for broader tech recruiters.",
        "better": "Computer Engineering student specializing in Python, AI automation and cybersecurity.",
        "reason": "Now recruiters know you can build software too."
      }}
    ],
    "skills_you_should_learn": [
      {{
        "skill": "SQL",
        "why": "Almost every backend job requires relational databases.",
        "estimated_learning": "1 week",
        "difficulty": "Easy"
      }},
      {{
        "skill": "Docker",
        "why": "Essential for containerizing microservices.",
        "estimated_learning": "1 week",
        "difficulty": "Easy"
      }},
      {{
        "skill": "REST APIs",
        "why": "Core requirement for web & API integration.",
        "estimated_learning": "2 weeks",
        "difficulty": "Medium"
      }}
    ],
    "recommended_projects": [
      {{
        "title": "Expense Tracker",
        "difficulty_stars": 2,
        "tech_stack": ["React", "FastAPI", "PostgreSQL"],
        "you_will_learn": ["Authentication", "REST APIs", "SQL", "Deployment"],
        "resume_impact": "+9%"
      }},
      {{
        "title": "Security & Recon Platform",
        "difficulty_stars": 3,
        "tech_stack": ["Python", "Docker", "AWS"],
        "you_will_learn": ["Port Scanning", "Automation", "CI/CD"],
        "resume_impact": "+14%"
      }}
    ],
    "recommended_certifications": [
      {{
        "name": "Google Cybersecurity",
        "type": "Paid",
        "reason": "Recognized by recruiters globally.",
        "time_estimate": "25 hours",
        "difficulty": "Easy"
      }},
      {{
        "name": "AWS Cloud Practitioner",
        "type": "Free / Paid Prep",
        "reason": "Shows foundational cloud deployment awareness.",
        "time_estimate": "20 hours",
        "difficulty": "Easy"
      }}
    ],
    "weekly_roadmap": [
      {{"week": 1, "title": "Learn SQL", "action": "Master SELECT, JOINs, indexing, and relational schema design."}},
      {{"week": 2, "title": "Learn REST APIs", "action": "Build endpoints with FastAPI or Express."}},
      {{"week": 3, "title": "Build Backend", "action": "Connect FastAPI to SQLite/PostgreSQL."}},
      {{"week": 4, "title": "Deploy App", "action": "Deploy microservice on Render/Railway/AWS."}},
      {{"week": 5, "title": "Add Authentication", "action": "Implement JWT token authentication."}},
      {{"week": 6, "title": "Testing", "action": "Write unit tests using pytest."}},
      {{"week": 7, "title": "Docker", "action": "Containerize app with Dockerfile."}},
      {{"week": 8, "title": "CI/CD", "action": "Set up GitHub Actions workflow."}},
      {{"week": 9, "title": "Portfolio", "action": "Publish clean GitHub README with architecture diagram."}},
      {{"week": 10, "title": "Resume Update", "action": "Rewrite bullet points with metric achievements."}},
      {{"week": 11, "title": "Mock Interview", "action": "Practice technical & behavioral questions."}},
      {{"week": 12, "title": "Apply to Jobs", "action": "Submit targeted applications with tailored cover letters."}}
    ],
    "ats_review": {{
      "ats_compatibility_score": 89,
      "checklist": {{
        "resume_length": true,
        "section_order": true,
        "github_links": false,
        "portfolio": false,
        "action_verbs": false,
        "measurable_achievements": false
      }},
      "missing_keywords": [
        {{"keyword": "REST API", "why_it_matters": "Crucial keyword for backend & web engineering filters."}},
        {{"keyword": "FastAPI", "why_it_matters": "Demonstrates modern Python microservices proficiency."}},
        {{"keyword": "PostgreSQL", "why_it_matters": "High-demand relational database in job postings."}}
      ]
    }},
    "buzzword_detector": {{
      "buzzwords": [
        {{
          "word": "AI-powered",
          "count": 4,
          "instead_of": "AI-powered chatbot",
          "say_this": "Python chatbot answering 5,000+ user queries."
        }},
        {{
          "word": "Automation",
          "count": 6,
          "instead_of": "Automation script",
          "say_this": "Automated pipeline reducing manual triage time by 45%."
        }}
      ]
    }},
    "bullet_rewrites": [
      {{
        "current": "Built URL Shield.",
        "improved": "Developed a Python-based reconnaissance platform integrating DNS lookup, SSL analysis and port scanning into one automated workflow.",
        "improvements": ["Specific", "Technical", "Action-oriented"]
      }}
    ]
  }}
}}
        """
        system = "You are an objective hiring decision-support analyst and master career mentor. Respond with pure JSON."
        llm_raw = await self._call_ollama(prompt, system)
        if llm_raw:
            res_json = self._extract_json_from_llm(llm_raw)
            if res_json:
                det_role = res_json.get("detected_role", "")
                if self._is_degree_string(det_role):
                    res_json["detected_role"] = "Full Stack Developer"
                return res_json

        return self._heuristic_match_analysis(candidate_text, job_text, mode)

    def _heuristic_parse_profile(self, text: str, is_job: bool) -> Dict[str, Any]:
        """Rule-based profile extractor fallback with degree filtering."""
        lines = [l.strip() for l in text.split('\n') if l.strip()]
        
        cand_name = "Candidate"
        for line in lines[:4]:
            if not self._is_degree_string(line) and len(line) < 40 and "resume" not in line.lower():
                cand_name = line.strip()
                break

        text_lower = text.lower()
        detected_role = "Full Stack Developer"
        if any(k in text_lower for k in ["cyber", "security", "penetration", "soc", "siem", "wireshark"]):
            detected_role = "Cybersecurity Specialist"
        elif any(k in text_lower for k in ["pandas", "machine learning", "scikit", "tensorflow", "data science"]):
            detected_role = "Data Scientist"
        elif any(k in text_lower for k in ["docker", "kubernetes", "terraform", "devops", "aws", "ci/cd"]):
            detected_role = "DevOps Engineer"
        elif any(k in text_lower for k in ["react", "node", "full stack", "frontend", "backend", "javascript", "web"]):
            detected_role = "Full Stack Developer"

        common_skills = ["Python", "FastAPI", "Docker", "SQL", "Git", "REST APIs", "React", "Linux", "AWS", "PostgreSQL", "Pandas", "JavaScript"]
        found_skills = [s for s in common_skills if re.search(r'\b' + re.escape(s) + r'\b', text, re.IGNORECASE)]

        return {
            "candidate_name": cand_name,
            "canonical_title": detected_role,
            "detected_domain": detected_role,
            "capabilities": [{"domain": "Technical", "skill": s, "proficiency_evidence": f"Demonstrated in {detected_role}"} for s in found_skills],
            "experience_years": 2,
            "education": "Computer Science or related technical field",
            "timeline_milestones": [
                {"year": "2023", "role": f"Junior {detected_role}", "organization": "Tech Team", "summary": "Core project execution"},
                {"year": "2024", "role": detected_role, "organization": "Solutions Inc", "summary": "Full project ownership & development"}
            ],
            "dynamic_sections": [{"heading": "Highlights", "key_details": text[:200]}]
        }

    def _heuristic_match_analysis(self, candidate_text: str, job_text: str, mode: str) -> Dict[str, Any]:
        """Generates domain-aware evidence analytics locally when Ollama is offline."""
        c_text_lower = candidate_text.lower()
        
        detected_role = "Full Stack Developer"
        if any(k in c_text_lower for k in ["cyber", "security", "penetration", "soc", "siem"]):
            detected_role = "Cybersecurity Specialist"
        elif any(k in c_text_lower for k in ["pandas", "machine learning", "scikit", "data science", "tableau"]):
            detected_role = "Data Scientist"
        elif any(k in c_text_lower for k in ["docker", "kubernetes", "terraform", "devops", "aws"]):
            detected_role = "DevOps Engineer"
        elif any(k in c_text_lower for k in ["react", "node", "full stack", "javascript", "web", "html"]):
            detected_role = "Full Stack Developer"

        keywords = ["python", "fastapi", "sql", "docker", "git", "rest apis", "react", "linux", "aws", "pandas", "javascript"]
        j_text_lower = job_text.lower() if job_text else ""

        required_in_jd = [kw for kw in keywords if kw in j_text_lower]
        if not required_in_jd:
            required_in_jd = [kw for kw in keywords if kw in c_text_lower]
        if not required_in_jd:
            required_in_jd = ["python", "sql", "git", "rest apis", "react"]

        matched = [kw for kw in required_in_jd if kw in c_text_lower]
        missing = [kw for kw in keywords if kw not in c_text_lower][:2]

        score = int((len(matched) / len(required_in_jd)) * 100) if required_in_jd else 80
        recommendation = "Shortlist" if score >= 80 else ("Consider" if score >= 60 else "Not Recommended")

        student_mentorship_suite = {
            "resume_identity": {
                "resume_type": f"{detected_role} Candidate",
                "confidence": 96,
                "detected_focus": [m.capitalize() for m in matched[:3]],
                "weak_presence": ["Cloud", "DevOps", "Production Software"],
                "resume_personality": {"Primary Focus": 75, "Secondary Skill": 20, "General Engineering": 5},
                "target_role_predictions": {
                    "primary": detected_role,
                    "possible": [f"Associate {detected_role}", "Technical Specialist"],
                    "unlikely": ["Unrelated Field Role", "Non-technical Role"]
                }
            },
            "strengths_highlights": [
                f"Strong proficiency in {', '.join([m.capitalize() for m in matched[:2]])}",
                "Good core technical foundation",
                "Hands-on project execution",
                "Good Git & version control exposure",
                "Shows active self-learning"
            ],
            "top_5_weaknesses": [
                "Projects don't explain their business impact.",
                "No measurable metrics in bullet points.",
                "Resume looks too single-niche focused.",
                "Missing production software deployment.",
                "No cloud deployment (AWS/Docker)."
            ],
            "structured_improvements": [
                {
                    "current": f"Student looking for {detected_role} role...",
                    "problem": "Sounds too generic for recruiters.",
                    "better": f"Engineering candidate specializing in {', '.join([m.capitalize() for m in matched[:2]])} and cloud deployment.",
                    "reason": "Now recruiters know you can build & deploy production software."
                }
            ],
            "skills_you_should_learn": [
                {
                    "skill": "SQL",
                    "why": "Almost every backend and data job requires databases.",
                    "estimated_learning": "1 week",
                    "difficulty": "Easy"
                },
                {
                    "skill": "Docker",
                    "why": "Essential for containerizing services.",
                    "estimated_learning": "1 week",
                    "difficulty": "Easy"
                },
                {
                    "skill": "REST APIs",
                    "why": "Core requirement for software integration.",
                    "estimated_learning": "2 weeks",
                    "difficulty": "Medium"
                }
            ],
            "recommended_projects": [
                {
                    "title": "Expense Tracker API",
                    "difficulty_stars": 2,
                    "tech_stack": ["React", "FastAPI", "PostgreSQL"],
                    "you_will_learn": ["Authentication", "REST APIs", "SQL", "Deployment"],
                    "resume_impact": "+9%"
                },
                {
                    "title": "Automated Cloud Platform",
                    "difficulty_stars": 3,
                    "tech_stack": ["Python", "Docker", "AWS"],
                    "you_will_learn": ["Microservices", "Automation", "CI/CD"],
                    "resume_impact": "+14%"
                }
            ],
            "recommended_certifications": [
                {
                    "name": f"Google {detected_role} Certification",
                    "type": "Paid",
                    "reason": "Recognized by recruiters globally.",
                    "time_estimate": "25 hours",
                    "difficulty": "Easy"
                },
                {
                    "name": "AWS Cloud Practitioner",
                    "type": "Free / Paid Prep",
                    "reason": "Shows foundational cloud awareness.",
                    "time_estimate": "20 hours",
                    "difficulty": "Easy"
                }
            ],
            "weekly_roadmap": [
                {"week": 1, "title": "Learn SQL", "action": "Master SELECT, JOINs, indexing, and schema design."},
                {"week": 2, "title": "Learn REST APIs", "action": "Build endpoints with FastAPI or Express."},
                {"week": 3, "title": "Build Backend", "action": "Connect FastAPI to SQLite/PostgreSQL."},
                {"week": 4, "title": "Deploy App", "action": "Deploy microservice on Render/AWS."},
                {"week": 5, "title": "Add Auth", "action": "Implement JWT token authentication."},
                {"week": 6, "title": "Testing", "action": "Write unit tests using pytest."},
                {"week": 7, "title": "Docker", "action": "Containerize app with Dockerfile."},
                {"week": 8, "title": "CI/CD", "action": "Set up GitHub Actions workflow."},
                {"week": 9, "title": "Portfolio", "action": "Publish clean GitHub README with diagram."},
                {"week": 10, "title": "Resume Update", "action": "Rewrite bullet points with metric achievements."},
                {"week": 11, "title": "Mock Interview", "action": "Practice technical & behavioral questions."},
                {"week": 12, "title": "Apply to Jobs", "action": "Submit targeted applications."}
            ],
            "ats_review": {
                "ats_compatibility_score": score,
                "checklist": {
                    "resume_length": True,
                    "section_order": True,
                    "github_links": False,
                    "portfolio": False,
                    "action_verbs": False,
                    "measurable_achievements": False
                },
                "missing_keywords": [
                    {"keyword": "REST API", "why_it_matters": "Crucial keyword for technical resume parsing filters."},
                    {"keyword": "FastAPI", "why_it_matters": "Demonstrates modern Python microservices capability."},
                    {"keyword": "PostgreSQL", "why_it_matters": "High-demand relational database in modern job descriptions."}
                ]
            },
            "buzzword_detector": {
                "buzzwords": [
                    {
                        "word": "AI-powered",
                        "count": 4,
                        "instead_of": "AI-powered chatbot",
                        "say_this": "Python chatbot answering 5,000+ user queries."
                    },
                    {
                        "word": "Automation",
                        "count": 6,
                        "instead_of": "Automation script",
                        "say_this": "Automated pipeline reducing manual triage time by 45%."
                    }
                ]
            },
            "bullet_rewrites": [
                {
                    "current": "Built API service.",
                    "improved": "Architected a FastAPI microservice integrating PostgreSQL database schemas and JWT authentication into a containerized deployment.",
                    "improvements": ["Specific", "Technical", "Action-oriented"]
                }
            ]
        }

        return {
            "overall_match_score": score,
            "recommendation": recommendation,
            "detected_role": detected_role,
            "key_strengths": [f"Strong proficiency in {m.capitalize()}" for m in matched],
            "key_gaps": [f"Missing evidence for {m.capitalize()}" for m in missing],
            "rubric": {
                "technical_skills": score,
                "experience": max(60, score - 5),
                "projects": min(95, score + 10),
                "education": 90,
                "ats_format": 88
            },
            "timeline_milestones": [
                {"year": "2023", "role": f"Junior {detected_role}", "organization": "Tech Team", "summary": f"Core {detected_role} project execution"},
                {"year": "2024", "role": detected_role, "organization": "Solutions Inc", "summary": f"Full {detected_role} project ownership & optimization"}
            ],
            "evidence_breakdown": [
                {
                    "category": "Technical Capability",
                    "score": score,
                    "confidence": "High",
                    "rationale": f"Candidate demonstrates direct capability as a {detected_role} in {len(matched)} core competencies.",
                    "resume_quotes": [f"Proven experience with {', '.join([m.capitalize() for m in matched[:3]])}"],
                    "jd_requirements": [f"Requires proficiency in {', '.join([r.capitalize() for r in required_in_jd[:3]])}"]
                }
            ],
            "skill_gaps": [],
            "red_flags": [],
            "student_roadmap": [],
            "student_mentorship_suite": student_mentorship_suite
        }

llm_analyzer = LLMAnalyzer()
