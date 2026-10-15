import type { UserProfile } from "@/lib/types";

/** Fictional demo user. Not a real person. */
export function demoProfile(now = new Date().toISOString()): UserProfile {
  return {
    id: "demo-alex",
    name: "Alex Chen",
    university: "UCL",
    degree: "BSc Computer Science",
    degreeLevel: "bachelors",
    subjectArea: "Computer Science",
    academicInterests: "Machine learning, NLP",
    studyStatus: "student",
    currentStudyYear: 3,
    graduationDate: "2027-06-30",
    careerGoals: ["ai", "data", "software"],
    preferredRoles: ["Machine Learning Engineer", "Data Scientist", "Software Engineer"],
    preferredIndustries: ["AI", "Technology"],
    technicalSkills: ["Python", "Basic SQL", "Git", "Basic statistics"],
    professionalSkills: ["Teamwork", "Communication"],
    experience: {
      internships: "",
      partTime: "",
      projects: "University Python projects; GitHub portfolio with coursework and a small image-classifier",
      research: "",
      societyRoles: "Member of a technology society",
      volunteering: "",
      certifications: "",
      cvText: "",
    },
    locationPreferences: ["London"],
    willingToRelocate: false,
    companyTypes: ["Big tech", "Startups / scale-ups"],
    roleTypes: ["Graduate scheme", "Entry-level job", "Off-cycle internship"],
    minSalary: undefined,
    priorities: { salary: 3, growth: 5, workLife: 3, technical: 5, security: 4 },
    visa: {
      skipped: false,
      needsSponsorship: "yes",
      visaType: "student",
      expiryDate: undefined,
    },
    isDemo: true,
    createdAt: now,
    updatedAt: now,
  };
}
